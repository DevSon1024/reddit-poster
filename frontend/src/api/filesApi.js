import { post, postFormData } from './client';

export async function deleteFile({ filename, type }) {
  const normalizedType = type === 'videos' || type === 'video' ? 'videos' : 'images';
  return await post('/api/files/delete', { filename, type: normalizedType });
}

export async function uploadDirectFiles(formData) {
  return await postFormData('/api/upload', formData);
}
