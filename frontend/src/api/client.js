export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

/**
 * Standard HTTP fetch wrapper with uniform error handling
 */
export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
  
  const headers = {
    ...(options.isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  delete config.isFormData;

  try {
    const response = await fetch(url, config);
    
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, error);
    throw error;
  }
}

export const get = (endpoint, options) => request(endpoint, { ...options, method: 'GET' });
export const post = (endpoint, body, options) =>
  request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
export const postFormData = (endpoint, formData, options) =>
  request(endpoint, { ...options, method: 'POST', body: formData, isFormData: true });
