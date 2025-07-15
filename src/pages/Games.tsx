import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGamesCache } from '@/hooks/useGamesCache';
import { GameCardSkeleton } from '@/components/games/GameCardSkeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { CustomTabs } from '../components/ui/tabs';
import { GameCard } from '../components/games/GameCard';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../components/ui/dialog';
import Header from '../components/layout/Header';
import { WalletSection } from '../components/wallet/WalletSection';
import { useAuth } from '@/contexts/AuthContext';
import { BetslipDrawer } from '../components/betslip/BetslipDrawer';

interface Game {
  id: number;
  home_team: { name: string; logo: string };
  away_team: { name: string; logo: string };
  league: string;
  kick_off_time: string;
  odds: { home: number; draw: number; away: number };
  status: string;
  confidence: string;
}

interface Transaction {
  id: number;
  user_id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

const Games: React.FC = () => {
  const { games: cachedGames, loading, error, fetchGames } = useGamesCache();
  const [games, setGames] = useState<Game[]>(cachedGames);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [sort, setSort] = useState<'soonest' | 'latest'>('soonest');
  const [tab, setTab] = useState<'upcoming' | 'live' | 'finished'>('upcoming');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch transactions for the user
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setTransactions(data || []);
    };
    fetchTransactions();
  }, [user]);

  useEffect(() => {
    // Update games from cache when it changes
    setGames(cachedGames);
  }, [cachedGames]);

  useEffect(() => {
    // Fetch more games when switching to live tab
    if (tab === 'live') {
      fetchGames();
    }
  }, [tab, fetchGames]);

  // Filter and sort
  let filtered = games.filter((g) => g.status === tab);
  if (leagueFilter !== 'all') filtered = filtered.filter((g) => g.league === leagueFilter);
  if (selectedDate) {
    filtered = filtered.filter((g) => {
      const gameDate = new Date(g.kick_off_time);
      return (
        gameDate.getFullYear() === selectedDate.getFullYear() &&
        gameDate.getMonth() === selectedDate.getMonth() &&
        gameDate.getDate() === selectedDate.getDate()
      );
    });
  }
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter((g) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        g.home_team?.name?.toLowerCase().includes(searchLower) ||
        g.away_team?.name?.toLowerCase().includes(searchLower) ||
        g.league?.toLowerCase().includes(searchLower)
      );
    });
  }
  filtered = [...filtered].sort((a, b) => {
    if (sort === 'soonest') return new Date(a.kick_off_time).getTime() - new Date(b.kick_off_time).getTime();
    return new Date(b.kick_off_time).getTime() - new Date(a.kick_off_time).getTime();
  });

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto py-8 space-y-6">
        {loading && (
          <div className="grid gap-6">
            {Array(6).fill(0).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="text-center text-destructive py-8">
            Failed to load games. Please try again later.
          </div>
        )}
        {/* Wallet Section */}
        {user && <WalletSection />}

        {/* Transaction History */}
        {user && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">No transactions found.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Amount</th>
                      <th className="text-left py-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-1">{new Date(tx.created_at).toLocaleString()}</td>
                        <td className="py-1">{tx.type}</td>
                        <td className="py-1">KES {tx.amount}</td>
                        <td className="py-1">{tx.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        )}

        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
                <div className="font-bold text-lg">Games</div>
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Search teams or leagues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-64"
                  />
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        {selectedDate ? format(selectedDate, 'PPP') : 'Filter by Date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate ?? undefined}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                      <div className="flex gap-2 p-2">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedDate(new Date())}>Today</Button>
                        <Button size="sm" variant="secondary" onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          setSelectedDate(tomorrow);
                        }}>Tomorrow</Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedDate(null)}>Clear</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Select value={leagueFilter} onValueChange={setLeagueFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by League" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leagues</SelectItem>
                      {leagues.map((l) => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sort} onValueChange={(v) => setSort(v as 'soonest' | 'latest')}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="soonest">Soonest</SelectItem>
                      <SelectItem value="latest">Latest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CustomTabs
                tabs={[
                  { label: 'Upcoming', value: 'upcoming' },
                  { label: 'Live', value: 'live' },
                  { label: 'Finished', value: 'finished' },
                ]}
                activeTab={tab}
                onTabChange={(v) => setTab(v as 'upcoming' | 'live' | 'finished')}
              />
              <div className="grid gap-6">
                {filtered.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">No games found.</div>
                ) : (
                  filtered.map((game) => (
                    <div key={game.id} className="relative">
                      <GameCard
                        game={{
                          id: game.id,
                          homeTeam: game.home_team,
                          awayTeam: game.away_team,
                          league: game.league,
                          kickOffTime: game.kick_off_time,
                          odds: game.odds,
                          status: game.status,
                          confidence: game.confidence,
                        }}
                      />
                      <button
                        className="absolute top-2 right-2 bg-primary text-primary-foreground rounded px-3 py-1 text-xs font-semibold shadow hover:bg-primary/90 transition"
                        onClick={() => { setSelectedGame(game); setDetailsOpen(true); }}
                      >
                        View Details
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Game Details Modal */}
          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Game Details</DialogTitle>
              </DialogHeader>
              {selectedGame && (
                <GameCard
                  game={{
                    id: selectedGame.id,
                    homeTeam: selectedGame.home_team,
                    awayTeam: selectedGame.away_team,
                    league: selectedGame.league,
                    kickOffTime: selectedGame.kick_off_time,
                    odds: selectedGame.odds,
                    status: selectedGame.status,
                    confidence: selectedGame.confidence,
                  }}
                />
              )}
              <DialogClose asChild>
                <button className="mt-4 w-full bg-secondary text-secondary-foreground rounded px-4 py-2 font-semibold">Close</button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <BetslipDrawer />
    </>
  );
};

export default Games; 