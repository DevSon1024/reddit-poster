const fs = require("fs");
const path = require("path");
const {
  IMAGES_DIR,
  VIDEOS_DIR,
  UPLOADED_IMAGES_DIR,
  UPLOADED_VIDEOS_DIR,
} = require("../config/constants");
const userService = require("../services/userService");
const redditService = require("../services/redditService");

async function getPendingPosts(req, res) {
  const postType = req.query.type || "images";
  let filesDir;
  let fileExtensions;

  if (postType === "images") {
    filesDir = IMAGES_DIR;
    fileExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  } else if (postType === "videos") {
    filesDir = VIDEOS_DIR;
    fileExtensions = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
  } else {
    return res.status(400).json({ message: "Invalid post type specified." });
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  try {
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }

    const sortedUsers = userService.getSortedUsers();
    const postsByUser = {};

    const allFiles = fs.readdirSync(filesDir).sort();

    for (const fileName of allFiles) {
      const ext = path.extname(fileName).toLowerCase();
      if (!fileExtensions.includes(ext)) {
        continue;
      }

      // Skip subdirectories if any
      const fullPath = path.join(filesDir, fileName);
      try {
        if (fs.statSync(fullPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }

      // Match media filename directly against registered users in users.csv
      const matchedUser = userService.matchUserForFilename(fileName, sortedUsers);
      if (!matchedUser) {
        // Not a registered user in users.csv; skip to prevent displaying wrongly named files
        continue;
      }

      const canonicalUsername = matchedUser.canonicalUsername;
      const displayName = matchedUser.name;

      if (!postsByUser[canonicalUsername]) {
        postsByUser[canonicalUsername] = {
          username: canonicalUsername,
          name: displayName,
          titlePreview: `"${displayName}"`,
          files: [],
          fileCount: 0,
        };
      }
      postsByUser[canonicalUsername].files.push(fileName);
      postsByUser[canonicalUsername].fileCount += 1;
    }

    const pendingPosts = Object.values(postsByUser);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPosts = pendingPosts.slice(startIndex, endIndex);
    const hasMore = pendingPosts.length > endIndex;

    return res.json({ posts: paginatedPosts, hasMore });
  } catch (err) {
    console.error("Error fetching pending posts:", err);
    return res
      .status(500)
      .json({ message: `Failed to fetch pending posts: ${err.message}` });
  }
}

async function getFlairs(req, res) {
  const accountUsername = req.query.account;
  if (!accountUsername) {
    return res.status(400).json({ message: "Account username is required." });
  }

  try {
    const flairs = await redditService.getFlairs(accountUsername);
    return res.json(flairs);
  } catch (err) {
    console.error("Error fetching flairs:", err);
    return res
      .status(500)
      .json({ message: `Failed to fetch flairs from Reddit: ${err.message}` });
  }
}

async function uploadPost(req, res) {
  const {
    accountUsername,
    username,
    caption,
    flairId,
    imagesToUpload,
    isNsfw = false,
  } = req.body || {};

  if (
    !accountUsername ||
    !username ||
    !flairId ||
    !imagesToUpload ||
    !imagesToUpload.length
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const account = redditService.getAccount(accountUsername);
    const token = await redditService.getAccessToken(account);

    const validImages = [];
    for (const img of imagesToUpload) {
      const fullPath = path.join(IMAGES_DIR, img);
      if (fs.existsSync(fullPath)) {
        validImages.push(img);
      } else {
        console.warn(`!! Skipping non-existent file: ${img}`);
      }
    }

    if (!validImages.length) {
      return res
        .status(400)
        .json({ message: "Upload failed: No valid images found on server." });
    }

    const matchedUser = userService.findUserByUsername(username);
    const name = matchedUser ? matchedUser.Name : (userService.getUserMap()[username] || username);
    let title = `"${name}"`;
    if (caption) {
      const stripped = caption.replace(/<[^>]+>/g, "").trim();
      if (stripped) {
        title += ` - ${stripped}`;
      }
    }

    let submissionResult;

    if (validImages.length === 1) {
      const imgPath = path.join(IMAGES_DIR, validImages[0]);
      console.log(
        `>> Uploading single image for ${username} with title: ${title}`,
      );
      const { mediaUrl } = await redditService.uploadMediaAsset(
        account,
        token,
        imgPath,
      );
      submissionResult = await redditService.submitSingleImage({
        account,
        token,
        title,
        mediaUrl,
        flairId,
        isNsfw,
      });
    } else {
      console.log(
        `>> Uploading gallery of ${validImages.length} images for ${username} with title: ${title}`,
      );
      const assetIds = [];
      for (const img of validImages) {
        const imgPath = path.join(IMAGES_DIR, img);
        const { assetId } = await redditService.uploadMediaAsset(
          account,
          token,
          imgPath,
        );
        assetIds.push(assetId);
      }
      submissionResult = await redditService.submitGallery({
        account,
        token,
        title,
        assetIds,
        flairId,
        isNsfw,
      });
    }

    // Move uploaded images
    if (!fs.existsSync(UPLOADED_IMAGES_DIR)) {
      fs.mkdirSync(UPLOADED_IMAGES_DIR, { recursive: true });
    }

    for (const img of validImages) {
      const src = path.join(IMAGES_DIR, img);
      const dest = path.join(UPLOADED_IMAGES_DIR, img);
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
      }
    }

    console.log(`>> Moved ${validImages.length} files to Uploaded directory.`);

    return res.json({
      success: true,
      message: "Upload successful!",
      url: submissionResult.url,
    });
  } catch (err) {
    console.error("Error during upload:", err);
    return res.status(500).json({ message: `Upload failed: ${err.message}` });
  }
}

async function uploadVideoPost(req, res) {
  const {
    accountUsername,
    username,
    caption,
    flairId,
    videoToUpload,
    isNsfw = false,
  } = req.body || {};

  if (!accountUsername || !username || !flairId || !videoToUpload) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const videoPath = path.join(VIDEOS_DIR, videoToUpload);
  if (!fs.existsSync(videoPath)) {
    return res
      .status(400)
      .json({ message: "Upload failed: Video not found on server." });
  }

  try {
    const account = redditService.getAccount(accountUsername);
    const token = await redditService.getAccessToken(account);

    const matchedUser = userService.findUserByUsername(username);
    const name = matchedUser ? matchedUser.Name : (userService.getUserMap()[username] || username);
    let title = `"${name}"`;
    if (caption) {
      const stripped = caption.replace(/<[^>]+>/g, "").trim();
      if (stripped) {
        title += ` - ${stripped}`;
      }
    }

    console.log(`>> Uploading video for ${username} with title: ${title}`);
    const { mediaUrl } = await redditService.uploadMediaAsset(
      account,
      token,
      videoPath,
    );

    const submissionResult = await redditService.submitVideo({
      account,
      token,
      title,
      videoUrl: mediaUrl,
      posterUrl: mediaUrl,
      flairId,
      isNsfw,
    });

    if (!fs.existsSync(UPLOADED_VIDEOS_DIR)) {
      fs.mkdirSync(UPLOADED_VIDEOS_DIR, { recursive: true });
    }

    const dest = path.join(UPLOADED_VIDEOS_DIR, videoToUpload);
    if (fs.existsSync(videoPath)) {
      fs.renameSync(videoPath, dest);
    }
    console.log(`>> Moved ${videoToUpload} to Uploaded directory.`);

    return res.json({
      success: true,
      message: "Upload successful!",
      url: submissionResult.url,
    });
  } catch (err) {
    console.error("Error during video upload:", err);
    return res.status(500).json({ message: `Upload failed: ${err.message}` });
  }
}

module.exports = {
  getPendingPosts,
  getFlairs,
  uploadPost,
  uploadVideoPost,
};
