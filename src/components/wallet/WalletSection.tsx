import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { Wallet, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const WalletSection: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [todayStats, setTodayStats] = useState({ wins: 0, losses: 0 });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const fetchTodayStats = useCallback(async () => {
    if (!user) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const { data: bets } = await supabase
        .from('bets')
        .select('status, stake, odds')
        .eq('user_id', user.id)
        .gte('placed_at', today.toISOString());

      if (bets) {
        const wins = bets.filter(bet => bet.status === 'won').reduce((sum, bet) => 
          sum + (Number(bet.stake) * Number(bet.odds) - Number(bet.stake)), 0);
        const losses = bets.filter(bet => bet.status === 'lost').reduce((sum, bet) => 
          sum + Number(bet.stake), 0);

        setTodayStats({ wins, losses });
      }
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchTodayStats();
    }
  }, [user, fetchTodayStats]);

  const canWithdraw = user && user.walletBalance >= 2000;

  return (
    <>
      <Card className="shadow-betting animate-fade-in bg-card border border-border text-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span>Your Wallet</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                {formatCurrency(user?.walletBalance || 0)}
              </div>
              <div className="text-sm text-muted-foreground flex items-center space-x-1">
                <TrendingUp className="h-3 w-3 text-success" />
                <span>Available Balance</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowWithdrawModal(true)}
                disabled={!canWithdraw}
                className="flex items-center justify-center space-x-1 h-10 sm:h-9"
                aria-label="Withdraw funds"
              >
                <Minus className="h-4 w-4" />
                <span>Withdraw</span>
              </Button>
            <Button 
              variant="gradient" 
                size="sm"
              onClick={() => setShowDepositModal(true)}
                className="animate-pulse-glow h-10 sm:h-9"
                aria-label="Deposit funds"
            >
                <Plus className="h-4 w-4 mr-1" />
              Deposit
            </Button>
            </div>
          </div>
          {/* Empty state for wallet stats */}
          {todayStats.wins === 0 && todayStats.losses === 0 && (
            <div className="text-center text-muted-foreground mt-4 text-sm">No transactions yet. Start betting to see your stats!</div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-border">
            <div className="text-center">
              <div className="text-base sm:text-lg font-semibold text-success">
                +{formatCurrency(todayStats.wins)}
              </div>
              <div className="text-xs text-muted-foreground">Today's Wins</div>
            </div>
            <div className="text-center">
              <div className="text-base sm:text-lg font-semibold text-destructive">
                -{formatCurrency(todayStats.losses)}
              </div>
              <div className="text-xs text-muted-foreground">Today's Losses</div>
            </div>
          </div>

          {!canWithdraw && user && user.walletBalance > 0 && (
            <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="text-sm text-warning-foreground text-center">
                Minimum withdrawal amount is KES 2,000
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showDepositModal && (
        <DepositModal 
          onClose={() => {
            setShowDepositModal(false);
            refreshUser(); // Refresh wallet after deposit
          }} 
        />
      )}

      {showWithdrawModal && (
        <WithdrawModal 
          onClose={() => {
            setShowWithdrawModal(false);
            refreshUser(); // Refresh wallet after withdrawal
          }} 
        />
      )}
    </>
  );
};