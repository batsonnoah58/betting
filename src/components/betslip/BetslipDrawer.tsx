import React, { useState } from 'react';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose
} from '../ui/drawer';
import { Button } from '../ui/button';
import { useBetslip } from './BetslipContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../AuthGuard';
import { toast } from 'sonner';
import type { TablesInsert } from '@/integrations/supabase/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export const BetslipDrawer: React.FC = () => {
  const { selections, removeSelection, clearBetslip } = useBetslip();
  const { user, updateWallet, refreshUser } = useAuth();
  const [stake, setStake] = useState('');
  const [placing, setPlacing] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  // Calculate combined odds (product of all odds)
  const combinedOdds = selections.reduce((acc, sel) => acc * sel.odds, 1);
  const potentialWinnings = stake && !isNaN(Number(stake)) ? Number(stake) * combinedOdds : 0;

  const handlePlaceMultiBet = async () => {
    if (!user) {
      toast.error('Please login to place bets');
      return;
    }
    if (!stake || isNaN(Number(stake)) || Number(stake) < 10) {
      toast.error('Please enter a valid stake (min 10 KES)');
      return;
    }
    if (Number(stake) > user.walletBalance) {
      toast.error('Your stake exceeds your wallet balance');
      return;
    }
    if (selections.length === 0) {
      toast.error('Add at least one selection to your betslip');
      return;
    }
    setPlacing(true);
    try {
      // Deduct stake from wallet
      await updateWallet(-Number(stake));
      // Insert all bets (each as a separate row)
      const betsToInsert: TablesInsert<'bets'>[] = selections.map(sel => {
        if (sel.marketId === 0) {
          let bet_on: 'home_win' | 'draw' | 'away_win' = 'home_win';
          if (sel.label.toLowerCase() === 'draw') bet_on = 'draw';
          else if (sel.label.toLowerCase() === 'away') bet_on = 'away_win';
          return {
            user_id: user.id,
            game_id: sel.gameId,
            stake: Number(stake),
            bet_on,
            odds: sel.odds,
            potential_winnings: Number(stake) * sel.odds,
            market_id: undefined,
            market_option_id: undefined,
          };
        } else {
          return {
            user_id: user.id,
            game_id: sel.gameId,
            stake: Number(stake),
            bet_on: 'pending',
            odds: sel.odds,
            potential_winnings: Number(stake) * sel.odds,
            market_id: sel.marketId,
            market_option_id: sel.marketOptionId,
          };
        }
      });
      const { error } = await supabase.from('bets').insert(betsToInsert);
      if (error) throw error;
      clearBetslip();
      setStake('');
      setShowDrawer(false);
      toast.success(`Multi-bet placed!\nSelections: ${selections.length}\nCombined Odds: ${combinedOdds.toFixed(2)}\nStake: KES ${stake}\nPotential Winnings: KES ${potentialWinnings.toFixed(2)}`);
      await refreshUser();
    } catch (err: any) {
      toast.error('Failed to place multi-bet. Please try again.');
      // Refund stake if error
      await updateWallet(Number(stake));
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Drawer open={showDrawer} onOpenChange={setShowDrawer}>
      <DrawerTrigger asChild>
        <Button variant="gradient" className="fixed bottom-4 right-4 z-50 shadow-lg px-6 py-3 rounded-full text-lg">
          Betslip ({selections.length})
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-w-lg mx-auto w-full">
        <DrawerHeader>
          <DrawerTitle>Betslip</DrawerTitle>
          <DrawerDescription>
            {selections.length === 0 ? 'No selections yet. Add bets to your betslip.' : 'Review your selections and place your multi-bet.'}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 py-2 space-y-3">
          {selections.map(sel => (
            <div key={sel.marketOptionId} className="flex items-center justify-between border-b py-2">
              <div>
                <div className="font-semibold text-primary">{sel.gameLabel}</div>
                <div className="text-sm text-muted-foreground">{sel.marketName}: <span className="font-bold">{sel.label}</span></div>
                <div className="text-xs text-muted-foreground">Odds: <span className="font-bold">{sel.odds}</span></div>
              </div>
              <Button size="sm" variant="outline" onClick={() => removeSelection(sel.marketOptionId)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
        {selections.length > 0 && (
          <div className="px-4 py-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Combined Odds:</span>
              <span className="font-bold text-success">{combinedOdds.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Stake (KES):</span>
              <input
                type="number"
                min="10"
                className="border rounded px-2 py-1 w-24 text-right"
                value={stake}
                onChange={e => setStake(e.target.value)}
                placeholder="Enter stake"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Potential Winnings:</span>
              <span className="font-bold text-primary">KES {potentialWinnings.toFixed(2)}</span>
            </div>
            {(placing || !user || !stake || isNaN(Number(stake)) || Number(stake) < 10 || Number(stake) > (user?.walletBalance ?? 0) || selections.length === 0) ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="gradient"
                        className="w-full mt-2"
                        disabled
                      >
                        {placing ? 'Placing...' : 'Place Multi-Bet'}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {!user ? 'Login to place bets' :
                      !stake || isNaN(Number(stake)) || Number(stake) < 10 ? 'Enter a valid stake (min 10 KES)' :
                      Number(stake) > (user?.walletBalance ?? 0) ? 'Insufficient wallet balance' :
                      selections.length === 0 ? 'Add at least one selection to your betslip' : ''}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                variant="gradient"
                className="w-full mt-2"
                onClick={handlePlaceMultiBet}
              >
                {placing ? 'Placing...' : 'Place Multi-Bet'}
              </Button>
            )}
            <Button variant="outline" className="w-full mt-1" onClick={clearBetslip} disabled={placing}>
              Clear Betslip
            </Button>
          </div>
        )}
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="ghost" className="w-full">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}; 