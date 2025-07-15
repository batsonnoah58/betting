import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface MobileGameCardProps {
  game: {
    id: number;
    homeTeam: { name: string; logo: string };
    awayTeam: { name: string; logo: string };
    league: string;
    kickOffTime: string;
    odds: { home: number; draw: number; away: number };
    status: string;
    confidence: string;
  };
  onBetslipClick: () => void;
  onDetailsClick: () => void;
}

export const MobileGameCard: React.FC<MobileGameCardProps> = ({
  game,
  onBetslipClick,
  onDetailsClick,
}) => {
  const isLive = game.status === 'live';
  const isUpcoming = game.status === 'upcoming';

  return (
    <Card className="relative overflow-hidden bg-card border border-border text-foreground">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-foreground">{game.league}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(game.kickOffTime).toLocaleDateString()}
            </span>
          </div>
          <span className={`text-xs font-medium ${
            isLive ? 'text-primary' : isUpcoming ? 'text-success' : 'text-muted-foreground'
          }`}>
            {isLive ? 'LIVE' : isUpcoming ? 'UPCOMING' : 'FINISHED'}
          </span>
        </div>

        {/* Teams */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <img
              src={game.homeTeam.logo}
              alt={game.homeTeam.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="font-semibold">{game.homeTeam.name}</span>
          </div>
          <div className="text-2xl font-bold">vs</div>
          <div className="flex items-center space-x-3">
            <span className="font-semibold">{game.awayTeam.name}</span>
            <img
              src={game.awayTeam.logo}
              alt={game.awayTeam.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          </div>
        </div>

        {/* Odds */}
        <div className="grid grid-cols-3 gap-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-center"
            onClick={onBetslipClick}
          >
            <span className="text-sm">{game.odds.home}</span>
            <span className="text-xs">HOME</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-center"
            onClick={onBetslipClick}
          >
            <span className="text-sm">{game.odds.draw}</span>
            <span className="text-xs">DRAW</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-center"
            onClick={onBetslipClick}
          >
            <span className="text-sm">{game.odds.away}</span>
            <span className="text-xs">AWAY</span>
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex justify-between">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={onDetailsClick}
          >
            <ChevronRight className="h-4 w-4 mr-2" />
            Details
          </Button>
          <Button
            variant="gradient"
            size="sm"
            className="flex-1"
            onClick={onBetslipClick}
          >
            Add to Betslip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
