import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import ClientLogin from './pages/ClientLogin';
import AdminDashboard from './pages/AdminDashboard';
import ClientPortal from './pages/ClientPortal';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/client-login" element={<ClientLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/portal/:clientId" element={<ClientPortal />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
