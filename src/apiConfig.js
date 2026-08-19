// API Configuration - Supports both offline and online modes

// Check if we're in production or development
const isProduction = import.meta.env.MODE === 'production';

// Get API URL based on environment
// Priority: environment variable > default production URL > development URL
const API_BASE_URL = (() => {
  // Try to get from Vite environment variables
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Production defaults
  if (isProduction) {
    return 'https://buconnects-backend-production.up.railway.app';
  }
  
  // Development default
  return 'http://localhost:5000';
})();

// Validate API URL is properly set
if (!API_BASE_URL) {
  console.error('❌ API_BASE_URL is not configured. Check your .env file.');
}

// Log API configuration in development
if (!isProduction) {
  console.log('📡 API Configuration:');
  console.log(`   Mode: ${import.meta.env.MODE}`);
  console.log(`   Base URL: ${API_BASE_URL}`);
}

export default API_BASE_URL;

// Export for reference in other places
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  isProduction,
  isDevelopment: !isProduction,
  timeout: 30000, // 30 second timeout for API calls
  
  endpoints: {
    auth: {
      login: '/api/login',
      register: '/api/register',
      logout: '/api/logout',
      verifyOtp: '/api/verify-otp',
      sendOtp: '/api/send-otp'
    },
    user: {
      profile: '/api/user',
      settings: '/api/settings',
      profilePic: '/api/user/profile-pic'
    },
    posts: '/api/posts',
    comments: '/api/posts/comment',
    likes: '/api/posts/like',
    market: '/api/market',
    hostels: '/api/hostels',
    announcements: '/api/announcements',
    chats: {
      conversations: '/api/chats/conversations',
      messages: '/api/chats/messages',
      send: '/api/chats/send',
      uploadAudio: '/api/chats/upload-audio'
    },
    events: '/api/events',
    notifications: '/api/notifications',
    health: '/api/health'
  }
};