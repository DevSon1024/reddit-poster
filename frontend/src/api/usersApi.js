import { get, post } from './client';

export async function fetchUsers() {
  return await get('/api/users');
}

export async function addUser({ name, username }) {
  return await post('/api/users/add', { name, username });
}
