import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('Verifying your email...');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyEmail = async () => {
      try {

        const res = await axios.get(
          `http://localhost:3001/api/auth/verify-email/${token}`,
          {
            withCredentials: true
          }
        );

        localStorage.setItem('token',res.data.token);

        if (res.status === 200) {
          setIsSuccess(true);
          setMessage('✅ Email verified successfully! Redirecting to dashboard...');
          setTimeout(() => navigate('/dashboard'), 10000);
        }
      } catch (err) {
        setIsSuccess(false);
        setMessage(err.response?.data?.message || '❌ Email verification failed');
        setTimeout(() => navigate('/login'), 100000);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center">
        {loading ? (
          <>
            <div className="text-blue-500 animate-pulse text-2xl font-semibold mb-4">Verifying your email...</div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-2 bg-blue-500 animate-loading w-full"></div>
            </div>
          </>
        ) : (
          <>
            <h2 className={`text-2xl font-bold mb-2 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
              {isSuccess ? '🎉 Verification Successful!' : '⚠️ Verification Failed'}
            </h2>
            <p className="text-gray-700">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
