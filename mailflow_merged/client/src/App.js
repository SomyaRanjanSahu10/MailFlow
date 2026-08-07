import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import SignaturePage  from './pages/SignaturePage';
import ProfilePage    from './pages/ProfilePage';
import TrashPage      from './pages/TrashPage';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
};
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user)                 return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/"     replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/admin"           element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/signature"       element={<PrivateRoute><SignaturePage /></PrivateRoute>} />
      <Route path="/profile"         element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/trash"           element={<PrivateRoute><TrashPage /></PrivateRoute>} />
      <Route path="/"                element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="*"                element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
