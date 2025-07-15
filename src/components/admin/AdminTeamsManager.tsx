import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '@/integrations/supabase/client';

interface League { id: number; name: string; }
interface Team {
  id: number;
  name: string;
  league_id: number;
  logo: string | null;
}

export const AdminTeamsManager: React.FC = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<Team>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all data
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch teams with league info
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id, name, logo,
          league:leagues(id, name),
          league_id
        `)
        .order('name', { ascending: true });
      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch leagues
      const { data: leaguesData, error: leaguesError } = await supabase
        .from('leagues')
        .select('id, name');
      if (leaguesError) throw leaguesError;
      setLeagues(leaguesData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
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
  const openEdit = (team: any) => {
    setSelectedTeam(team);
    setForm({
      id: team.id,
      name: team.name,
      league_id: team.league_id,
      logo: team.logo,
    });
    setFormError(null);
    setShowEdit(true);
  };
  const openDelete = (team: any) => {
    setSelectedTeam(team);
    setShowDelete(true);
  };

  // Add team
  const handleAdd = async () => {
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('teams').insert({
        name: form.name,
        league_id: Number(form.league_id),
        logo: form.logo || null,
      });
      if (error) throw error;
      setShowAdd(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add team');
    } finally {
      setFormLoading(false);
    }
  };

  // Edit team
  const handleEdit = async () => {
    if (!selectedTeam) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('teams').update({
        name: form.name,
        league_id: Number(form.league_id),
        logo: form.logo || null,
      }).eq('id', selectedTeam.id);
      if (error) throw error;
      setShowEdit(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update team');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete team
  const handleDelete = async () => {
    if (!selectedTeam) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('teams').delete().eq('id', selectedTeam.id);
      if (error) throw error;
      setShowDelete(false);
      fetchAll();
    } catch (err: any) {
      setFormError(err.message || 'Failed to delete team');
    } finally {
      setFormLoading(false);
    }
  };

  // Form field change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Teams</h2>
        <Button variant="gradient" onClick={openAdd}>Add Team</Button>
      </div>
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-2 text-destructive text-center">{error}</div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading teams...</span>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>League</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No teams yet.</TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>{team.id}</TableCell>
                    <TableCell>{team.name}</TableCell>
                    <TableCell>{team.league?.name}</TableCell>
                    <TableCell>{team.logo || '⚽'}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openEdit(team)} className="mr-2">Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => openDelete(team)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Team Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team</DialogTitle>
            <DialogDescription>Fill in the details to add a new team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="space-y-4">
            <div>
              <Label>Team Name</Label>
              <Input name="name" value={form.name || ''} onChange={handleFormChange} required />
            </div>
            <div>
              <Label>League</Label>
              <select name="league_id" value={form.league_id || ''} onChange={handleFormChange} className="w-full border rounded p-2" required>
                <option value="">Select League</option>
                {leagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Logo (optional)</Label>
              <Input name="logo" value={form.logo || ''} onChange={handleFormChange} placeholder="⚽" />
            </div>
            {formError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={formLoading}>
                {formLoading ? <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Processing...</span> : 'Add Team'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
            <DialogDescription>Update the details of this team.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEdit(); }} className="space-y-4">
            <div>
              <Label>Team Name</Label>
              <Input name="name" value={form.name || ''} onChange={handleFormChange} required />
            </div>
            <div>
              <Label>League</Label>
              <select name="league_id" value={form.league_id || ''} onChange={handleFormChange} className="w-full border rounded p-2" required>
                <option value="">Select League</option>
                {leagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Logo (optional)</Label>
              <Input name="logo" value={form.logo || ''} onChange={handleFormChange} placeholder="⚽" />
            </div>
            {formError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={formLoading}>
                {formLoading ? <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Processing...</span> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Team Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>Are you sure you want to delete this team? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {formError && <div className="text-destructive text-sm mb-2">{formError}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={formLoading}>
              {formLoading ? <span className="flex items-center"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>Deleting...</span> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 