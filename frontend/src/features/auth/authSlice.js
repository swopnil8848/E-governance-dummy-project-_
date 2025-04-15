import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: cookieStore.get("token")?.value || null,
  loading: false,
  error: null,
  isAuthenticated: !!localStorage.getItem('token')
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    
    authSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      localStorage.setItem('token', action.payload.token);
    },
    
    authFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    resetLoading: (state) => {
      state.loading = false;
    },
    
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    },
    
    clearErrors: (state) => {
      state.error = null;
    }
  }
});

export const { authStart, authSuccess, authFailure, logout, clearErrors,resetLoading } = authSlice.actions;
export default authSlice.reducer;