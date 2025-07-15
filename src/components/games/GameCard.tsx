import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Clock, ChevronDown, ChevronUp, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { useBetslip } from '../betslip/useBetslip';
import { TeamLogo } from './GameCard/TeamLogo';
import { BetButton } from './GameCard/BetButton';
import { MarketList } from './GameCard/MarketList';
import { BetConfirmationDialog } from './GameCard/BetConfirmationDialog';

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
  expanded?: boolean;
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

export const GameCard: React.FC<GameCardProps> = ({ game, expanded }) => {
  const [showMore, setShowMore] = React.useState(false);
  const { addSelection, isSelected } = useBetslip();

  const handleAddSelection = (type: 'home' | 'draw' | 'away') => {
    let label = '';
    let odds = 0;
    if (type === 'home') {
      label = 'Home';
      odds = game.odds.home;
    } else if (type === 'draw') {
      label = 'Draw';
      odds = game.odds.draw;
    } else {
      label = 'Away';
      odds = game.odds.away;
    }
    addSelection({
      marketOptionId: Number(`${game.id}${type}`), // unique per game+type
      gameId: game.id,
      marketId: 0, // 0 for main 1X2 market
      marketName: '1X2',
      label,
      odds,
      gameLabel: `${game.homeTeam.name} vs ${game.awayTeam.name}`,
    });
    toast.success('Bet added to your betslip! Open the Betslip icon to place your bets as a multi-bet or individually.');
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-card p-3 sm:p-4 mb-4 flex flex-col gap-2 sm:gap-3 text-foreground transition-all hover:shadow-lg w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-accent" />
          <span className="text-xs font-semibold text-foreground bg-muted px-2 py-0.5 rounded">Soccer</span>
        </div>
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{game.kickOffTime}</span>
        </div>
      </div>
      <div className="mb-2">
        <div className="font-bold text-foreground text-base leading-tight">{game.homeTeam.name}</div>
        <div className="font-bold text-foreground text-base leading-tight">{game.awayTeam.name}</div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <button className="flex-1 rounded-full bg-muted text-foreground font-semibold py-2 text-center transition-colors hover:bg-accent hover:text-accent-foreground" onClick={() => handleAddSelection('home')}>{game.odds.home}</button>
        <button className="flex-1 rounded-full bg-muted text-foreground font-semibold py-2 text-center transition-colors hover:bg-accent hover:text-accent-foreground" onClick={() => handleAddSelection('draw')}>{game.odds.draw}</button>
        <button className="flex-1 rounded-full bg-muted text-foreground font-semibold py-2 text-center transition-colors hover:bg-accent hover:text-accent-foreground" onClick={() => handleAddSelection('away')}>{game.odds.away}</button>
      </div>
      <div>
        <button
          className="text-accent text-xs flex items-center space-x-1 mt-1"
          onClick={() => setShowMore((v) => !v)}
        >
          <span>+25 More</span>
          {showMore ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {showMore && (
          <div className="mt-2 text-xs text-foreground bg-muted rounded p-2">More markets coming soon...</div>
        )}
      </div>
    </div>
  );
};