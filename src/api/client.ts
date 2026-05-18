import axios from 'axios';

// Gunakan URL GAS dari env, atau fallback mock
export const GAS_API_URL = import.meta.env.VITE_GAS_API_URL || 'https://mock-api.local';

export const apiClient = axios.create({
  baseURL: GAS_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor untuk logging & error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handling error custom dari GAS
    if (error.response?.data?.error) {
      console.error('API Error:', error.response.data.error);
    }
    return Promise.reject(error);
  }
);
