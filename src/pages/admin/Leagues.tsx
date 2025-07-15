import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

interface LeagueRow {
  id: number;
  name: string;
}

const AdminLeaguesManager: React.FC = () => {
  const [leagues, setLeagues] = useState<LeagueRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<null | LeagueRow>(null);
  const [showDelete, setShowDelete] = useState<null | LeagueRow>(null);
  const [form, setForm] = useState<any>({});
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('leagues').select('id, name').order('name');
      if (error) throw error;
      setLeagues(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm({ name: '' });
    setShowAdd(true);
  };

  const openEdit = (league: LeagueRow) => {
    setForm({ name: league.name });
    setShowEdit(league);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async () => {
    setFormLoading(true);
    try {
      const { error } = await supabase.from('leagues').insert({ name: form.name });
      if (error) throw error;
      setShowAdd(false);
      fetchLeagues();
    } catch (err) {
      alert('Failed to add league');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from('leagues').update({ name: form.name }).eq('id', showEdit.id);
      if (error) throw error;
      setShowEdit(null);
      fetchLeagues();
    } catch (err) {
      alert('Failed to update league');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from('leagues').delete().eq('id', showDelete.id);
      if (error) throw error;
      setShowDelete(null);
      fetchLeagues();
    } catch (err) {
      alert('Failed to delete league');
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = leagues.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Admin Leagues Manager</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search leagues..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <Button variant="gradient" className="w-full sm:w-auto" onClick={openAdd}>Add League</Button>
      </div>
      {loading ? (
        <div>Loading leagues...</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : (
        <table className="w-full border border-border rounded">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">League Name</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={2} className="text-center p-4 text-muted-foreground">No leagues found.</td></tr>
            ) : (
              filtered.map(l => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-2">{l.name}</td>
                  <td className="p-2">
                    <Button size="sm" variant="outline" className="mr-2" onClick={() => openEdit(l)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setShowDelete(l)}>Delete</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Add League Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Add League</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="space-y-4">
            <div>
              <label className="block mb-1">League Name</label>
              <Input name="name" value={form.name} onChange={handleFormChange} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} disabled={formLoading}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? 'Adding...' : 'Add League'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit League Modal */}
      <Dialog open={!!showEdit} onOpenChange={v => { if (!v) setShowEdit(null); }}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit League</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEdit(); }} className="space-y-4">
            <div>
              <label className="block mb-1">League Name</label>
              <Input name="name" value={form.name} onChange={handleFormChange} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(null)} disabled={formLoading}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete League Modal */}
      <Dialog open={!!showDelete} onOpenChange={v => { if (!v) setShowDelete(null); }}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete League</DialogTitle>
          </DialogHeader>
          <div className="py-4">Are you sure you want to delete this league?</div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDelete(null)} disabled={formLoading}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={formLoading}>
              {formLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeaguesManager; 