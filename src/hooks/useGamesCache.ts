import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Game {
  id: number;
  home_team: { name: string; logo: string };
  away_team: { name: string; logo: string };
  league: string;
  kick_off_time: string;
  odds: { home: number; draw: number; away: number };
  status: string;
  confidence: string;
}

interface GamesCache {
  data: Game[];
  loading: boolean;
  error: Error | null;
  timestamp: number;
}

interface SupabaseGameRow {
  id: number;
  home_team: { name: string; logo: string };
  away_team: { name: string; logo: string };
  league: { name: string } | null;
  kick_off_time: string;
  odds_home: number;
  odds_draw: number;
  odds_away: number;
  status: string;
  confidence: string;
}

export const useGamesCache = () => {
  const [cache, setCache] = useState<GamesCache>({
    data: [],
    loading: false,
    error: null,
    timestamp: 0,
  });

  const fetchGames = async () => {
    try {
      setCache(prev => ({ ...prev, loading: true }));
      
      const { data, error } = await supabase
        .from('games')
        .select(`
          id, kick_off_time, status, confidence,
          home_team:teams!games_home_team_id_fkey(id, name, logo),
          away_team:teams!games_away_team_id_fkey(id, name, logo),
          league:leagues(name),
          odds_home, odds_draw, odds_away
        `)
        .order('kick_off_time')
        .range(0, 20); // Initial page size

      if (error) throw error;

      setCache({
        data: (data as SupabaseGameRow[]).map((g) => ({
          id: g.id,
          home_team: g.home_team,
          away_team: g.away_team,
          league: g.league?.name || '',
          kick_off_time: g.kick_off_time,
          odds: { home: g.odds_home, draw: g.odds_draw, away: g.odds_away },
          status: g.status,
          confidence: g.confidence,
        })),
        loading: false,
        error: null,
        timestamp: Date.now(),
      });
    } catch (err) {
      setCache(prev => ({ ...prev, loading: false, error: err as Error }));
    }
  };

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return {
    games: cache.data,
    loading: cache.loading,
    error: cache.error,
    timestamp: cache.timestamp,
    fetchGames,
  };
};
