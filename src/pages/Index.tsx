import React from 'react';
import { AuthProvider } from '../components/AuthGuard';
import { Dashboard } from '../components/Dashboard';
import { Toaster } from '../components/ui/toaster';
import { useAuth } from '../components/AuthGuard';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  return (
    <AuthProvider>
      <Dashboard />
      <Toaster />
    </AuthProvider>
  );
};

export default Index;
