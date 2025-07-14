import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  email: string;
  full_name: string;
  wallet_balance: number;
  daily_access_granted_until: string | null;
  is_admin: boolean;
}

export const AdminUsersManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<User>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, wallet_balance, daily_access_granted_until');
      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rolesError) throw rolesError;

      // Combine data (without admin auth)
      const usersWithData: User[] = (profilesData || []).map(profile => {
        const userRoles = rolesData?.filter(r => r.user_id === profile.id) || [];
        const isAdmin = userRoles.some(r => r.role === 'admin');
        
        return {
          id: profile.id,
          email: `user-${profile.id}@betwise.com`, // Placeholder since we can't access auth
          full_name: profile.full_name,
          wallet_balance: Number(profile.wallet_balance),
          daily_access_granted_until: profile.daily_access_granted_until,
          is_admin: isAdmin,
        };
      });

      setUsers(usersWithData);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for edit/delete
  const openEdit = (user: User) => {
    setSelectedUser(user);
    setForm({
      id: user.id,
      full_name: user.full_name,
      wallet_balance: user.wallet_balance,
      daily_access_granted_until: user.daily_access_granted_until,
      is_admin: user.is_admin,
    });
    setFormError(null);
    setShowEdit(true);
  };
  const openDelete = (user: User) => {
    setSelectedUser(user);
    setShowDelete(true);
  };

  // Edit user
  const handleEdit = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError(null);
    try {
      // Update profile
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: form.full_name,
        wallet_balance: Number(form.wallet_balance),
        daily_access_granted_until: form.daily_access_granted_until,
      }).eq('id', selectedUser.id);
      if (profileError) throw profileError;

      // Update admin role if changed
      if (form.is_admin !== selectedUser.is_admin) {
        if (form.is_admin) {
          // Add admin role
          const { error: roleError } = await supabase.from('user_roles').insert({
            user_id: selectedUser.id,
            role: 'admin',
          });
          if (roleError) throw roleError;
        } else {
          // Remove admin role
          const { error: roleError } = await supabase.from('user_roles').delete()
            .eq('user_id', selectedUser.id)
            .eq('role', 'admin');
          if (roleError) throw roleError;
        }
      }

      setShowEdit(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update user');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete user
  const handleDelete = async () => {
    if (!selectedUser) return;
    setFormLoading(true);
    setFormError(null);
    try {
      // Delete profile and roles (auth deletion requires admin privileges)
      const { error: profileError } = await supabase.from('profiles').delete().eq('id', selectedUser.id);
      if (profileError) throw profileError;
      
      const { error: rolesError } = await supabase.from('user_roles').delete().eq('user_id', selectedUser.id);
      if (rolesError) throw rolesError;
      
      setShowDelete(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || 'Failed to delete user');
    } finally {
      setFormLoading(false);
    }
  };

  // Form field change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No access';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Users</h2>
      </div>
      {error && <div className="text-destructive mb-2">{error}</div>}
      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading users...</div>
      ) : (
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Wallet Balance</TableHead>
                <TableHead>Daily Access</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No users yet.</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{formatCurrency(user.wallet_balance)}</TableCell>
                    <TableCell>{formatDate(user.daily_access_granted_until)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${user.is_admin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {user.is_admin ? 'Admin' : 'User'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openEdit(user)} className="mr-2">Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => openDelete(user)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update the details of this user.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEdit(); }} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input name="full_name" value={form.full_name || ''} onChange={handleFormChange} required />
            </div>
            <div>
              <Label>Wallet Balance</Label>
              <Input name="wallet_balance" type="number" step="0.01" value={form.wallet_balance || 0} onChange={handleFormChange} required />
            </div>
            <div>
              <Label>Daily Access Until</Label>
              <Input name="daily_access_granted_until" type="datetime-local" value={form.daily_access_granted_until || ''} onChange={handleFormChange} />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="is_admin"
                checked={form.is_admin || false}
                onChange={handleFormChange}
                className="rounded"
              />
              <Label>Admin Access</Label>
            </div>
            {formError && <div className="text-destructive text-sm">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>Are you sure you want to delete this user? This action cannot be undone and will remove all their data.</DialogDescription>
          </DialogHeader>
          {formError && <div className="text-destructive text-sm mb-2">{formError}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={formLoading}>{formLoading ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 