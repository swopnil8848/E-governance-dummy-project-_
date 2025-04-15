import { authStart, authSuccess, authFailure } from './authSlice';
import { authAPI } from './authApi';

// Thunk for user registration
export const signup = (userData) => async (dispatch) => {
  try {
    dispatch(authStart());
    console.log("signup being called")
    const data = await authAPI.signup(userData);
    dispatch(authSuccess(data));
    return data;
  } catch (error) {
    const errorMessage = error?.message || 'Registration failed';
    console.log("error message:: ",errorMessage)
    dispatch(authFailure(errorMessage));
    // We're returning the error to allow proper promise handling
    return Promise.reject({ message: errorMessage });
  }
};

// Thunk for user login
export const login = (credentials) => async (dispatch) => {
  try {
    dispatch(authStart());
    const data = await authAPI.login(credentials);
    dispatch(authSuccess(data));
    return data;
  } catch (error) {
    const errorMessage = error?.message || 'Login failed';
    dispatch(authFailure(errorMessage));
    // We're returning the error to allow proper promise handling
    return Promise.reject({ message: errorMessage });
  }
};

// Thunk for getting current user data
export const getMe = () => async (dispatch, getState) => {
  try {
    console.log(":thunk is being called::")
    const { token } = getState().auth || {};
    
    // If no token exists, don't make the request
    if (!token) return null;
    
    dispatch(authStart());
    const data = await authAPI.getMe(token);
    dispatch(authSuccess({ user: data.user, token }));
    return data;
  } catch (error) {
    const errorMessage = error?.message || 'Authentication failed';
    dispatch(authFailure(errorMessage));
    // We're returning the error to allow proper promise handling
    return Promise.reject({ message: errorMessage });
  }
};