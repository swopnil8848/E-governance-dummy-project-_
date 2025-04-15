// CreateRegistrationRequest.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateRegistrationRequest = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    serviceType: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    const token = localStorage.getItem('token'); // Make sure token is stored like this
    
    console.log("token:: ",token)

    try {
        const response = await axios.post(
            '/api/registrations',
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
  
      if (response.data.success) {
        navigate('/dashboard/registrations', { 
          state: { message: 'Registration request submitted successfully!' } 
        });
      }
    } catch (err) {
        
      setError(err.response?.data?.message || 'Failed to create registration request');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  

  const serviceTypes = ['water', 'electricity', 'internet', 'waste']; // Replace with your actual service types

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-2xl font-bold mb-6">Request New Service Registration</h1>
      
      {error && (
        <div className="bg-red-50 p-4 rounded-md mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block mb-2 font-medium">Service Type</label>
          <select
            className="w-full p-2 border rounded-md"
            name="serviceType"
            value={formData.serviceType}
            onChange={handleChange}
            required
          >
            <option value="">Select Service Type</option>
            {serviceTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-medium">Address</label>
          <textarea
            className="w-full p-2 border rounded-md"
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={4}
            placeholder="Enter your full address where you want the service"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-md font-medium disabled:bg-gray-400"
          disabled={loading}
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
};

export default CreateRegistrationRequest;