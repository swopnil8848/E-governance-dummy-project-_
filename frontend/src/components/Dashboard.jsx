import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billsLoading, setBillsLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const navigate = useNavigate();

  // Fixed registration fee
  const registrationFee = 500;

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3001/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          withCredentials: true,
        });

        setUser(res.data.data);
      } catch (err) {
        setUser(null);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3001/api/registrations/my', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setRegistrations(res.data.data);
      } catch (err) {
        console.error('Error fetching registrations:', err);
      }
    };

    const fetchBills = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3001/api/bills', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setBills(res.data.data);
      } catch (err) {
        console.error('Error fetching bills:', err);
      } finally {
        setBillsLoading(false);
      }
    };

    if (user) {
      fetchRegistrations();
      fetchBills();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.get('http://localhost:3001/api/auth/logout', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
      });

      localStorage.removeItem('token');
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const initiateKhaltiPayment = async (registrationId) => {
    try {
      setPaymentLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`http://localhost:3001/api/payment/registrations/${registrationId}`, {
        paymentMethod: 'khalti',
        amount: registrationFee,
        website_url: window.location.origin,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success && response.data.data.payment.payment_url) {
        window.location.href = response.data.data.payment.payment_url;
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
    } catch (err) {
      console.error('Payment initialization error:', err);
      setError(err.response?.data?.message || 'Payment initialization failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const initiateStripePayment = async (registrationId) => {
    try {
      setPaymentLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`http://localhost:3001/api/payment/stripe/registrations/${registrationId}`, {
        paymentMethod: 'stripe',
        amount: registrationFee,
        website_url: window.location.origin,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success && response.data.data.payment.url) {
        window.location.href = response.data.data.payment.url;
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
    } catch (err) {
      console.error('Payment initialization error:', err);
      setError(err.response?.data?.message || 'Payment initialization failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // New functions for bill payments
  const openPaymentModal = (bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedBill(null);
  };

  const initiateBillPaymentStripe = async (billId) => {
    try {
      setPaymentLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`http://localhost:3001/api/payment/stripe/bills/${billId}`, {
        paymentMethod: 'stripe',
        amount: selectedBill.amount,
        website_url: window.location.origin,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success && response.data.data.payment.url) {
        window.location.href = response.data.data.payment.url;
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
    } catch (err) {
      console.error('Bill payment initialization error:', err);
      setError(err.response?.data?.message || 'Payment initialization failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const initiateBillPaymentEsewa = async (billId) => {
    try {
      setPaymentLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      const response = await axios.post(`http://localhost:3001/api/payment/bills/${billId}`, {
        paymentMethod: 'esewa',
        amount: selectedBill.amount,
        website_url: window.location.origin,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success && response.data.data.payment.payment_url) {
        window.location.href = response.data.data.payment.payment_url;
      } else {
        setError('Failed to initialize payment. Please try again.');
      }
    } catch (err) {
      console.error('Bill payment initialization error:', err);
      setError(err.response?.data?.message || 'Payment initialization failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Checking authentication...</div>;
  }

  return (
    <div>
      <nav className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex gap-4">
          <Link to="/" className="hover:underline">Home</Link>
          <Link to="/dashboard" className="hover:underline">Dashboard</Link>
          <Link to="/registrations/new" className="hover:underline">New Registration</Link>
        </div>

        <div>
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Welcome, {user.name}</span>
              <button 
                onClick={handleLogout} 
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded-md text-sm"
            >
              Login / Signup
            </Link>
          )}
        </div>
      </nav>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 m-6 rounded">
          {error}
        </div>
      )}

      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">My Registrations</h2>
        {registrations.length === 0 ? (
          <p>No registrations found.</p>
        ) : (
          <div className="space-y-4">
            {registrations.map((reg) => (
              <div key={reg._id} className="bg-white shadow p-4 rounded-lg border">
                <p><strong>Service Type:</strong> {reg.serviceType}</p>
                <p><strong>Status:</strong> 
                  <span className={`ml-2 font-medium ${reg.status === 'pending' ? 'text-yellow-500' : 'text-green-600'}`}>
                    {reg.status}
                  </span>
                </p>
                <p><strong>Address:</strong> {reg.address}</p>
                <p><strong>Submitted At:</strong> {new Date(reg.submittedAt).toLocaleString()}</p>
                <p><strong>Registration Fee:</strong> NPR {registrationFee}</p>

                {reg.status === 'approved' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => initiateKhaltiPayment(reg._id)}
                      className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-purple-300"
                      disabled={paymentLoading}
                    >
                      {paymentLoading ? 'Initializing...' : 'Pay with Khalti'}
                    </button>
                    <button
                      onClick={() => initiateStripePayment(reg._id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
                      disabled={paymentLoading}
                    >
                      {paymentLoading ? 'Initializing...' : 'Pay with Stripe'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">My Bills</h1>
        {billsLoading ? (
          <div className="text-center py-4">Loading bills...</div>
        ) : bills.length === 0 ? (
          <p>No billing records found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bills.map((bill) => (
              <div key={bill._id} className="bg-white shadow-md rounded-lg overflow-hidden border">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-medium capitalize">{bill.serviceType} Bill</h3>
                </div>
                <div className="p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">NPR {bill.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Due Date:</span>
                    <span>{new Date(bill.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Reading Date:</span>
                    <span>{new Date(bill.readingDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Consumption:</span>
                    <span>{bill.consumption} units</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      bill.status === 'paid' ? 'text-green-600' : 
                      bill.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                    </span>
                  </div>
                  
                  {bill.status !== 'paid' && (
                    <button
                      onClick={() => openPaymentModal(bill)}
                      className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Choose Payment Method</h3>
              <button onClick={closePaymentModal} className="text-gray-500 hover:text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="border-t border-b py-4 my-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Bill Type:</span>
                <span className="font-medium capitalize">{selectedBill.serviceType}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium">NPR {selectedBill.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due Date:</span>
                <span>{new Date(selectedBill.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => initiateBillPaymentStripe(selectedBill._id)}
                disabled={paymentLoading}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md transition"
              >
                {paymentLoading ? 'Processing...' : (
                  <>
                    <span>Pay with Stripe</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="white">
                      <path d="M13.479 9.883c-1.626-.604-2.512-.932-2.512-1.569 0-.539.519-.89 1.368-.89 1.606 0 3.244.766 4.372 1.46l.524-3.225a10.95 10.95 0 00-4.69-1.045c-3.797 0-6.354 2.021-6.354 4.912 0 2.406 1.839 3.802 4.802 4.774 1.923.604 2.556 1.042 2.556 1.719 0 .645-.547 1.093-1.607 1.093-1.321 0-3.576-.689-5.016-1.587l-.524 3.313a11.767 11.767 0 005.252 1.229c4.008 0 6.59-1.975 6.59-5.033 0-2.406-1.839-3.855-4.761-4.151z" />
                    </svg>
                  </>
                )}
              </button>
              
              <button
                onClick={() => initiateBillPaymentEsewa(selectedBill._id)}
                disabled={paymentLoading}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-md transition"
              >
                {paymentLoading ? 'Processing...' : (
                  <>
                    <span>Pay with eSewa</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="white">
                      <path d="M19 14V6c0-1.1-.9-2-2-2H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zm-9-1c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-6v11c0 1.1-.9 2-2 2H4v-2h17V7h2z" />
                    </svg>
                  </>
                )}
              </button>
            </div>
            
            <button
              onClick={closePaymentModal}
              className="w-full mt-3 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;