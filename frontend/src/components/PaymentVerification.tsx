// PaymentVerification.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const PaymentVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // 'processing', 'success', 'failed'
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get query parameters from URL
        const params = new URLSearchParams(location.search);
        const pidx = params.get('pidx');
        const purchase_order_id = params.get('purchase_order_id');
        
        if (!pidx || !purchase_order_id) {
          setStatus('failed');
          setMessage('Missing payment information in the URL');
          return;
        }
        
        // Call backend to verify payment
        const response = await axios.post('/api/payment/verify', {
          pidx,
          purchase_order_id
        });
        
        if (response.data.success) {
          setStatus('success');
          setMessage('Your payment has been successfully processed!');
        } else {
          setStatus('failed');
          setMessage(response.data.message || 'Payment verification failed');
        }
      } catch (err) {
        setStatus('failed');
        setMessage(err.response?.data?.message || 'An error occurred during payment verification');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [location]);

  const handleReturn = () => {
    if (status === 'success') {
      navigate('/dashboard/registrations'); // Redirect to registrations list
    } else {
      navigate(-1); // Go back if failed
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-t-purple-600 border-gray-200 rounded-full animate-spin"></div>
        <p className="mt-4 text-lg">Verifying your payment...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-8 bg-white shadow-md rounded-lg text-center">
      {status === 'success' ? (
        <>
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mt-6 text-green-600">Payment Successful!</h2>
        </>
      ) : (
        <>
          <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mt-6 text-red-600">Payment Failed</h2>
        </>
      )}
      
      <p className="my-4 text-gray-700">{message}</p>
      
      <button
        onClick={handleReturn}
        className={`px-6 py-2 rounded-md font-medium ${
          status === 'success' 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {status === 'success' ? 'Go to My Registrations' : 'Try Again'}
      </button>
    </div>
  );
};

export default PaymentVerification;