import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }
  if (!user.isAdmin) {
    // Not an admin
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-destructive mb-4">Access Denied</h1>
        <p className="text-lg text-muted-foreground mb-6">You do not have permission to access this page.</p>
        <a href="/" className="text-primary underline">Go to Home</a>
      </div>
    );
  }
  return <>{children}</>;
};

export default AdminRoute; 