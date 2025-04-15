// API service for authentication-related requests
import axios from 'axios';

const API_URL = 'http://localhost:3000/api'; // Change this to your actual API URL

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authAPI = {
  // Register a new user
  signup: async (userData) => {
    try {
      console.log("signup api is being called")
      const response = await axios.post('http://localhost:3000/api/auth/signup', userData);
      console.log("response:: ", response);
      return response.data;
    } catch (error) {
      console.error("Error in signup:", error);
      throw error.response?.data?.message || error.message || 'Failed to sign up';
    }
  },
  
  // Login existing user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials,{withCredentials:true});
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || error.message || 'Login failed';
    }
  },
  
  // Get current user's profile
  getMe: async (token) => {
    try {
      const response = await api.get('/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("response:: ", response);
      return response.data;
    } catch (error) {
      console.log("error:: ", error);
      throw error.response?.data?.message || error.message || 'Failed to get user data';
    }
  }
};