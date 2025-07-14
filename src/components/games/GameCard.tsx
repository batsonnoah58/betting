import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthGuard';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Clock, MapPin, TrendingUp, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

interface Game {
  id: number;
  homeTeam: { name: string; logo: string };
  awayTeam: { name: string; logo: string };
  league: string;
  kickOffTime: string;
  odds: { home: number; draw: number; away: number };
  status: string;
  confidence: string;
}

interface GameCardProps {
  game: Game;
}

// Add types for Market and MarketOption
interface Market {
  id: number;
  game_id: number;
  type: string;
  name: string;
  created_at: string;
}
interface MarketOption {
  id: number;
  market_id: number;
  label: string;
  odds: number;
  created_at: string;
}

export const GameCard: React.FC<GameCardProps> = ({ game }) => {
  const { user, updateWallet } = useAuth();
  const [stakes, setStakes] = useState({ home: '', draw: '', away: '' });
  const [bettingOn, setBettingOn] = useState<'home' | 'draw' | 'away' | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [marketOptions, setMarketOptions] = useState<MarketOption[]>([]);
  const [marketStakes, setMarketStakes] = useState<Record<number, string>>({});
  const [bettingOnOption, setBettingOnOption] = useState<number | null>(null);
  const [showBetConfirmation, setShowBetConfirmation] = useState(false);
  const [pendingBet, setPendingBet] = useState<{ type: 'home' | 'draw' | 'away' | 'option'; stake: number; odds: number; option?: MarketOption } | null>(null);

  // Filtering, sorting, grouping state
  const [marketTypeFilter, setMarketTypeFilter] = useState<string>('all');
  const [optionLabelFilter, setOptionLabelFilter] = useState('');
  const [marketSort, setMarketSort] = useState<'name' | 'type'>('name');
  const [optionOddsAsc, setOptionOddsAsc] = useState(false);

  useEffect(() => {
    const fetchMarkets = async () => {
      const { data: marketsData, error: marketsError } = await supabase
        .from('markets')
        .select('*')
        .eq('game_id', game.id);
      if (!marketsError && marketsData) {
        setMarkets(marketsData);
        if (marketsData.length > 0) {
          const marketIds = marketsData.map((m) => m.id);
          const { data: optionsData, error: optionsError } = await supabase
            .from('market_options')
            .select('*')
            .in('market_id', marketIds);
          if (!optionsError && optionsData) {
            setMarketOptions(optionsData);
          }
        } else {
          setMarketOptions([]);
        }
      }
    };
    fetchMarkets();
  }, [game.id]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      'very-high': { className: 'bg-gradient-success text-white', text: '🔥 VERY HIGH' },
      'high': { className: 'bg-success text-success-foreground', text: '⭐ HIGH' },
      'medium': { className: 'bg-warning text-warning-foreground', text: '📊 MEDIUM' }
    };
    return variants[confidence as keyof typeof variants] || variants.medium;
  };

  const handleBet = async (betType: 'home' | 'draw' | 'away') => {
    if (!user) {
      toast.error("Please login to place bets");
      return;
    }
    
    const stake = parseFloat(stakes[betType]);
    
    if (isNaN(stake) || stake <= 0) {
      toast.error("Please enter a valid stake amount");
      return;
    }

    if (stake > user.walletBalance) {
      toast.error("Your stake exceeds your wallet balance");
      return;
    }

    if (stake < 10) {
      toast.error("Minimum stake amount is KES 10");
      return;
    }

    const odds = game.odds[betType];
    const potentialWinnings = stake * odds;

    // Show confirmation dialog
    setPendingBet({
      type: betType,
      stake,
      odds
    });
    setShowBetConfirmation(true);
  };

  const confirmBet = async () => {
    if (!pendingBet) return;

    if (pendingBet.type === 'option') {
      confirmMarketOptionBet();
      return;
    }

    setBettingOn(pendingBet.type);
    try {
      const potentialWinnings = pendingBet.stake * pendingBet.odds;
      
      // Place bet in database
      const { error } = await supabase
        .from('bets')
        .insert({
          user_id: user!.id,
          game_id: game.id,
          stake: pendingBet.stake,
          bet_on: pendingBet.type === 'home' ? 'home_win' : pendingBet.type === 'draw' ? 'draw' : 'away_win',
          odds: pendingBet.odds,
          potential_winnings: potentialWinnings
        });

      if (error) {
        throw error;
      }

      // Update wallet balance (deduct stake)
      await updateWallet(-pendingBet.stake);

      // Reset stake and show success
      setStakes(prev => ({ ...prev, [pendingBet.type]: '' }));
      toast.success(`Bet placed! Potential winnings: KES ${potentialWinnings.toFixed(2)}`);

    } catch (error) {
      console.error('Error placing bet:', error);
      toast.error('Failed to place bet. Please try again.');
    } finally {
      setBettingOn(null);
      setShowBetConfirmation(false);
      setPendingBet(null);
    }
  };

  // Add handler for betting on a market option
  const handleMarketOptionBet = async (option: MarketOption) => {
    if (!user) {
      toast.error("Please login to place bets");
      return;
    }
    const stake = parseFloat(marketStakes[option.id] || '');
    if (isNaN(stake) || stake <= 0) {
      toast.error("Please enter a valid stake amount");
      return;
    }
    if (stake > user.walletBalance) {
      toast.error("Your stake exceeds your wallet balance");
      return;
    }
    if (stake < 10) {
      toast.error("Minimum stake amount is KES 10");
      return;
    }

    // Show confirmation dialog
    setPendingBet({
      type: 'option',
      stake,
      odds: option.odds,
      option
    });
    setShowBetConfirmation(true);
  };

  const confirmMarketOptionBet = async () => {
    if (!pendingBet || !pendingBet.option) return;

    setBettingOnOption(pendingBet.option.id);
    try {
      const potentialWinnings = pendingBet.stake * pendingBet.option.odds;
      // Place bet in database (store market_option_id and market_id for reference)
      const { error } = await supabase
        .from('bets')
        .insert({
          user_id: user!.id,
          game_id: game.id,
          stake: pendingBet.stake,
          bet_on: 'pending', // Use 'pending' for flexible markets
          odds: pendingBet.option.odds,
          potential_winnings: potentialWinnings,
          market_id: pendingBet.option.market_id,
          market_option_id: pendingBet.option.id
        });
      if (error) throw error;
      await updateWallet(-pendingBet.stake);
      setMarketStakes((prev) => ({ ...prev, [pendingBet.option!.id]: '' }));
      toast.success(`Bet placed! Potential winnings: KES ${potentialWinnings.toFixed(2)}`);
    } catch (error) {
      console.error('Error placing bet:', error);
      toast.error('Failed to place bet. Please try again.');
    } finally {
      setBettingOnOption(null);
      setShowBetConfirmation(false);
      setPendingBet(null);
    }
  };

  // Extract unique market types for filter dropdown
  const uniqueMarketTypes = Array.from(new Set(markets.map((m) => m.type)));

  // Group markets by type (category)
  const groupedMarkets: Record<string, Market[]> = {};
  markets.forEach((market) => {
    if (!groupedMarkets[market.type]) groupedMarkets[market.type] = [];
    groupedMarkets[market.type].push(market);
  });

  // Apply market type filter
  let filteredMarkets = marketTypeFilter === 'all' ? markets : markets.filter((m) => m.type === marketTypeFilter);
  // Sort markets
  filteredMarkets = [...filteredMarkets].sort((a, b) => {
    if (marketSort === 'name') return a.name.localeCompare(b.name);
    if (marketSort === 'type') return a.type.localeCompare(b.type);
    return 0;
  });

  // Option filter/sort helpers
  const filterAndSortOptions = (marketId: number) => {
    let opts = marketOptions.filter((opt) => opt.market_id === marketId);
    if (optionLabelFilter) {
      opts = opts.filter((opt) => opt.label.toLowerCase().includes(optionLabelFilter.toLowerCase()));
    }
    opts = [...opts].sort((a, b) => optionOddsAsc ? a.odds - b.odds : b.odds - a.odds);
    return opts;
  };

  const confidence = getConfidenceBadge(game.confidence);
  const canBet = !!user;

  return (
    <Card className="shadow-betting hover:shadow-glow transition-all duration-300 border border-primary/10">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 gap-2 md:gap-0">
          <div className="flex items-center space-x-2">
            <Badge className={confidence.className}>
              {confidence.text}
            </Badge>
            <Badge variant="outline">{game.league}</Badge>
          </div>
          <div className="flex flex-col items-end text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatTime(game.kickOffTime)}</span>
            </div>
            <div className="text-xs mt-1">{new Date(game.kickOffTime).toLocaleDateString()}</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center sm:space-x-4 mb-6 gap-2 sm:gap-0">
          <div className="text-center flex-1">
            <div className="text-2xl mb-1">{game.homeTeam.logo}</div>
            <div className="font-semibold text-sm">{game.homeTeam.name}</div>
          </div>
          <div className="text-center px-4">
            <div className="text-lg font-bold text-muted-foreground">VS</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-2xl mb-1">{game.awayTeam.logo}</div>
            <div className="font-semibold text-sm">{game.awayTeam.name}</div>
          </div>
        </div>

        {/* Venue and Tips (placeholder) */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-2 sm:gap-0">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>Venue: <span className="font-medium">TBA</span></span>
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Tip: <span className="font-medium">Coming soon</span></span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Home Win */}
          <div className="bg-betting-background border border-primary/20 rounded-lg p-3 hover:bg-betting-hover transition-colors">
            <div className="text-center mb-2">
              <div className="text-xs text-muted-foreground mb-1">Home Win</div>
              <div className="text-lg font-bold text-primary">{game.odds.home}</div>
            </div>
            {canBet ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Stake"
                  value={stakes.home}
                  onChange={(e) => setStakes(prev => ({ ...prev, home: e.target.value }))}
                  className="text-xs h-8"
                  min="10"
                  max={user?.walletBalance || 0}
                />
                <Button
                  size="sm"
                  variant="betting"
                  onClick={() => handleBet('home')}
                  disabled={!stakes.home || bettingOn === 'home'}
                  className="w-full text-xs h-7"
                >
                  {bettingOn === 'home' ? 'Placing...' : 'Bet'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <Lock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">{user ? 'Deposit to bet' : 'Login to bet'}</div>
              </div>
            )}
          </div>

          {/* Draw */}
          <div className="bg-betting-background border border-primary/20 rounded-lg p-3 hover:bg-betting-hover transition-colors">
            <div className="text-center mb-2">
              <div className="text-xs text-muted-foreground mb-1">Draw</div>
              <div className="text-lg font-bold text-primary">{game.odds.draw}</div>
            </div>
            {canBet ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Stake"
                  value={stakes.draw}
                  onChange={(e) => setStakes(prev => ({ ...prev, draw: e.target.value }))}
                  className="text-xs h-8"
                  min="10"
                  max={user?.walletBalance || 0}
                />
                <Button
                  size="sm"
                  variant="betting"
                  onClick={() => handleBet('draw')}
                  disabled={!stakes.draw || bettingOn === 'draw'}
                  className="w-full text-xs h-7"
                >
                  {bettingOn === 'draw' ? 'Placing...' : 'Bet'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <Lock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">{user ? 'Deposit to bet' : 'Login to bet'}</div>
              </div>
            )}
          </div>

          {/* Away Win */}
          <div className="bg-betting-background border border-primary/20 rounded-lg p-3 hover:bg-betting-hover transition-colors">
            <div className="text-center mb-2">
              <div className="text-xs text-muted-foreground mb-1">Away Win</div>
              <div className="text-lg font-bold text-primary">{game.odds.away}</div>
            </div>
            {canBet ? (
              <div className="space-y-2">
                <Input
                  type="number"
                  placeholder="Stake"
                  value={stakes.away}
                  onChange={(e) => setStakes(prev => ({ ...prev, away: e.target.value }))}
                  className="text-xs h-8"
                  min="10"
                  max={user?.walletBalance || 0}
                />
                <Button
                  size="sm"
                  variant="betting"
                  onClick={() => handleBet('away')}
                  disabled={!stakes.away || bettingOn === 'away'}
                  className="w-full text-xs h-7"
                >
                  {bettingOn === 'away' ? 'Placing...' : 'Bet'}
                </Button>
              </div>
            ) : (
              <div className="text-center py-2">
                <Lock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                <div className="text-xs text-muted-foreground">{user ? 'Deposit to bet' : 'Login to bet'}</div>
              </div>
            )}
          </div>
        </div>

        {/* Flexible Markets Section */}
        {markets.length > 0 && (
          <div className="mt-6">
            <div className="font-bold mb-2">Other Markets</div>
            {/* Controls for filtering, sorting, grouping */}
            <div className="flex flex-col md:flex-row gap-2 mb-4 items-center">
              <Select value={marketTypeFilter} onValueChange={setMarketTypeFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueMarketTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search option label..."
                value={optionLabelFilter}
                onChange={(e) => setOptionLabelFilter(e.target.value)}
                className="w-48"
              />
              <Select value={marketSort} onValueChange={(v) => setMarketSort(v as 'name' | 'type')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort Markets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort by Name</SelectItem>
                  <SelectItem value="type">Sort by Type</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <span className="text-xs">Odds Asc</span>
                <Switch checked={optionOddsAsc} onCheckedChange={setOptionOddsAsc} />
              </div>
            </div>
            {/* Grouped by type */}
            {Object.keys(groupedMarkets).map((type) => (
              (marketTypeFilter === 'all' || marketTypeFilter === type) && groupedMarkets[type].length > 0 && (
                <div key={type} className="mb-6">
                  <div className="font-semibold text-primary mb-2">{type}</div>
                  {groupedMarkets[type]
                    .sort((a, b) => {
                      if (marketSort === 'name') return a.name.localeCompare(b.name);
                      if (marketSort === 'type') return a.type.localeCompare(b.type);
                      return 0;
                    })
                    .map((market) => (
                      <div key={market.id} className="mb-4 p-3 rounded-lg border border-primary/10 bg-muted">
                        <div className="font-semibold mb-2">{market.name} <span className="text-xs text-muted-foreground">({market.type})</span></div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {filterAndSortOptions(market.id).map((option) => (
                            <div key={option.id} className="bg-betting-background border border-primary/20 rounded-lg p-3 flex flex-col items-center">
                              <div className="text-xs text-muted-foreground mb-1">{option.label}</div>
                              <div className="text-lg font-bold text-primary">{option.odds}</div>
                              {canBet ? (
                                <div className="w-full mt-2 space-y-2">
                                  <Input
                                    type="number"
                                    placeholder="Stake"
                                    value={marketStakes[option.id] || ''}
                                    onChange={(e) => setMarketStakes((prev) => ({ ...prev, [option.id]: e.target.value }))}
                                    className="text-xs h-8"
                                    min="10"
                                    max={user?.walletBalance || 0}
                                  />
                                  <Button
                                    size="sm"
                                    variant="betting"
                                    onClick={() => handleMarketOptionBet(option)}
                                    disabled={!marketStakes[option.id] || bettingOnOption === option.id}
                                    className="w-full text-xs h-7"
                                  >
                                    {bettingOnOption === option.id ? 'Placing...' : 'Bet'}
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-center py-2">
                                  <Lock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
                                  <div className="text-xs text-muted-foreground">{user ? 'Deposit to bet' : 'Login to bet'}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )
            ))}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>Match ID: #{game.id}</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>Live odds</span>
            </div>
          </div>
        </div>
      </CardContent>
      {showBetConfirmation && pendingBet && (
        <Dialog open={showBetConfirmation} onOpenChange={setShowBetConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Your Bet</DialogTitle>
              <DialogDescription>
                Please review your bet details before confirming.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Stake:</span>
                    <div className="text-lg font-bold text-primary">KES {pendingBet.stake}</div>
                  </div>
                  <div>
                    <span className="font-medium">Odds:</span>
                    <div className="text-lg font-bold">{pendingBet.odds}</div>
                  </div>
                  <div>
                    <span className="font-medium">Potential Winnings:</span>
                    <div className="text-lg font-bold text-success">KES {(pendingBet.stake * pendingBet.odds).toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Bet Type:</span>
                    <div className="text-lg font-bold">
                      {pendingBet.type === 'option' ? pendingBet.option?.label : pendingBet.type.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={() => setShowBetConfirmation(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={confirmBet}
                  className="flex-1"
                  variant="gradient"
                >
                  Confirm Bet
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};