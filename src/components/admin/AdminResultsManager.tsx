import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';

interface Team { id: number; name: string; }
interface League { id: number; name: string; }
// Extend Game interface for new fields
interface Game {
  id: number;
  home_team_id: number;
  away_team_id: number;
  league_id: number;
  kick_off_time: string;
  result: string;
  status: string;
  result_type?: string;
  score_home_half?: number | undefined;
  score_away_half?: number | undefined;
  score_home_full?: number | undefined;
  score_away_full?: number | undefined;
  home_team?: { id: number; name: string; logo?: string };
  away_team?: { id: number; name: string; logo?: string };
  league?: { id: number; name: string };
}

export const AdminResultsManager: React.FC = () => {
  // TODO: Replace 'unknown' with a proper Game type if available
  const [finishedGames, setFinishedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<Omit<Game, 'score_home_half' | 'score_away_half' | 'score_home_full' | 'score_away_full'> & {
    score_home_half?: string;
    score_away_half?: string;
    score_home_full?: string;
    score_away_full?: string;
  }>>({});
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
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch finished games');
    } finally {
      setLoading(false);
    }
  };

  // Open edit dialog
  const openEdit = (game: Game) => {
    setSelectedGame(game);
    setForm({
      id: game.id,
      result: game.result || 'pending',
      result_type: game.result_type || 'full_time',
      score_home_half: game.score_home_half !== undefined && game.score_home_half !== null ? String(game.score_home_half) : '',
      score_away_half: game.score_away_half !== undefined && game.score_away_half !== null ? String(game.score_away_half) : '',
      score_home_full: game.score_home_full !== undefined && game.score_home_full !== null ? String(game.score_home_full) : '',
      score_away_full: game.score_away_full !== undefined && game.score_away_full !== null ? String(game.score_away_full) : '',
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
        result_type: form.result_type,
        score_home_half: form.score_home_half && form.score_home_half !== '' ? Number(form.score_home_half) : null,
        score_away_half: form.score_away_half && form.score_away_half !== '' ? Number(form.score_away_half) : null,
        score_home_full: form.score_home_full && form.score_home_full !== '' ? Number(form.score_home_full) : null,
        score_away_full: form.score_away_full && form.score_away_full !== '' ? Number(form.score_away_full) : null,
      }).eq('id', selectedGame.id);
      if (error) throw error;
      setShowEdit(false);
      fetchFinishedGames();
    } catch (err: unknown) {
      setFormError((err as Error).message || 'Failed to update result');
    } finally {
      setFormLoading(false);
    }
  };

  // Form field change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const getResultBadge = (result: string) => {
    const variants = {
      'home_win': { text: 'Home Win', className: 'bg-success/10 text-success' },
      'draw': { text: 'Draw', className: 'bg-accent/10 text-accent' },
      'away_win': { text: 'Away Win', className: 'bg-info/10 text-info' },
      'pending': { text: 'Pending', className: 'bg-muted text-muted-foreground' }
    };
    return variants[result as keyof typeof variants] || variants.pending;
  };

  const getResultBadgeVariant = (result: string) => {
    switch (result) {
      case 'home_win':
        return 'default';
      case 'draw':
        return 'secondary';
      case 'away_win':
        return 'secondary';
      case 'pending':
      default:
        return 'outline';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Results</h2>
      </div>
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-2 text-destructive text-center">{error}</div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading results...</span>
        </div>
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
                  const resultBadge = getResultBadge((game as Game).result);
                  return (
                    <TableRow key={(game as Game).id}>
                      <TableCell>{(game as Game).id}</TableCell>
                      <TableCell>{(game as Game).home_team?.logo ? <img src={(game as Game).home_team.logo} alt={(game as Game).home_team.name} className="inline-block h-6 w-6 object-contain mr-2" /> : '⚽'} {(game as Game).home_team?.name}</TableCell>
                      <TableCell>{(game as Game).away_team?.logo ? <img src={(game as Game).away_team.logo} alt={(game as Game).away_team.name} className="inline-block h-6 w-6 object-contain mr-2" /> : '⚽'} {(game as Game).away_team?.name}</TableCell>
                      <TableCell>{(game as Game).league?.name}</TableCell>
                      <TableCell>{(game as Game).kick_off_time}</TableCell>
                      <TableCell>
                        <Badge variant={getResultBadgeVariant((game as Game).result)} className={resultBadge.className}>
                          {resultBadge.text}
                        </Badge>
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
                {(selectedGame as Game)?.home_team?.name} vs {(selectedGame as Game)?.away_team?.name}
              </div>
            </div>
            <div>
              <Label>Result Type</Label>
              <select name="result_type" value={form.result_type || 'full_time'} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                <option value="full_time">Full Time</option>
                <option value="half_time">Half Time</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Home Score (Half Time)</Label>
                <input name="score_home_half" type="number" min="0" value={form.score_home_half ?? ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading} />
              </div>
              <div>
                <Label>Away Score (Half Time)</Label>
                <input name="score_away_half" type="number" min="0" value={form.score_away_half ?? ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Home Score (Full Time)</Label>
                <input name="score_home_full" type="number" min="0" value={form.score_home_full ?? ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading} />
              </div>
              <div>
                <Label>Away Score (Full Time)</Label>
                <input name="score_away_full" type="number" min="0" value={form.score_away_full ?? ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading} />
              </div>
            </div>
            <div>
              <Label>Result</Label>
              <select name="result" value={form.result || 'pending'} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                <option value="pending">Pending</option>
                <option value="home_win">Home Win</option>
                <option value="draw">Draw</option>
                <option value="away_win">Away Win</option>
              </select>
            </div>
            {formError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)} disabled={formLoading}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? (
                  <span className="flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Processing...</span>
                ) : (
                  'Save Result'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 