import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, DollarSign, User } from 'lucide-react';

function isErrorWithMessage(err: unknown): err is { message: string } {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string';
}

interface Bet {
  id: number;
  user_id: string;
  game_id: number;
  stake: number;
  bet_on: "home_win" | "draw" | "away_win" | "pending";
  odds: number;
  status: "active" | "won" | "lost";
  potential_winnings: number;
  placed_at: string;
  game?: {
    home_team: { name: string };
    away_team: { name: string };
    result: string;
    status: string;
  };
  user?: {
    full_name: string;
  } | null;
}

export const AdminBetSettlement: React.FC = () => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'won' | 'lost'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog state
  const [showSettlement, setShowSettlement] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [settlementStatus, setSettlementStatus] = useState<'won' | 'lost'>('won');
  const [settlementLoading, setSettlementLoading] = useState(false);

  useEffect(() => {
    fetchBets();
  }, []);

  const fetchBets = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: betsData, error: betsError } = await supabase
        .from('bets')
        .select(`
          id, user_id, game_id, stake, bet_on, odds, status, potential_winnings, placed_at,
          game:games!bets_game_id_fkey(
            home_team:teams!games_home_team_id_fkey(name),
            away_team:teams!games_away_team_id_fkey(name),
            result, status
          )
        `)
        .order('placed_at', { ascending: false });

      if (betsError) throw betsError;
      
      // Fetch user data separately
      const userIds = Array.from(new Set((betsData || []).map(bet => bet.user_id)));
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const usersMap = new Map((usersData || []).map(user => [user.id, user]));
      
      const betsWithUsers = (betsData || []).map(bet => ({
        ...bet,
        user: usersMap.get(bet.user_id) || null
      }));

      setBets(betsWithUsers as Bet[]);
    } catch (err: unknown) {
      if (isErrorWithMessage(err)) {
        setError(err.message);
      } else {
        setError('Failed to fetch bets');
      }
    } finally {
      setLoading(false);
    }
  };

  const openSettlement = (bet: Bet) => {
    setSelectedBet(bet);
    setSettlementStatus('won');
    setShowSettlement(true);
  };

  const handleSettlement = async () => {
    if (!selectedBet) return;
    
    setSettlementLoading(true);
    try {
      // Update bet status
      const { error: betError } = await supabase
        .from('bets')
        .update({ status: settlementStatus })
        .eq('id', selectedBet.id);

      if (betError) throw betError;

      // If bet is won, credit the user's wallet
      if (settlementStatus === 'won') {
        const { error: walletError } = await supabase
          .from('profiles')
          .update({ 
            wallet_balance: selectedBet.potential_winnings 
          })
          .eq('id', selectedBet.user_id)
          .select('wallet_balance')
          .single();

        if (walletError) throw walletError;

        // Add transaction record for winnings
        await supabase
          .from('transactions')
          .insert({
            user_id: selectedBet.user_id,
            type: 'bet_won',
            amount: selectedBet.potential_winnings,
            description: `Bet won payout - Game ${selectedBet.game_id}`
          });
      }

      toast.success(`Bet ${settlementStatus === 'won' ? 'settled as won' : 'settled as lost'}`);
      setShowSettlement(false);
      fetchBets(); // Refresh the list
    } catch (err: unknown) {
      if (isErrorWithMessage(err)) {
        toast.error(err.message);
      } else {
        toast.error('Failed to settle bet');
      }
    } finally {
      setSettlementLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': { text: 'Active', className: 'bg-blue-100 text-blue-800', icon: Clock },
      'won': { text: 'Won', className: 'bg-green-100 text-green-800', icon: CheckCircle },
      'lost': { text: 'Lost', className: 'bg-red-100 text-red-800', icon: XCircle }
    };
    return variants[status as keyof typeof variants] || variants.active;
  };

  const getBetTypeBadge = (betOn: string) => {
    const variants = {
      'home_win': { text: 'Home Win', className: 'bg-purple-100 text-purple-800' },
      'draw': { text: 'Draw', className: 'bg-yellow-100 text-yellow-800' },
      'away_win': { text: 'Away Win', className: 'bg-blue-100 text-blue-800' },
      'pending': { text: 'Pending', className: 'bg-gray-100 text-gray-800' }
    };
    return variants[betOn as keyof typeof variants] || variants.pending;
  };

  // Filter bets
  const filteredBets = bets.filter(bet => {
    const matchesStatus = statusFilter === 'all' || bet.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      bet.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bet.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bet.game?.home_team?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bet.game?.away_team?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold">Bet Settlement</h2>
          <p className="text-muted-foreground">Manage and settle user bets</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="Search by user or team..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 h-9"
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | 'active' | 'won' | 'lost')}>
            <SelectTrigger className="w-full sm:w-40 h-9">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bets</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="won">Won</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-20 bg-muted rounded-lg"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-destructive mb-2">{error}</div>
          <Button onClick={fetchBets} variant="outline">Try Again</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBets.map((bet) => {
            const statusBadge = getStatusBadge(bet.status);
            const betTypeBadge = getBetTypeBadge(bet.bet_on);
            const StatusIcon = statusBadge.icon;
            
            return (
              <div key={bet.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <StatusIcon className="h-4 w-4" />
                      <Badge className={statusBadge.className}>
                        {statusBadge.text}
                      </Badge>
                      <Badge variant="outline" className={betTypeBadge.className}>
                        {betTypeBadge.text}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{bet.user?.full_name || 'Unknown User'}</span>
                      </div>
                      
                      {bet.game && (
                        <div className="text-sm text-muted-foreground">
                          {bet.game.home_team?.name} vs {bet.game.away_team?.name}
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3" />
                          <span>Stake: {formatCurrency(bet.stake)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Odds: {bet.odds}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Potential: {formatCurrency(bet.potential_winnings)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {bet.status === 'active' && (
                      <Button
                        size="sm"
                        onClick={() => openSettlement(bet)}
                        className="w-full sm:w-auto"
                      >
                        Settle Bet
                      </Button>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(bet.placed_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredBets.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bets found</p>
            </div>
          )}
        </div>
      )}

      {/* Settlement Dialog */}
      {showSettlement && selectedBet && (
        <Dialog open={showSettlement} onOpenChange={setShowSettlement}>
          <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Settle Bet</DialogTitle>
              <DialogDescription>
                Update the status of this bet and process any winnings.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>User:</span>
                    <span className="font-medium">{selectedBet.user?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stake:</span>
                    <span className="font-medium">{formatCurrency(selectedBet.stake)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Odds:</span>
                    <span className="font-medium">{selectedBet.odds}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Potential Winnings:</span>
                    <span className="font-medium text-success">{formatCurrency(selectedBet.potential_winnings)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Settlement Status</label>
                <div className="flex space-x-2">
                  <Button
                    variant={settlementStatus === 'won' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettlementStatus('won')}
                    className="flex-1"
                  >
                    Won
                  </Button>
                  <Button
                    variant={settlementStatus === 'lost' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSettlementStatus('lost')}
                    className="flex-1"
                  >
                    Lost
                  </Button>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSettlement(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSettlement}
                disabled={settlementLoading}
                className="flex-1 sm:flex-none"
              >
                {settlementLoading ? 'Processing...' : 'Confirm Settlement'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}; 