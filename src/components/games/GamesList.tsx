import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { GameCard } from './GameCard';
import { Calendar, Trophy, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Tabs } from '../ui/tabs';

interface Team {
  id: number;
  name: string;
  logo: string;
}

interface League {
  id: number;
  name: string;
}

interface Game {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  league: string;
  kickOffTime: string;
  odds: { home: number; draw: number; away: number };
  status: string;
  confidence: string;
}

interface Market {
  id: number;
  type: string;
  name: string;
}

interface MarketOption {
  id: number;
  market_id: number;
  label: string;
}

export const GamesList: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [leagues, setLeagues] = useState<string[]>(['all']);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);
  const [betDialog, setBetDialog] = useState<{ game: Game; type: 'home' | 'draw' | 'away' } | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const { user, updateWallet, refreshUser } = useAuth();

  // Add tab state for navigation
  const [activeTab, setActiveTab] = useState<'highlights' | 'upcoming' | 'countries' | 'quick-e'>('highlights');

  useEffect(() => {
    fetchGamesAndLeagues();
  }, []);

  const fetchGamesAndLeagues = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch games with team and league information
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          id,
          kick_off_time,
          odds_home,
          odds_draw,
          odds_away,
          status,
          confidence,
          home_team:teams!games_home_team_id_fkey(id, name, logo),
          away_team:teams!games_away_team_id_fkey(id, name, logo),
          league:leagues(name)
        `)
        .eq('status', 'upcoming')
        .order('kick_off_time', { ascending: true });

      if (gamesError) {
        console.error('Error fetching games:', gamesError);
        setError('Failed to load games. Please try again.');
        return;
      }

      // Transform data to match component interface
      const transformedGames: Game[] = gamesData?.map(game => ({
        id: game.id,
        homeTeam: {
          id: game.home_team.id,
          name: game.home_team.name,
          logo: game.home_team.logo, // Use exactly what admin set
        },
        awayTeam: {
          id: game.away_team.id,
          name: game.away_team.name,
          logo: game.away_team.logo, // Use exactly what admin set
        },
        league: game.league.name,
        kickOffTime: game.kick_off_time,
        odds: {
          home: Number(game.odds_home),
          draw: Number(game.odds_draw),
          away: Number(game.odds_away)
        },
        status: game.status,
        confidence: game.confidence
      })) || [];

      setGames(transformedGames);

      // Get unique leagues
      const uniqueLeagues = Array.from(new Set(transformedGames.map(game => game.league)));
      setLeagues(['all', ...uniqueLeagues]);
    } catch (err) {
      console.error('Error fetching games:', err);
      setError('Failed to load games. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Tab-based filtering logic
  let filteredGames: Game[] = [];
  if (activeTab === 'upcoming') {
    filteredGames = selectedLeague === 'all'
      ? games
      : games.filter(game => game.league === selectedLeague);
  } else if (activeTab === 'highlights') {
    filteredGames = (selectedLeague === 'all'
      ? games
      : games.filter(game => game.league === selectedLeague)
    ).filter(game => game.confidence === 'very-high' || game.confidence === 'high');
  } // For 'countries' and 'quick-e', filteredGames remains empty

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      'very-high': { variant: 'default' as const, text: '🔥 VERY HIGH', className: 'bg-gradient-success' },
      'high': { variant: 'default' as const, text: '⭐ HIGH', className: 'bg-success' },
      'medium': { variant: 'secondary' as const, text: '📊 MEDIUM', className: '' }
    };
    return variants[confidence as keyof typeof variants] || variants.medium;
  };

  // Helper to get 1X2 market and other markets for a game
  const getMarketsForGame = (gameId: number, markets: Market[], marketOptions: MarketOption[]) => {
    const oneXTwoMarket = markets.find(m => m.type === '1x2' || m.name.toLowerCase().includes('1x2'));
    const oneXTwoOptions = oneXTwoMarket ? marketOptions.filter(opt => opt.market_id === oneXTwoMarket.id) : [];
    const otherMarkets = markets.filter(m => m !== oneXTwoMarket);
    return { oneXTwoMarket, oneXTwoOptions, otherMarkets };
  };

  return (
    <div className="games-list space-y-4 md:space-y-6">
      {/* Tab Navigation Bar */}
      <div className="w-full bg-card border-b border-border flex items-center px-2 sm:px-4 py-2 sticky top-[56px] z-40 rounded-t-xl">
        {[
          { key: 'highlights', label: 'Highlights' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'countries', label: 'Countries' },
          { key: 'quick-e', label: 'Quick-e' },
        ].map(tab => (
          <button
            key={tab.key}
            className={`px-4 py-2 font-semibold text-sm rounded-lg mx-1 transition-colors border focus:outline-none focus:ring-2 focus:ring-accent/60 focus:z-10
              ${activeTab === tab.key
                ? 'bg-accent text-accent-foreground border-accent shadow-betting'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'}`}
            onClick={() => setActiveTab(tab.key as 'highlights' | 'upcoming' | 'countries' | 'quick-e')}
            aria-selected={activeTab === tab.key}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* End Tab Navigation Bar */}
      <Card className="shadow-betting">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <span>Today's Games</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* League filter chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {['All Leagues', 'La Liga', 'Bundesliga', 'Serie A', 'Premier League'].map(league => (
              <button
                key={league}
                className={`px-4 py-1.5 rounded-full font-medium text-xs border transition-colors
                  ${(selectedLeague === league || (league === 'All Leagues' && selectedLeague === 'all'))
                    ? 'bg-accent text-accent-foreground border-accent shadow-betting'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/70'}`}
                onClick={() => setSelectedLeague(league === 'All Leagues' ? 'all' : league)}
              >
                {league}
              </button>
            ))}
          </div>
          {/* End League filter chips */}
        </CardContent>
      </Card>

      {activeTab === 'countries' || activeTab === 'quick-e' ? (
        <Card className="shadow-betting">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2 text-lg">Coming soon...</div>
              <p className="text-sm text-muted-foreground">
                This feature will be available in a future update.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card className="shadow-betting">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading games...</span>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="shadow-betting">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-8">
              <div className="text-destructive mb-2">{error}</div>
              <Button onClick={fetchGamesAndLeagues} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredGames.length === 0 ? (
        <Card className="shadow-betting">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2 text-lg">No games available for your filters.<br/>Please check back later or try a different league.</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}

      {/* Bet Confirmation Dialog */}
      {betDialog && (
        <Dialog open={true} onOpenChange={() => setBetDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Place Bet</DialogTitle>
            </DialogHeader>
            <div className="mb-2">
              <div className="font-semibold mb-1">
                {betDialog.game.homeTeam.name} vs {betDialog.game.awayTeam.name}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                Market: 1X2 &nbsp;|&nbsp; Selection: <span className="font-bold text-primary">{betDialog.type === 'home' ? '1' : betDialog.type === 'draw' ? 'X' : '2'}</span>
                &nbsp;@&nbsp;
                <span className="font-bold text-primary">
                  {betDialog.type === 'home' ? betDialog.game.odds.home.toFixed(2) : betDialog.type === 'draw' ? betDialog.game.odds.draw.toFixed(2) : betDialog.game.odds.away.toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                min="10"
                placeholder="Enter stake (KES)"
                className="w-full border rounded p-2 mb-2"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
              />
              <div className="text-xs text-muted-foreground mb-2">Minimum stake: KES 10</div>
              {betAmount && parseFloat(betAmount) >= 10 && (
                <div className="text-xs text-muted-foreground mb-2">
                  Potential winnings: <span className="font-bold text-success">
                    KES {(
                      parseFloat(betAmount) *
                      (betDialog.type === 'home' ? betDialog.game.odds.home : betDialog.type === 'draw' ? betDialog.game.odds.draw : betDialog.game.odds.away)
                    ).toFixed(2)}
                  </span>
                </div>
              )}
              {user && (
                <div className="text-xs text-muted-foreground mb-2">
                  Wallet balance: <span className="font-bold">KES {user.walletBalance.toFixed(2)}</span>
                </div>
              )}
      </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBetDialog(null)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!user) {
                    toast.error('Please login to place bets');
                    return;
                  }
                  const stake = parseFloat(betAmount);
                  if (isNaN(stake) || stake < 10) {
                    toast.error('Minimum stake is KES 10');
                    return;
                  }
                  if (stake > user.walletBalance) {
                    toast.error('Insufficient wallet balance');
                    return;
                  }
                  // Place bet in database
                  const odds = betDialog.type === 'home' ? betDialog.game.odds.home : betDialog.type === 'draw' ? betDialog.game.odds.draw : betDialog.game.odds.away;
                  const potentialWinnings = stake * odds;
                  const { error } = await supabase
                    .from('bets')
                    .insert({
                      user_id: user.id,
                      game_id: betDialog.game.id,
                      stake,
                      bet_on: betDialog.type === 'home' ? 'home_win' : betDialog.type === 'draw' ? 'draw' : 'away_win',
                      odds,
                      potential_winnings: potentialWinnings,
                      status: 'active',
                    });
                  if (error) {
                    toast.error('Failed to place bet. Please try again.');
                    return;
                  }
                  // Deduct stake from wallet
                  await updateWallet(-stake);
                  await refreshUser();
                  setBetDialog(null);
                  setBetAmount('');
                  toast.success(`Bet placed! Potential winnings: KES ${potentialWinnings.toFixed(2)}`);
                }}
                disabled={!betAmount || parseFloat(betAmount) < 10}
              >
                Place Bet
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {!isLoading && !error && filteredGames.length === 0 && (
        <Card className="shadow-betting">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-2">No games found</div>
              <p className="text-sm text-muted-foreground">
                {selectedLeague === 'all' 
                  ? 'No games available today. Check back later for new matches.'
                  : `No games found for ${selectedLeague}. Try selecting a different league.`
                }
            </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};