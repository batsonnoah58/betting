import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '../../components/ui/input';

interface UserRow {
  id: string;
  full_name: string;
  role: string;
}

const AdminUsersManager: React.FC = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: profiles, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, full_name');
        if (profilesErr) throw profilesErr;
        const userIds = profiles.map((u: any) => u.id);
        const { data: roles, error: rolesErr } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', userIds);
        if (rolesErr) throw rolesErr;
        const usersWithRoles = profiles.map((u: any) => ({
          id: u.id,
          full_name: u.full_name,
          role: roles.find((r: any) => r.user_id === u.id)?.role || 'user',
        }));
        setUsers(usersWithRoles);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Admin Users Manager</h1>
      <Input
        placeholder="Search users..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 w-full max-w-md"
      />
      {loading ? (
        <div>Loading users...</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : (
        <table className="w-full border border-border rounded">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Role</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={2} className="text-center p-4 text-muted-foreground">No users found.</td></tr>
            ) : (
              filtered.map(u => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-2">{u.full_name}</td>
                  <td className="p-2">{u.role}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminUsersManager; 