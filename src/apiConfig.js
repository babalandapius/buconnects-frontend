
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buconnects-backend-production.up.railway.app'
  : 'https://buconnects-backend-production.up.railway.app'; // Set to Railway URL for testing

export default API_BASE_URL;