import { get, post } from './client';

export async function fetchPendingPosts({ page = 1, limit = 10, type = 'images' } = {}) {
  return await get(`/api/posts/pending?page=${page}&limit=${limit}&type=${type}`, {
    cache: 'no-cache',
  });
}

export async function fetchFlairs(accountUsername) {
  if (!accountUsername) return [];
  return await get(`/api/flairs?account=${encodeURIComponent(accountUsername)}`, {
    cache: 'no-cache',
  });
}

export async function uploadPost(payload, signal) {
  return await post('/api/posts/upload', payload, { signal });
}

export async function uploadVideoPost(payload, signal) {
  return await post('/api/posts/upload_video', payload, { signal });
}
