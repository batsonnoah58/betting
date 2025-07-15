import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setError(null);
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMsg('Password updated successfully!');
      setPassword('');
      setConfirm('');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-4">Admin Settings</h1>
      <div className="mb-8 p-4 bg-card border border-border rounded">
        <h2 className="text-lg font-semibold mb-2">Admin Info</h2>
        <div className="mb-1"><span className="font-medium">Name:</span> {user?.fullName}</div>
        <div className="mb-1"><span className="font-medium">Email:</span> {user?.email}</div>
        <div className="mb-1"><span className="font-medium">Role:</span> {user?.isAdmin ? 'Admin' : 'User'}</div>
      </div>
      <div className="mb-8 p-4 bg-card border border-border rounded">
        <h2 className="text-lg font-semibold mb-2">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <Input
            type="password"
            placeholder="New password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />
          {msg && <div className="text-success text-sm">{msg}</div>}
          {error && <div className="text-destructive text-sm">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Updating...' : 'Change Password'}
          </Button>
        </form>
      </div>
      <div className="p-4 bg-card border border-border rounded">
        <h2 className="text-lg font-semibold mb-2">Site Settings</h2>
        <div className="text-muted-foreground">(Coming soon: site-wide settings, theme, maintenance mode, etc.)</div>
      </div>
    </div>
  );
};

export default AdminSettings; 