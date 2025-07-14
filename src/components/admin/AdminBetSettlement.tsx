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

      setBets(betsWithUsers as any);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bets');
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to settle bet');
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
            className="w-full sm:w-64"
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
            <SelectTrigger className="w-full sm:w-40">
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

      {error && <div className="text-destructive mb-4">{error}</div>}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading bets...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Bet Type</TableHead>
                <TableHead>Stake</TableHead>
                <TableHead>Odds</TableHead>
                <TableHead>Potential</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No bets found matching the criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBets.map((bet) => {
                  const statusBadge = getStatusBadge(bet.status);
                  const betTypeBadge = getBetTypeBadge(bet.bet_on);
                  const StatusIcon = statusBadge.icon;

                  return (
                    <TableRow key={bet.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium text-sm">{bet.user?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">User ID: {bet.user_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">
                            {bet.game?.home_team?.name} vs {bet.game?.away_team?.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Result: {bet.game?.result || 'Pending'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={betTypeBadge.className}>
                          {betTypeBadge.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{formatCurrency(bet.stake)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{bet.odds}</TableCell>
                      <TableCell>
                        <div className="font-medium text-success">
                          {formatCurrency(bet.potential_winnings)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadge.className}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusBadge.text}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(bet.placed_at).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(bet.placed_at).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {bet.status === 'active' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openSettlement(bet)}
                          >
                            Settle Bet
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Settlement Dialog */}
      <Dialog open={showSettlement} onOpenChange={setShowSettlement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settle Bet</DialogTitle>
            <DialogDescription>
              Mark this bet as won or lost. If won, the user will receive their winnings.
            </DialogDescription>
          </DialogHeader>
          
          {selectedBet && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">User:</span>
                    <div>{selectedBet.user?.full_name}</div>
                  </div>
                  <div>
                    <span className="font-medium">Game:</span>
                    <div>{selectedBet.game?.home_team?.name} vs {selectedBet.game?.away_team?.name}</div>
                  </div>
                  <div>
                    <span className="font-medium">Bet Type:</span>
                    <div>{getBetTypeBadge(selectedBet.bet_on).text}</div>
                  </div>
                  <div>
                    <span className="font-medium">Stake:</span>
                    <div>{formatCurrency(selectedBet.stake)}</div>
                  </div>
                  <div>
                    <span className="font-medium">Odds:</span>
                    <div>{selectedBet.odds}</div>
                  </div>
                  <div>
                    <span className="font-medium">Potential Winnings:</span>
                    <div className="text-success font-medium">{formatCurrency(selectedBet.potential_winnings)}</div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Settlement Status</label>
                <Select value={settlementStatus} onValueChange={(value) => setSettlementStatus(value as 'won' | 'lost')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settlementStatus === 'won' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      User will receive {formatCurrency(selectedBet.potential_winnings)} in their wallet
                    </span>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowSettlement(false)}
                  disabled={settlementLoading}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSettlement}
                  variant={settlementStatus === 'won' ? 'default' : 'destructive'}
                  disabled={settlementLoading}
                >
                  {settlementLoading ? 'Settling...' : `Mark as ${settlementStatus}`}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}; 