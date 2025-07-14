import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '../ui/label';

interface Team { id: number; name: string; }
interface League { id: number; name: string; }
interface Game {
  id: number;
  home_team_id: number;
  away_team_id: number;
  league_id: number;
  kick_off_time: string;
  result: string;
  status: string;
}

export const AdminResultsManager: React.FC = () => {
  const [finishedGames, setFinishedGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [selectedGame, setSelectedGame] = useState<any | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<Game>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch finished games
  useEffect(() => {
    fetchFinishedGames();
  }, []);

  const fetchFinishedGames = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          id, kick_off_time, result, status,
          home_team:teams!games_home_team_id_fkey(id, name),
          away_team:teams!games_away_team_id_fkey(id, name),
          league:leagues(id, name),
          home_team_id, away_team_id, league_id
        `)
        .eq('status', 'finished')
        .order('kick_off_time', { ascending: false });
      if (gamesError) throw gamesError;
      setFinishedGames(gamesData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch finished games');
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog
  const openEdit = (game: any) => {
    setSelectedGame(game);
    setForm({
      id: game.id,
      result: game.result || 'pending',
    });
    setFormError(null);
    setShowEdit(true);
  };

  // Update result
  const handleEdit = async () => {
    if (!selectedGame) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('games').update({
        result: form.result as 'home_win' | 'draw' | 'away_win' | 'pending',
      }).eq('id', selectedGame.id);
      if (error) throw error;
      setShowEdit(false);
      fetchFinishedGames();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update result');
    } finally {
      setFormLoading(false);
    }
  };

  // Form field change
  const handleFormChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getResultBadge = (result: string) => {
    const variants = {
      'home_win': { text: 'Home Win', className: 'bg-green-100 text-green-800' },
      'draw': { text: 'Draw', className: 'bg-yellow-100 text-yellow-800' },
      'away_win': { text: 'Away Win', className: 'bg-blue-100 text-blue-800' },
      'pending': { text: 'Pending', className: 'bg-gray-100 text-gray-800' }
    };
    return variants[result as keyof typeof variants] || variants.pending;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Results</h2>
      </div>
      {error && <div className="text-destructive mb-2">{error}</div>}
      {loading ? (
        <div className="text-center text-muted-foreground py-8">Loading results...</div>
      ) : (
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Home Team</TableHead>
                <TableHead>Away Team</TableHead>
                <TableHead>League</TableHead>
                <TableHead>Kickoff</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finishedGames.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">No finished games yet.</TableCell>
                </TableRow>
              ) : (
                finishedGames.map((game) => {
                  const resultBadge = getResultBadge(game.result);
                  return (
                    <TableRow key={game.id}>
                      <TableCell>{game.id}</TableCell>
                      <TableCell>{game.home_team?.name}</TableCell>
                      <TableCell>{game.away_team?.name}</TableCell>
                      <TableCell>{game.league?.name}</TableCell>
                      <TableCell>{game.kick_off_time}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${resultBadge.className}`}>
                          {resultBadge.text}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEdit(game)}>Update Result</Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit Result Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Result</DialogTitle>
            <DialogDescription>Update the result for this finished game.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEdit(); }} className="space-y-4">
            <div>
              <Label>Game</Label>
              <div className="p-3 bg-muted rounded">
                {selectedGame?.home_team?.name} vs {selectedGame?.away_team?.name}
              </div>
            </div>
            <div>
              <Label>Result</Label>
              <select name="result" value={form.result || 'pending'} onChange={handleFormChange} className="w-full border rounded p-2">
                <option value="pending">Pending</option>
                <option value="home_win">Home Win</option>
                <option value="draw">Draw</option>
                <option value="away_win">Away Win</option>
              </select>
            </div>
            {formError && <div className="text-destructive text-sm">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" variant="gradient" disabled={formLoading}>{formLoading ? 'Saving...' : 'Save Result'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 