import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '@/integrations/supabase/client';

interface League {
  id: number;
  name: string;
}

export const AdminLeaguesManager: React.FC = () => {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<League | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<League>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch leagues
  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: leaguesData, error: leaguesError } = await supabase
        .from('leagues')
        .select('id, name')
        .order('name', { ascending: true });
      if (leaguesError) throw leaguesError;
      setLeagues(leaguesData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leagues');
    } finally {
      setLoading(false);
    }
  };

  // Handlers for add/edit/delete
  const openAdd = () => {
    setForm({});
    setFormError(null);
    setShowAdd(true);
  };
  const openEdit = (league: League) => {
    setSelectedLeague(league);
    setForm({
      id: league.id,
      name: league.name,
    });
    setFormError(null);
    setShowEdit(true);
  };
  const openDelete = (league: League) => {
    setSelectedLeague(league);
    setShowDelete(true);
  };

  // Add league
  const handleAdd = async () => {
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('leagues').insert({
        name: form.name,
      });
      if (error) throw error;
      setShowAdd(false);
      fetchLeagues();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add league');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit league
  const handleEdit = async () => {
    if (!selectedLeague) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('leagues').update({
        name: form.name,
      }).eq('id', selectedLeague.id);
      if (error) throw error;
      setShowEdit(false);
      fetchLeagues();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update league');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete league
  const handleDelete = async () => {
    if (!selectedLeague) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('leagues').delete().eq('id', selectedLeague.id);
      if (error) throw error;
      setShowDelete(false);
      fetchLeagues();
    } catch (err: any) {
      setFormError(err.message || 'Failed to delete league');
    } finally {
      setFormLoading(false);
    }
  };

  // Form field change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Leagues</h2>
        <Button variant="gradient" onClick={openAdd}>Add League</Button>
      </div>
      {error && <div className="text-destructive mb-2">{error}</div>}
      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading leagues...</div>
      ) : (
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leagues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">No leagues yet.</TableCell>
                </TableRow>
              ) : (
                leagues.map((league) => (
                  <TableRow key={league.id}>
                    <TableCell>{league.id}</TableCell>
                    <TableCell>{league.name}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openEdit(league)} className="mr-2">Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => openDelete(league)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add League Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add League</DialogTitle>
            <DialogDescription>Fill in the details to add a new league.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="space-y-4">
            <div>
              <Label>League Name</Label>
              <Input name="name" value={form.name || ''} onChange={handleFormChange} required />
            </div>
            {formError && <div className="text-destructive text-sm">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={formLoading}>{formLoading ? 'Adding...' : 'Add League'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit League Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit League</DialogTitle>
            <DialogDescription>Update the details of this league.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEdit(); }} className="space-y-4">
            <div>
              <Label>League Name</Label>
              <Input name="name" value={form.name || ''} onChange={handleFormChange} required />
            </div>
            {formError && <div className="text-destructive text-sm">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete League Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete League</DialogTitle>
            <DialogDescription>Are you sure you want to delete this league? This action cannot be undone.</DialogDescription>
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