// StripePaymentVerification.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const StripePaymentVerification = () => {
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Parse query params
        const queryParams = new URLSearchParams(location.search);
        const sessionId = queryParams.get('session_id');
        const purchaseOrderId = queryParams.get('purchase_order_id');

        if (!sessionId || !purchaseOrderId) {
          setStatus('error');
          setMessage('Missing required payment parameters');
          return;
        }

        // Get token from localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          setStatus('error');
          setMessage('Authentication required. Please log in.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Verify the payment with the backend
        const response = await axios.get(
          `/api/payment/stripe/verify?session_id=${sessionId}&purchase_order_id=${purchaseOrderId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data.success) {
          setStatus('success');
          setMessage('Payment successful! Redirecting to dashboard...');
          // Redirect to dashboard after 2 seconds
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        setStatus('error');
        setMessage(
          error.response?.data?.message || 'An error occurred while verifying your payment'
        );
      }
    };

    verifyPayment();
  }, [location.search, navigate]);

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      {status === 'verifying' && (
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
          <p className="text-gray-600">{message}</p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <div className="mx-auto mb-4 text-green-500">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-green-600">Payment Successful!</h2>
          <p className="text-gray-600">{message}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="mx-auto mb-4 text-red-500">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-red-600">Payment Verification Failed</h2>
          <p className="text-gray-600">{message}</p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};

export default StripePaymentVerification;