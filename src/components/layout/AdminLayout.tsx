import React from 'react';
import AdminBottomNav from './AdminBottomNav';
import { Outlet, useNavigate } from 'react-router-dom';
import AdminRoute from './AdminRoute';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';

const AdminLayout: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 pb-16">
      <button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50 bg-card border border-border rounded-full px-4 py-2 flex items-center gap-2 shadow hover:bg-destructive hover:text-white transition-colors"
        title="Logout"
      >
        <LogOut className="h-5 w-5" />
        <span className="hidden sm:inline">Logout</span>
      </button>
      <AdminRoute>
        <Outlet />
      </AdminRoute>
      <AdminBottomNav />
    </div>
  );
};

export default AdminLayout; 