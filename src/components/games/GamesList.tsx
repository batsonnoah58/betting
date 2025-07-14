import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { GameCard } from './GameCard';
import { Calendar, Trophy, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

export const GamesList: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [leagues, setLeagues] = useState<string[]>(['all']);
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          logo: game.home_team.logo || '⚽'
        },
        awayTeam: {
          id: game.away_team.id,
          name: game.away_team.name,
          logo: game.away_team.logo || '⚽'
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
  
  const filteredGames = selectedLeague === 'all' 
    ? games 
    : games.filter(game => game.league === selectedLeague);

  const getConfidenceBadge = (confidence: string) => {
    const variants = {
      'very-high': { variant: 'default' as const, text: '🔥 VERY HIGH', className: 'bg-gradient-success' },
      'high': { variant: 'default' as const, text: '⭐ HIGH', className: 'bg-success' },
      'medium': { variant: 'secondary' as const, text: '📊 MEDIUM', className: '' }
    };
    return variants[confidence as keyof typeof variants] || variants.medium;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="shadow-betting">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span>Today's Sure Odds</span>
            <Badge variant="default" className="bg-gradient-primary">
              {filteredGames.length} Matches
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by league:</span>
            <div className="flex flex-wrap gap-2">
              {leagues.map((league) => (
                <Button
                  key={league}
                  variant={selectedLeague === league ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedLeague(league)}
                  className="text-xs"
                >
                  {league === 'all' ? 'All Leagues' : league}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">Loading games...</span>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="shadow-card">
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="text-destructive mb-2">{error}</div>
              <Button onClick={fetchGamesAndLeagues} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredGames.map((game, index) => (
            <div key={game.id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <GameCard game={game} />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !error && filteredGames.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No games found</h3>
            <p className="text-muted-foreground">
              No matches available for the selected league today.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};