import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Navigation = () => {
  const [user, setUser] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

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
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

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
      } finally {
        setLoading(false);
      }
    };

    fetchRegistrations();
  }, []);

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
      navigate(`/registration/payment/${registrationId}`);
    } catch (err) {
      console.error('Error redirecting to payment page:', err);
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
                <p><strong>Registration Fee:</strong> NPR 500</p>

                {reg.status === 'approved' && (
                  <button
                    onClick={() => initiateKhaltiPayment(reg._id)}
                    className="mt-3 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                  >
                    Complete Payment with Khalti
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">My Billings</h1>
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border">Date</th>
              <th className="py-2 px-4 border">Service</th>
              <th className="py-2 px-4 border">Amount</th>
              <th className="py-2 px-4 border">Status</th>
            </tr>
          </thead>
          <tbody>
            {/* Billing data would go here */}
            <tr>
              <td colSpan="4" className="py-4 text-center text-gray-500">
                No billing records found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Navigation;