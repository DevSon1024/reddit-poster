import { get } from './client';

export async function fetchAccounts() {
  return await get('/api/accounts');
}
