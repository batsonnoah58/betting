import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthGuard';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Ghost } from 'lucide-react';

interface Bet {
  id: number;
  game_id: number;
  market_id?: number;
  market_option_id?: number;
  stake: number;
  odds: number;
  potential_winnings: number;
  status: string;
  bet_on: string;
  placed_at: string;
  result?: string;
}
interface Game {
  id: number;
  home_team_id: number;
  away_team_id: number;
  league_id: number;
  kick_off_time: string;
  status: string;
  home_team?: { name: string; logo: string };
  away_team?: { name: string; logo: string };
  league?: { name: string };
}

const BetHistory: React.FC = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [games, setGames] = useState<Record<number, Game>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'settled'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'recent' | 'stake' | 'winnings'>('recent');

  useEffect(() => {
    if (!user) return;
    const fetchBets = async () => {
      const { data: betsData, error } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false });
      if (error) return;
      setBets(betsData || []);
      // Fetch related games only
      const gameIds = Array.from(new Set((betsData || []).map((b) => b.game_id)));
      if (gameIds.length) {
        const { data: gamesData } = await supabase
          .from('games')
          .select(`
            id, home_team_id, away_team_id, league_id, kick_off_time, status,
            home_team:teams!games_home_team_id_fkey(id, name, logo),
            away_team:teams!games_away_team_id_fkey(id, name, logo),
            league:leagues(name)
          `)
          .in('id', gameIds);
        setGames(Object.fromEntries((gamesData || []).map((g) => [g.id, g])));
      }
    };
    fetchBets();
  }, [user]);

  // Filtering
  let filtered = bets;
  if (statusFilter !== 'all') {
    filtered = filtered.filter((b) =>
      statusFilter === 'active' ? b.status === 'active' : b.status !== 'active'
    );
  }
  if (search) {
    filtered = filtered.filter((b) => {
      const game = games[b.game_id];
      return (
        (game?.id?.toString().includes(search) || '') ||
        (game?.home_team?.name?.toLowerCase().includes(search.toLowerCase()) || '') ||
        (game?.away_team?.name?.toLowerCase().includes(search.toLowerCase()) || '')
      );
    });
  }
  // Sorting
  filtered = [...filtered].sort((a, b) => {
    if (sort === 'recent') return new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime();
    if (sort === 'stake') return b.stake - a.stake;
    if (sort === 'winnings') return b.potential_winnings - a.potential_winnings;
    return 0;
  });

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
            <div className="font-bold text-lg">My Bet History</div>
            <div className="flex gap-2 items-center">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="settled">Settled</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-40"
              />
              <Select value={sort} onValueChange={(v) => setSort(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="stake">Stake</SelectItem>
                  <SelectItem value="winnings">Potential Winnings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Bet Type</TableHead>
                <TableHead>Stake</TableHead>
                <TableHead>Odds</TableHead>
                <TableHead>Potential</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Ghost className="h-8 w-8 text-muted-foreground mb-2" />
                      <div className="font-semibold">No betting history found</div>
                      <div className="text-sm text-muted-foreground mb-2">You haven't placed any bets yet.</div>
                      <Button asChild variant="gradient">
                        <a href="/">Start Betting</a>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((bet) => {
                  const game = games[bet.game_id];
                  return (
                    <TableRow key={bet.id}>
                      <TableCell>{new Date(bet.placed_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {game ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{game.home_team?.name || `Team ${game.home_team_id}`}</span>
                            <span className="text-muted-foreground">vs</span>
                            <span className="text-sm font-medium">{game.away_team?.name || `Team ${game.away_team_id}`}</span>
                            {game.league && (
                              <Badge variant="outline" className="text-xs">
                                {game.league.name}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          `Game ${bet.game_id}`
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {bet.bet_on.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>KES {bet.stake}</TableCell>
                      <TableCell>{bet.odds}</TableCell>
                      <TableCell>KES {bet.potential_winnings}</TableCell>
                      <TableCell>
                        <Badge variant={bet.status === 'active' ? 'default' : bet.status === 'won' ? 'secondary' : 'destructive'}>
                          {bet.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default BetHistory; 