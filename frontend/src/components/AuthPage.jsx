import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { motion, AnimatePresence } from 'framer-motion';

// Set base URL for API
const API_URL = 'http://localhost:3001/api';

// Configure axios defaults
axios.defaults.withCredentials = true; // Important for cookies

const AuthPage = () => {
  const [activeForm, setActiveForm] = useState('signup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [signupData, setSignupData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [signupSubmitted, setSignupSubmitted] = useState(false);
  const [loginSubmitted, setLoginSubmitted] = useState(false);
  
  const navigate = useNavigate();
  
  // Check authentication status on load
  useEffect(() => {
    // Try to get the user if there's a token in localStorage or in cookies
    const token = localStorage.getItem('token') || getCookie('token') || getCookie('jwt');
    
    if (token) {
      getMe(token);
    }
    
    // Optional: Redirect if already authenticated
    // if (isAuthenticated) {
    //   navigate('/dashboard');
    // }
  }, []);
  
  // Helper to get cookie by name
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  // Effect to handle form submission results
  useEffect(() => {
    if ((signupSubmitted || loginSubmitted) && !loading) {
      if (error) {
        toast.error(error);
      } else if (signupSubmitted) {
        toast.success(
          `Account created successfully! Email sent to ${signupData.email}\nPlease verify your email`,
          { autoClose: false }
        );
      } else if (loginSubmitted) {
        toast.success('Logged in successfully!');
        // Navigate if desired
        // navigate('/dashboard');
      }
      
      setSignupSubmitted(false);
      setLoginSubmitted(false);
    }
  }, [loading, error, signupSubmitted, loginSubmitted]);

  // Auth API functions
  const signup = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_URL}/auth/signup`, userData, {
        withCredentials: true, // Important for cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = response.data;
      
      // Store token in localStorage as backup
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      setIsAuthenticated(true);
      setLoading(false);
      return data;
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.post(`${API_URL}/auth/login`, credentials, {
        withCredentials: true, // Important for cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = response.data;
      
      // Store token in localStorage as backup
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      setIsAuthenticated(true);
      setLoading(false);
      navigate("/dashboard");
      return data;
    } catch (error) {
      setLoading(false);
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };
  
  const getMe = async (token) => {
    try {
      setLoading(true);
      
      const response = await axios.get(`${API_URL}/auth/me`, {
        withCredentials: true, // Important for cookies
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = response.data;
      setIsAuthenticated(true);
      setLoading(false);
      return data;
    } catch (error) {
      setLoading(false);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      return null;
    }
  };

  // Form validation and submission handlers remain the same
  const validateSignupForm = () => {
    const newErrors = {};
    
    if (!signupData.name.trim()) {
      newErrors.name = 'First name is required';
    }
    
    if (!signupData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(signupData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!signupData.password) {
      newErrors.password = 'Password is required';
    } else if (signupData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (signupData.password !== signupData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const validateLoginForm = () => {
    const newErrors = {};
    
    if (!loginData.email.trim()) {
      newErrors.loginEmail = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(loginData.email)) {
      newErrors.loginEmail = 'Email is invalid';
    }
    
    if (!loginData.password) {
      newErrors.loginPassword = 'Password is required';
    }
    
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupChange = (e) => {
    const { name, value } = e.target;
    setSignupData({ ...signupData, [name]: value });
  };
  
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData({ ...loginData, [name]: value });
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    
    if (validateSignupForm()) {
      try {
        const { confirmPassword, ...userData } = signupData;
        await signup(userData);
        setSignupSubmitted(true);
      } catch (err) {
        setSignupSubmitted(true);
      }
    }
  };
  
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    
    if (validateLoginForm()) {
      try {
        await login(loginData);
        setLoginSubmitted(true);
      } catch (err) {
        setLoginSubmitted(true);
      }
    }
  };
  
  const toggleForm = (form) => {
    setError(null);
    setFormErrors({});
    setSignupSubmitted(false);
    setLoginSubmitted(false);
    setActiveForm(form);
  };

  // Animation variants
  const formVariants = {
    enter: (direction) => ({
      x: direction === 'right' ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    },
    exit: (direction) => ({
      x: direction === 'right' ? -300 : 300,
      opacity: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    })
  };

  // Rest of component remains the same (form rendering)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 overflow-hidden">
      <ToastContainer position="top-right" autoClose={5000} />
      
      <div className="relative w-full max-w-sm mx-auto">
        <div className="absolute top-0 left-0 right-0 flex justify-center -mt-12 sm:-mt-16">
          <div className="bg-white rounded-full p-2 shadow-md">
            <img src="/logo.svg" alt="Logo" className="h-10 w-10 sm:h-12 sm:w-12" />
          </div>
        </div>
        
        <AnimatePresence mode="wait" initial={false} custom={activeForm === 'login' ? 'right' : 'left'}>
          {activeForm === 'signup' ? (
            <motion.div
              key="signup"
              custom="right"
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="bg-white p-6 pt-10 rounded-lg shadow-md w-full"
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-gray-800">Create Account</h2>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded text-sm">
                  <p>{error}</p>
                </div>
              )}
              
              <form onSubmit={handleSignupSubmit} className="text-sm">
                <div className="mb-3">
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="name">
                  Name
                  </label>
                  <input
                    className={`w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                    type="text"
                    id="name"
                    name="name"
                    value={signupData.name}
                    onChange={handleSignupChange}
                    placeholder="John"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                </div>
                
                <div className="mb-3">
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="email">
                    Email
                  </label>
                  <input
                    className={`w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${formErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                    type="email"
                    id="email"
                    name="email"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    placeholder="john.doe@example.com"
                  />
                  {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                </div>
                
                <div className="mb-3">
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="password">
                    Password
                  </label>
                  <input
                    className={`w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${formErrors.password ? 'border-red-500' : 'border-gray-300'}`}
                    type="password"
                    id="password"
                    name="password"
                    value={signupData.password}
                    onChange={handleSignupChange}
                    placeholder="••••••••"
                  />
                  {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <input
                    className={`w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${formErrors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={signupData.confirmPassword}
                    onChange={handleSignupChange}
                    placeholder="••••••••"
                  />
                  {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
                </div>
                
                <motion.button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition duration-200 shadow-md text-sm"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : (
                    'Sign Up'
                  )}
                </motion.button>
                
                <div className="mt-4 text-center">
                  <p className="text-gray-600 text-sm">
                    Already have an account?{' '}
                    <motion.button
                      type="button"
                      className="text-blue-600 font-medium hover:underline focus:outline-none"
                      onClick={() => toggleForm('login')}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Log In
                    </motion.button>
                  </p>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="login"
              custom="left"
              variants={formVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="bg-white p-6 pt-10 rounded-lg shadow-md w-full"
            >
              <h2 className="text-xl sm:text-2xl font-bold mb-4 text-center text-gray-800">Welcome Back</h2>
              
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded text-sm">
                  <p>{error}</p>
                </div>
              )}
              
              <form onSubmit={handleLoginSubmit} className="text-sm">
                <div className="mb-3">
                  <label className="block text-gray-700 font-medium mb-1" htmlFor="loginEmail">
                    Email
                  </label>
                  <input
                    className={`w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${formErrors.loginEmail ? 'border-red-500' : 'border-gray-300'}`}
                    type="email"
                    id="loginEmail"
                    name="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    placeholder="john.doe@example.com"
                  />
                  {formErrors.loginEmail && <p className="text-red-500 text-xs mt-1">{formErrors.loginEmail}</p>}
                </div>
                
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-gray-700 font-medium" htmlFor="loginPassword">
                      Password
                    </label>
                    <a href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                      Forgot Password?
                    </a>
                  </div>
                  <input
                    className={`w-full p-2 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 transition ${formErrors.loginPassword ? 'border-red-500' : 'border-gray-300'}`}
                    type="password"
                    id="loginPassword"
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    placeholder="••••••••"
                  />
                  {formErrors.loginPassword && <p className="text-red-500 text-xs mt-1">{formErrors.loginPassword}</p>}
                </div>
                
                <motion.button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition duration-200 shadow-md text-sm"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging In...
                    </span>
                  ) : (
                    'Log In'
                  )}
                </motion.button>
                
                <div className="mt-4 text-center">
                  <p className="text-gray-600 text-sm">
                    Don't have an account?{' '}
                    <motion.button
                      type="button"
                      className="text-blue-600 font-medium hover:underline focus:outline-none"
                      onClick={() => toggleForm('signup')}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Sign Up
                    </motion.button>
                  </p>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuthPage;