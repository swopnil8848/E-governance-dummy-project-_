import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/ErrorBoundary';
import RegistrationPayment from './components/RegistrationPayment';
import PaymentVerification from './components/PaymentVerification';
import CreateRegistrationRequest from './components/CreateRegistrationRequest';
import VerifyEmail from './components/VerifyEmail';
import ProtectedRoute from './components/ProtectedRoute';
import StripePaymentVerification from './components/StripePaymentVerification';
import CreateBill from './components/CreateBill';
// Import your other components here

function App() {
  return (

      <Router>
        {/* <ErrorBoundary> */}
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            {/* Add your other routes here */}
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/dashboard" element={<Dashboard/>}/>
            <Route path="/registrations/new" element={<CreateRegistrationRequest />} />
      <Route path="/registration/:id/payment" element={<RegistrationPayment />} />
      <Route path="/registration/payment/verify" element={<PaymentVerification />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/create-bill" element={<CreateBill />} />

      <Route 
          path="/stripe/registration/payment/verify" 
          element={
            // <ProtectedRoute>
              <StripePaymentVerification />
            // </ProtectedRoute>
          } 
        />

          </Routes>
        {/* </ErrorBoundary> */}
      </Router>
  );
}

export default App;