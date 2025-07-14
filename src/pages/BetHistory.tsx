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
}
interface Market {
  id: number;
  name: string;
  type: string;
}
interface MarketOption {
  id: number;
  label: string;
}

const BetHistory: React.FC = () => {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [games, setGames] = useState<Record<number, Game>>({});
  const [markets, setMarkets] = useState<Record<number, Market>>({});
  const [options, setOptions] = useState<Record<number, MarketOption>>({});
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
      // Fetch related games, markets, options
      const gameIds = Array.from(new Set((betsData || []).map((b) => b.game_id)));
      const marketIds = Array.from(new Set((betsData || []).map((b) => b.market_id).filter(Boolean)));
      const optionIds = Array.from(new Set((betsData || []).map((b) => b.market_option_id).filter(Boolean)));
      if (gameIds.length) {
        const { data: gamesData } = await supabase.from('games').select('*').in('id', gameIds);
        setGames(Object.fromEntries((gamesData || []).map((g) => [g.id, g])));
      }
      if (marketIds.length) {
        const { data: marketsData } = await supabase.from('markets').select('*').in('id', marketIds);
        setMarkets(Object.fromEntries((marketsData || []).map((m) => [m.id, m])));
      }
      if (optionIds.length) {
        const { data: optionsData } = await supabase.from('market_options').select('*').in('id', optionIds);
        setOptions(Object.fromEntries((optionsData || []).map((o) => [o.id, o])));
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
      const market = b.market_id ? markets[b.market_id] : undefined;
      const option = b.market_option_id ? options[b.market_option_id] : undefined;
      return (
        (game?.id?.toString().includes(search) || '') ||
        (market?.name?.toLowerCase().includes(search.toLowerCase()) || '') ||
        (option?.label?.toLowerCase().includes(search.toLowerCase()) || '')
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
                <TableHead>Market</TableHead>
                <TableHead>Option</TableHead>
                <TableHead>Stake</TableHead>
                <TableHead>Odds</TableHead>
                <TableHead>Potential</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
                  const market = bet.market_id ? markets[bet.market_id] : undefined;
                  const option = bet.market_option_id ? options[bet.market_option_id] : undefined;
                  return (
                    <TableRow key={bet.id}>
                      <TableCell>{new Date(bet.placed_at).toLocaleString()}</TableCell>
                      <TableCell>{game ? `${game.home_team_id} vs ${game.away_team_id}` : bet.game_id}</TableCell>
                      <TableCell>{market ? `${market.name} (${market.type})` : bet.bet_on}</TableCell>
                      <TableCell>{option ? option.label : '-'}</TableCell>
                      <TableCell>{bet.stake}</TableCell>
                      <TableCell>{bet.odds}</TableCell>
                      <TableCell>{bet.potential_winnings}</TableCell>
                      <TableCell>
                        <Badge variant={bet.status === 'active' ? 'default' : 'secondary'}>{bet.status}</Badge>
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