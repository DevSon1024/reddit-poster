const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { ACCOUNTS_FILE } = require('../config/constants');
const { getMimeType } = require('../utils/fileHelper');

// Cache tokens in memory: { [username]: { accessToken, expiresAt } }
const tokenCache = {};

function getAccount(accountUsername) {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    throw new Error(`accounts.json not found.`);
  }

  const fileData = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
  const accounts = JSON.parse(fileData);
  const account = accounts.find(acc => acc.username === accountUsername);

  if (!account) {
    throw new Error(`Account '${accountUsername}' not found in accounts.json`);
  }

  return account;
}

function getAllAccounts() {
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    throw new Error(`accounts.json not found.`);
  }
  const fileData = fs.readFileSync(ACCOUNTS_FILE, 'utf-8');
  return JSON.parse(fileData);
}

async function getAccessToken(account) {
  const cached = tokenCache[account.username];
  const now = Date.now();

  // If token is cached and has at least 60 seconds remaining, use it
  if (cached && cached.expiresAt > now + 60 * 1000) {
    return cached.accessToken;
  }

  const basicAuth = Buffer.from(`${account.client_id}:${account.client_secret}`).toString('base64');
  const params = new URLSearchParams({
    grant_type: 'password',
    username: account.username,
    password: account.password,
  });

  const response = await axios.post(
    'https://www.reddit.com/api/v1/access_token',
    params.toString(),
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': account.user_agent,
      },
    }
  );

  const data = response.data;
  if (!data.access_token) {
    throw new Error(`Failed to retrieve Reddit access token: ${JSON.stringify(data)}`);
  }

  tokenCache[account.username] = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000,
  };

  return data.access_token;
}

async function getFlairs(accountUsername) {
  const account = getAccount(accountUsername);
  const token = await getAccessToken(account);

  const response = await axios.get(
    `https://oauth.reddit.com/r/${account.subreddit}/api/link_flair_v2`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': account.user_agent,
      },
    }
  );

  return (response.data || []).map(flair => ({
    id: flair.id,
    text: flair.text,
  }));
}

async function uploadMediaAsset(account, token, filePath) {
  const filename = path.basename(filePath);
  const mimeType = getMimeType(filePath);

  // 1. Request lease from Reddit
  const leaseParams = new URLSearchParams({
    filepath: filename,
    mimetype: mimeType,
  });

  const leaseRes = await axios.post(
    'https://oauth.reddit.com/api/media/asset.json',
    leaseParams.toString(),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': account.user_agent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const leaseData = leaseRes.data;
  if (!leaseData || !leaseData.args) {
    throw new Error(`Invalid lease response from Reddit: ${JSON.stringify(leaseData)}`);
  }

  let uploadUrl = leaseData.args.action;
  if (uploadUrl.startsWith('//')) {
    uploadUrl = 'https:' + uploadUrl;
  }

  const fields = leaseData.args.fields || [];
  const form = new FormData();

  for (const field of fields) {
    form.append(field.name, field.value);
  }

  form.append('file', fs.createReadStream(filePath));

  // 2. Upload file to S3
  await axios.post(uploadUrl, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  const keyField = fields.find(f => f.name === 'key');
  const mediaUrl = `${uploadUrl}/${keyField ? keyField.value : ''}`;
  const assetId = leaseData.asset ? leaseData.asset.asset_id : null;
  const websocketUrl = leaseData.asset ? leaseData.asset.websocket_url : null;

  return {
    mediaUrl,
    assetId,
    websocketUrl,
  };
}

async function selectFlair(account, token, fullname, flairId) {
  if (!flairId) return;
  try {
    const params = new URLSearchParams({
      api_type: 'json',
      link: fullname,
      flair_template_id: flairId,
      sr: account.subreddit,
    });
    await axios.post('https://oauth.reddit.com/api/selectflair', params.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': account.user_agent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  } catch (err) {
    console.warn(`Could not select flair: ${err.message}`);
  }
}

async function markNsfw(account, token, fullname) {
  try {
    const params = new URLSearchParams({ id: fullname });
    await axios.post('https://oauth.reddit.com/api/marknsfw', params.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': account.user_agent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  } catch (err) {
    console.warn(`Could not mark NSFW: ${err.message}`);
  }
}

async function submitSingleImage({ account, token, title, mediaUrl, flairId, isNsfw }) {
  const params = new URLSearchParams({
    api_type: 'json',
    sr: account.subreddit,
    kind: 'image',
    title,
    url: mediaUrl,
    resubmit: 'true',
    sendreplies: 'true',
    nsfw: isNsfw ? 'true' : 'false',
  });

  if (flairId) {
    params.append('flair_id', flairId);
  }

  const response = await axios.post(
    'https://oauth.reddit.com/api/submit',
    params.toString(),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': account.user_agent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const resJson = response.data && response.data.json;
  if (!resJson) {
    throw new Error(`Invalid submit response from Reddit: ${JSON.stringify(response.data)}`);
  }

  if (resJson.errors && resJson.errors.length > 0) {
    throw new Error(`Reddit API error: ${JSON.stringify(resJson.errors)}`);
  }

  const postData = resJson.data || {};
  const postUrl = postData.url || (postData.permalink ? `https://www.reddit.com${postData.permalink}` : '');

  if (postData.name) {
    if (flairId) await selectFlair(account, token, postData.name, flairId);
    if (isNsfw) await markNsfw(account, token, postData.name);
  }

  return { url: postUrl };
}

async function submitGallery({ account, token, title, assetIds, flairId, isNsfw }) {
  const payload = {
    api_type: 'json',
    sr: account.subreddit,
    title,
    nsfw: Boolean(isNsfw),
    sendreplies: true,
    show_error_list: true,
    items: assetIds.map(assetId => ({
      media_id: assetId,
      caption: '',
    })),
  };

  if (flairId) {
    payload.flair_id = flairId;
  }

  const response = await axios.post(
    'https://oauth.reddit.com/api/submit_gallery_post.json',
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': account.user_agent,
        'Content-Type': 'application/json',
      },
    }
  );

  const resJson = response.data && response.data.json;
  if (!resJson) {
    throw new Error(`Invalid gallery submit response: ${JSON.stringify(response.data)}`);
  }

  if (resJson.errors && resJson.errors.length > 0) {
    throw new Error(`Reddit API error: ${JSON.stringify(resJson.errors)}`);
  }

  const postData = resJson.data || {};
  const postUrl = postData.url || (postData.permalink ? `https://www.reddit.com${postData.permalink}` : '');

  if (postData.name) {
    if (flairId) await selectFlair(account, token, postData.name, flairId);
    if (isNsfw) await markNsfw(account, token, postData.name);
  }

  return { url: postUrl };
}

async function submitVideo({ account, token, title, videoUrl, posterUrl, flairId, isNsfw }) {
  const params = new URLSearchParams({
    api_type: 'json',
    sr: account.subreddit,
    kind: 'video',
    title,
    url: videoUrl,
    video_poster_url: posterUrl || videoUrl,
    resubmit: 'true',
    sendreplies: 'true',
    nsfw: isNsfw ? 'true' : 'false',
  });

  if (flairId) {
    params.append('flair_id', flairId);
  }

  const response = await axios.post(
    'https://oauth.reddit.com/api/submit',
    params.toString(),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': account.user_agent,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const resJson = response.data && response.data.json;
  if (!resJson) {
    throw new Error(`Invalid video submit response: ${JSON.stringify(response.data)}`);
  }

  if (resJson.errors && resJson.errors.length > 0) {
    throw new Error(`Reddit API error: ${JSON.stringify(resJson.errors)}`);
  }

  const postData = resJson.data || {};
  const postUrl = postData.url || (postData.permalink ? `https://www.reddit.com${postData.permalink}` : '');

  if (postData.name) {
    if (flairId) await selectFlair(account, token, postData.name, flairId);
    if (isNsfw) await markNsfw(account, token, postData.name);
  }

  return { url: postUrl };
}

module.exports = {
  getAccount,
  getAllAccounts,
  getAccessToken,
  getFlairs,
  uploadMediaAsset,
  submitSingleImage,
  submitGallery,
  submitVideo,
};
