import React, { useState, useEffect } from 'react';
import Header from '../components/layout/Header';
import { BottomNav } from '../components/layout/BottomNav';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { GameCard } from '../components/games/GameCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs } from '../components/ui/tabs';

const Live = () => {
  const { user } = useAuth();
  const [games, setGames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLiveGames();
  }, []);

  const fetchLiveGames = async () => {
    setIsLoading(true);
    setError(null);
    try {
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
        .eq('status', 'live')
        .order('kick_off_time', { ascending: true });

      if (gamesError) {
        setError('Failed to load live games. Please try again.');
        return;
      }

      const transformedGames = gamesData?.map(game => ({
        id: game.id,
        homeTeam: {
          id: game.home_team.id,
          name: game.home_team.name,
          logo: game.home_team.logo,
        },
        awayTeam: {
          id: game.away_team.id,
          name: game.away_team.name,
          logo: game.away_team.logo,
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
    } catch (err) {
      setError('Failed to load live games. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5 pb-16">
      <Header />
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 max-w-2xl">
        <Card className="shadow-betting mb-4">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-2xl">
              <span>Live Games</span>
            </CardTitle>
          </CardHeader>
        </Card>
        {isLoading ? (
          <Card className="shadow-betting">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">Loading live games...</span>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="shadow-betting">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-8">
                <div className="text-destructive mb-2">{error}</div>
                <button onClick={fetchLiveGames} className="text-primary underline">Try Again</button>
              </div>
            </CardContent>
          </Card>
        ) : games.length === 0 ? (
          <Card className="shadow-betting">
            <CardContent className="p-4 sm:p-6">
              <div className="text-center py-8">
                <div className="text-muted-foreground mb-2 text-lg">No live games at the moment.<br/>Please check back later.</div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </main>
      <BottomNav user={user} onBetslipClick={() => {}} />
    </div>
  );
};

export default Live; 