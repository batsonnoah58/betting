import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';

interface GameRow {
  id: number;
  home_team: { id: number; name: string };
  away_team: { id: number; name: string };
  league: { id: number; name: string };
  kick_off_time: string;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  status: string;
}

const AdminGamesManager: React.FC = () => {
  const [games, setGames] = useState<GameRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<null | GameRow>(null);
  const [showDelete, setShowDelete] = useState<null | GameRow>(null);
  const [form, setForm] = useState<any>({});
  const [formLoading, setFormLoading] = useState(false);
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [leagues, setLeagues] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    fetchGames();
    fetchTeamsAndLeagues();
  }, []);

  const fetchGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          id,
          kick_off_time,
          odds_home,
          odds_draw,
          odds_away,
          status,
          home_team:teams!games_home_team_id_fkey(id, name),
          away_team:teams!games_away_team_id_fkey(id, name),
          league:leagues(id, name)
        `)
        .order('kick_off_time', { ascending: true });
      if (error) throw error;
      setGames(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamsAndLeagues = async () => {
    const { data: teamsData } = await supabase.from('teams').select('id, name');
    const { data: leaguesData } = await supabase.from('leagues').select('id, name');
    setTeams(teamsData || []);
    setLeagues(leaguesData || []);
  };

  const openAdd = () => {
    setForm({
      home_team_id: '',
      away_team_id: '',
      league_id: '',
      kick_off_time: '',
      odds_home: '',
      odds_draw: '',
      odds_away: '',
      status: 'upcoming',
    });
    setShowAdd(true);
  };

  const openEdit = (game: GameRow) => {
    setForm({
      home_team_id: game.home_team.id,
      away_team_id: game.away_team.id,
      league_id: game.league.id,
      kick_off_time: game.kick_off_time,
      odds_home: game.odds_home,
      odds_draw: game.odds_draw,
      odds_away: game.odds_away,
      status: game.status,
    });
    setShowEdit(game);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAdd = async () => {
    setFormLoading(true);
    try {
      const { error } = await supabase.from('games').insert({
        home_team_id: form.home_team_id,
        away_team_id: form.away_team_id,
        league_id: form.league_id,
        kick_off_time: form.kick_off_time,
        odds_home: form.odds_home,
        odds_draw: form.odds_draw,
        odds_away: form.odds_away,
        status: form.status,
      });
      if (error) throw error;
      setShowAdd(false);
      fetchGames();
    } catch (err) {
      alert('Failed to add game');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!showEdit) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from('games').update({
        home_team_id: form.home_team_id,
        away_team_id: form.away_team_id,
        league_id: form.league_id,
        kick_off_time: form.kick_off_time,
        odds_home: form.odds_home,
        odds_draw: form.odds_draw,
        odds_away: form.odds_away,
        status: form.status,
      }).eq('id', showEdit.id);
      if (error) throw error;
      setShowEdit(null);
      fetchGames();
    } catch (err) {
      alert('Failed to update game');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) return;
    setFormLoading(true);
    try {
      const { error } = await supabase.from('games').delete().eq('id', showDelete.id);
      if (error) throw error;
      setShowDelete(null);
      fetchGames();
    } catch (err) {
      alert('Failed to delete game');
    } finally {
      setFormLoading(false);
    }
  };

  const filtered = games.filter(g =>
    g.home_team.name.toLowerCase().includes(search.toLowerCase()) ||
    g.away_team.name.toLowerCase().includes(search.toLowerCase()) ||
    g.league.name.toLowerCase().includes(search.toLowerCase()) ||
    g.status.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Admin Games Manager</h1>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="Search games..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64"
        />
        <Button variant="gradient" className="w-full sm:w-auto" onClick={openAdd}>Add Game</Button>
      </div>
      {loading ? (
        <div>Loading games...</div>
      ) : error ? (
        <div className="text-destructive">{error}</div>
      ) : (
        <table className="w-full border border-border rounded">
          <thead>
            <tr className="bg-muted">
              <th className="p-2 text-left">Home Team</th>
              <th className="p-2 text-left">Away Team</th>
              <th className="p-2 text-left">League</th>
              <th className="p-2 text-left">Kickoff</th>
              <th className="p-2 text-left">Odds (H/D/A)</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center p-4 text-muted-foreground">No games found.</td></tr>
            ) : (
              filtered.map(g => (
                <tr key={g.id} className="border-t border-border">
                  <td className="p-2">{g.home_team.name}</td>
                  <td className="p-2">{g.away_team.name}</td>
                  <td className="p-2">{g.league.name}</td>
                  <td className="p-2">{g.kick_off_time}</td>
                  <td className="p-2">{g.odds_home} / {g.odds_draw} / {g.odds_away}</td>
                  <td className="p-2">{g.status}</td>
                  <td className="p-2">
                    <Button size="sm" variant="outline" className="mr-2" onClick={() => openEdit(g)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => setShowDelete(g)}>Delete</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Add Game Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Game</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block mb-1">Home Team</label>
                <select name="home_team_id" value={form.home_team_id} onChange={handleFormChange} className="w-full border rounded p-2" required>
                  <option value="">Select</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block mb-1">Away Team</label>
                <select name="away_team_id" value={form.away_team_id} onChange={handleFormChange} className="w-full border rounded p-2" required>
                  <option value="">Select</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block mb-1">League</label>
              <select name="league_id" value={form.league_id} onChange={handleFormChange} className="w-full border rounded p-2" required>
                <option value="">Select</option>
                {leagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Kickoff Time</label>
              <Input name="kick_off_time" type="datetime-local" value={form.kick_off_time} onChange={handleFormChange} required />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block mb-1">Odds Home</label>
                <Input name="odds_home" type="number" step="0.01" value={form.odds_home} onChange={handleFormChange} required />
              </div>
              <div className="flex-1">
                <label className="block mb-1">Odds Draw</label>
                <Input name="odds_draw" type="number" step="0.01" value={form.odds_draw} onChange={handleFormChange} required />
              </div>
              <div className="flex-1">
                <label className="block mb-1">Odds Away</label>
                <Input name="odds_away" type="number" step="0.01" value={form.odds_away} onChange={handleFormChange} required />
              </div>
            </div>
            <div>
              <label className="block mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleFormChange} className="w-full border rounded p-2" required>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="finished">Finished</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} disabled={formLoading}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? 'Adding...' : 'Add Game'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Game Modal */}
      <Dialog open={!!showEdit} onOpenChange={v => { if (!v) setShowEdit(null); }}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEdit(); }} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block mb-1">Home Team</label>
                <select name="home_team_id" value={form.home_team_id} onChange={handleFormChange} className="w-full border rounded p-2" required>
                  <option value="">Select</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block mb-1">Away Team</label>
                <select name="away_team_id" value={form.away_team_id} onChange={handleFormChange} className="w-full border rounded p-2" required>
                  <option value="">Select</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block mb-1">League</label>
              <select name="league_id" value={form.league_id} onChange={handleFormChange} className="w-full border rounded p-2" required>
                <option value="">Select</option>
                {leagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">Kickoff Time</label>
              <Input name="kick_off_time" type="datetime-local" value={form.kick_off_time} onChange={handleFormChange} required />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block mb-1">Odds Home</label>
                <Input name="odds_home" type="number" step="0.01" value={form.odds_home} onChange={handleFormChange} required />
              </div>
              <div className="flex-1">
                <label className="block mb-1">Odds Draw</label>
                <Input name="odds_draw" type="number" step="0.01" value={form.odds_draw} onChange={handleFormChange} required />
              </div>
              <div className="flex-1">
                <label className="block mb-1">Odds Away</label>
                <Input name="odds_away" type="number" step="0.01" value={form.odds_away} onChange={handleFormChange} required />
              </div>
            </div>
            <div>
              <label className="block mb-1">Status</label>
              <select name="status" value={form.status} onChange={handleFormChange} className="w-full border rounded p-2" required>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="finished">Finished</option>
              </select>
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

      {/* Delete Game Modal */}
      <Dialog open={!!showDelete} onOpenChange={v => { if (!v) setShowDelete(null); }}>
        <DialogContent className="w-full max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Game</DialogTitle>
          </DialogHeader>
          <div className="py-4">Are you sure you want to delete this game?</div>
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

export default AdminGamesManager; 