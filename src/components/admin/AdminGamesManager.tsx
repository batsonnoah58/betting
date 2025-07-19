/*
AdminGamesManager Usage Guide:
- View all games and expand to manage markets and market options for each game.
- Add, edit, or delete markets (e.g., '1st Half - Total', '1st Goal', 'Multigoals').
- Add, edit, or delete market options and odds for each market.
- All changes are live and update the database via Supabase.
- Use the admin dashboard link labeled 'Manage Markets & Odds' to access this tool.
*/
import React, { useEffect, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { useToast } from '../ui/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Team { id: number; name: string; logo?: string; }
interface League { id: number; name: string; }
interface Game {
  id: number;
  home_team_id: number;
  away_team_id: number;
  league_id: number;
  kick_off_time: string;
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
  status: string;
}
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

interface GameWithRelations extends Game {
  home_team: Team;
  away_team: Team;
  league: League;
}

interface GameEvent {
  id: number;
  game_id: number;
  minute: number;
  scorer?: string;
  type: string;
  created_at: string;
}

function isErrorWithMessage(err: unknown): err is { message: string } {
  return typeof err === 'object' && err !== null && 'message' in err && typeof (err as { message?: unknown }).message === 'string';
}

export const AdminGamesManager: React.FC = () => {
  const [games, setGames] = useState<GameWithRelations[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameWithRelations | null>(null);

  // Form state
  const [form, setForm] = useState<Partial<Game>>({});
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [marketFormError, setMarketFormError] = useState<string | null>(null);
  const [optionFormError, setOptionFormError] = useState<string | null>(null);

  // Expandable row state
  const [expandedGameId, setExpandedGameId] = useState<number | null>(null);
  const [marketsByGame, setMarketsByGame] = useState<Record<number, Market[]>>({});
  const [marketOptionsByMarket, setMarketOptionsByMarket] = useState<Record<number, MarketOption[]>>({});
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);

  // Add Dialog imports for market and option CRUD
  const [showMarketDialog, setShowMarketDialog] = useState(false);
  const [marketDialogMode, setMarketDialogMode] = useState<'add' | 'edit'>('add');
  const [marketForm, setMarketForm] = useState<Partial<Market>>({});
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [showDeleteMarket, setShowDeleteMarket] = useState(false);

  const [showOptionDialog, setShowOptionDialog] = useState(false);
  const [optionDialogMode, setOptionDialogMode] = useState<'add' | 'edit'>('add');
  const [optionForm, setOptionForm] = useState<Partial<MarketOption>>({});
  const [selectedOption, setSelectedOption] = useState<MarketOption | null>(null);
  const [showDeleteOption, setShowDeleteOption] = useState(false);

  // Add state for event dialog
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [eventDialogMode, setEventDialogMode] = useState<'add' | 'edit'>('add');
  const [eventForm, setEventForm] = useState<Partial<GameEvent>>({});
  const [selectedEvent, setSelectedEvent] = useState<GameEvent | null>(null);
  const [showDeleteEvent, setShowDeleteEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Move fetchAll here so it is in scope
  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      // Fetch games with team and league info
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          id, kick_off_time, odds_home, odds_draw, odds_away, status,
          home_team:teams!games_home_team_id_fkey(id, name),
          away_team:teams!games_away_team_id_fkey(id, name),
          league:leagues(id, name),
          home_team_id, away_team_id, league_id
        `)
        .order('kick_off_time', { ascending: true });
      if (gamesError) { console.error('Games fetch error:', gamesError); throw gamesError; }
      setGames(gamesData || []);

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name');
      if (teamsError) { console.error('Teams fetch error:', teamsError); throw teamsError; }
      setTeams(teamsData || []);

      // Fetch leagues
      const { data: leaguesData, error: leaguesError } = await supabase
        .from('leagues')
        .select('id, name');
      if (leaguesError) { console.error('Leagues fetch error:', leaguesError); throw leaguesError; }
      setLeagues(leaguesData || []);
    } catch (err: unknown) {
      if (isErrorWithMessage(err)) {
        setError(err.message);
      } else {
        setError('Failed to fetch data');
      }
      // Log error for debugging
      console.error('fetchAll error:', err);
    } finally {
      setLoading(false);
    }
  }

  // 1. Ensure fetchAll is called on mount
  useEffect(() => {
    fetchAll();
  }, []);

  // Fetch markets for a game with React Query
  const useMarkets = (gameId: number) =>
    useQuery<Market[], Error>({
      queryKey: ['admin-markets', gameId],
      queryFn: async () => {
        const { data, error } = await supabase.from('markets').select('*').eq('game_id', gameId);
        if (error) throw error;
        return data || [];
      },
      enabled: !!gameId,
    });

  // At the top level, fetch all events:
  const { data: allEvents = [], isLoading: eventsLoading } = useQuery<GameEvent[], Error>({
    queryKey: ['admin-game-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('game_events').select('*').order('minute');
      if (error) throw error;
      return data || [];
    },
  });
  // Group events by game_id
  const eventsByGame: Record<number, GameEvent[]> = {};
  (allEvents as GameEvent[]).forEach(event => {
    if (!eventsByGame[event.game_id]) eventsByGame[event.game_id] = [];
    eventsByGame[event.game_id].push(event);
  });

  // Fetch all market options for the expanded game when expandedGameId changes
  useEffect(() => {
    if (expandedGameId && marketsByGame[expandedGameId]) {
      setOptionsLoading(true);
      const marketIds = (marketsByGame[expandedGameId] || []).map(m => m.id);
      if (marketIds.length === 0) {
        setMarketOptionsByMarket({});
        setOptionsLoading(false);
        return;
      }
      supabase.from('market_options').select('*').in('market_id', marketIds).then(({ data, error }) => {
        if (!error && data) {
          const grouped: Record<number, MarketOption[]> = {};
          data.forEach(opt => {
            if (!grouped[opt.market_id]) grouped[opt.market_id] = [];
            grouped[opt.market_id].push(opt);
          });
          setMarketOptionsByMarket(grouped);
        }
        setOptionsLoading(false);
      });
    }
  }, [expandedGameId, marketsByGame]);

  // Mutations for market CRUD
  const addMarketMutation = useMutation({
    mutationFn: async (payload: { game_id: number; name: string; type: string }) => {
      const { error } = await supabase.from('markets').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Market added' });
      queryClient.invalidateQueries({ queryKey: ['admin-markets', variables.game_id] });
      setShowMarketDialog(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to add market', variant: 'destructive' });
    },
  });
  const editMarketMutation = useMutation({
    mutationFn: async (payload: { id: number; name: string; type: string; game_id: number }) => {
      const { id, name, type } = payload;
      const { error } = await supabase.from('markets').update({ name, type }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Market updated' });
      queryClient.invalidateQueries({ queryKey: ['admin-markets', variables.game_id] });
      setShowMarketDialog(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to update market', variant: 'destructive' });
    },
  });
  const deleteMarketMutation = useMutation({
    mutationFn: async (payload: { id: number; game_id: number }) => {
      const { id } = payload;
      const { error } = await supabase.from('markets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Market deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-markets', variables.game_id] });
      setShowDeleteMarket(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete market', variant: 'destructive' });
    },
  });

  // Mutations for market option CRUD
  const addOptionMutation = useMutation({
    mutationFn: async (payload: { market_id: number; label: string; odds: number }) => {
      const { error } = await supabase.from('market_options').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Option added' });
      queryClient.invalidateQueries({ queryKey: ['admin-market-options', variables.market_id] });
      setShowOptionDialog(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to add option', variant: 'destructive' });
    },
  });
  const editOptionMutation = useMutation({
    mutationFn: async (payload: { id: number; market_id: number; label: string; odds: number }) => {
      const { id, label, odds } = payload;
      const { error } = await supabase.from('market_options').update({ label, odds }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Option updated' });
      queryClient.invalidateQueries({ queryKey: ['admin-market-options', variables.market_id] });
      setShowOptionDialog(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to update option', variant: 'destructive' });
    },
  });
  const deleteOptionMutation = useMutation({
    mutationFn: async (payload: { id: number; market_id: number }) => {
      const { id } = payload;
      const { error } = await supabase.from('market_options').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Option deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-market-options', variables.market_id] });
      setShowDeleteOption(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete option', variant: 'destructive' });
    },
  });

  // Mutations for event CRUD
  const addEventMutation = useMutation({
    mutationFn: async (payload: { game_id: number; minute: number; scorer?: string; type: string }) => {
      const { error } = await supabase.from('game_events').insert(payload);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Event added' });
      queryClient.invalidateQueries({ queryKey: ['admin-game-events', variables.game_id] });
      setShowEventDialog(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to add event', variant: 'destructive' });
    },
  });
  const editEventMutation = useMutation({
    mutationFn: async (payload: { id: number; game_id: number; minute: number; scorer?: string; type: string }) => {
      const { id, ...fields } = payload;
      const { error } = await supabase.from('game_events').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Event updated' });
      queryClient.invalidateQueries({ queryKey: ['admin-game-events', variables.game_id] });
      setShowEventDialog(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to update event', variant: 'destructive' });
    },
  });
  const deleteEventMutation = useMutation({
    mutationFn: async (payload: { id: number; game_id: number }) => {
      const { id } = payload;
      const { error } = await supabase.from('game_events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: 'Event deleted' });
      queryClient.invalidateQueries({ queryKey: ['admin-game-events', variables.game_id] });
      setShowDeleteEvent(false);
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message || 'Failed to delete event', variant: 'destructive' });
    },
  });

  // Handlers for add/edit/delete
  const openAdd = () => {
    setForm({});
    setFormError(null);
    setShowAdd(true);
  };
  const openEdit = (game: GameWithRelations) => {
    setSelectedGame(game);
    setForm({
      id: game.id,
      home_team_id: game.home_team_id,
      away_team_id: game.away_team_id,
      league_id: game.league_id,
      kick_off_time: game.kick_off_time,
      odds_home: game.odds_home,
      odds_draw: game.odds_draw,
      odds_away: game.odds_away,
      status: game.status,
    });
    setFormError(null);
    setShowEdit(true);
  };
  const openDelete = (game: GameWithRelations) => {
    setSelectedGame(game);
    setShowDelete(true);
  };

  // Add game
  const handleAdd = async () => {
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('games').insert({
        home_team_id: Number(form.home_team_id),
        away_team_id: Number(form.away_team_id),
        league_id: Number(form.league_id),
        kick_off_time: form.kick_off_time,
        odds_home: form.odds_home !== undefined ? Number(form.odds_home) : null,
        odds_draw: form.odds_draw !== undefined ? Number(form.odds_draw) : null,
        odds_away: form.odds_away !== undefined ? Number(form.odds_away) : null,
        status: (form.status as 'upcoming' | 'live' | 'finished') || 'upcoming',
      });
      if (error) throw error;
      setShowAdd(false);
      fetchAll();
    } catch (err: unknown) {
      if (isErrorWithMessage(err)) {
        setFormError(err.message);
      } else {
        setFormError('Failed to add game');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Edit game
  const handleEdit = async () => {
    if (!selectedGame) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('games').update({
        home_team_id: Number(form.home_team_id),
        away_team_id: Number(form.away_team_id),
        league_id: Number(form.league_id),
        kick_off_time: form.kick_off_time,
        odds_home: form.odds_home !== undefined ? Number(form.odds_home) : null,
        odds_draw: form.odds_draw !== undefined ? Number(form.odds_draw) : null,
        odds_away: form.odds_away !== undefined ? Number(form.odds_away) : null,
        status: form.status as 'upcoming' | 'live' | 'finished',
      }).eq('id', selectedGame.id);
      if (error) throw error;
      setShowEdit(false);
      fetchAll();
    } catch (err: unknown) {
      if (isErrorWithMessage(err)) {
        setFormError(err.message);
      } else {
        setFormError('Failed to update game');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Delete game
  const handleDelete = async () => {
    if (!selectedGame) return;
    setFormLoading(true);
    setFormError(null);
    try {
      const { error } = await supabase.from('games').delete().eq('id', selectedGame.id);
      if (error) throw error;
      setShowDelete(false);
      fetchAll();
    } catch (err: unknown) {
      if (isErrorWithMessage(err)) {
        setFormError(err.message);
      } else {
        setFormError('Failed to delete game');
      }
    } finally {
      setFormLoading(false);
    }
  };

  // Form field change
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Market CRUD handlers
  const openAddMarket = (gameId: number) => {
    setMarketDialogMode('add');
    setMarketForm({ game_id: gameId });
    setSelectedMarket(null);
    setShowMarketDialog(true);
  };
  const openEditMarket = (market: Market) => {
    setMarketDialogMode('edit');
    setMarketForm({ ...market });
    setSelectedMarket(market);
    setMarketFormError(null);
    setShowMarketDialog(true);
  };
  const openDeleteMarket = (market: Market) => {
    setSelectedMarket(market);
    setShowDeleteMarket(true);
  };
  const handleMarketFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setMarketForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleMarketSubmit = async () => {
    if (!marketForm.name || !marketForm.type) {
      setMarketFormError('Name and type are required');
      return;
    }
    setMarketFormError(null);
    try {
      if (marketDialogMode === 'add') {
        await addMarketMutation.mutateAsync({
          game_id: marketForm.game_id!,
          name: marketForm.name,
          type: marketForm.type,
        });
      } else if (marketDialogMode === 'edit' && selectedMarket) {
        await editMarketMutation.mutateAsync({
          id: selectedMarket.id,
          name: marketForm.name,
          type: marketForm.type,
          game_id: selectedMarket.game_id,
        });
      }
      setMarketForm({});
      setSelectedMarket(null);
      setMarketFormError(null);
    } catch (err) {
      // error handled by mutation
    }
  };
  const handleDeleteMarket = async () => {
    if (!selectedMarket) return;
    try {
      await deleteMarketMutation.mutateAsync({ id: selectedMarket.id, game_id: selectedMarket.game_id });
    } catch (err: unknown) {
      if (isErrorWithMessage(err)) {
        setMarketFormError(err.message);
      } else {
        setMarketFormError('Failed to delete market');
      }
    }
  };
  // Option CRUD handlers
  const openAddOption = (marketId: number) => {
    setOptionDialogMode('add');
    setOptionForm({ market_id: marketId });
    setSelectedOption(null);
    setShowOptionDialog(true);
  };
  const openEditOption = (option: MarketOption) => {
    setOptionDialogMode('edit');
    setOptionForm({ ...option });
    setSelectedOption(option);
    setShowOptionDialog(true);
  };
  const openDeleteOption = (option: MarketOption) => {
    setSelectedOption(option);
    setShowDeleteOption(true);
  };
  const handleOptionFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOptionForm((prev) => ({ ...prev, [name]: value }));
  };
  const handleOptionSubmit = async () => {
    if (!optionForm.market_id || !optionForm.label || isNaN(Number(optionForm.odds))) {
      setOptionFormError('Label and valid odds are required');
      return;
    }
    setOptionFormError(null);
    try {
      if (optionDialogMode === 'add') {
        await addOptionMutation.mutateAsync({
          market_id: optionForm.market_id,
          label: optionForm.label,
          odds: Number(optionForm.odds),
        });
      } else if (optionDialogMode === 'edit' && selectedOption) {
        await editOptionMutation.mutateAsync({
          id: selectedOption.id,
          market_id: selectedOption.market_id,
          label: optionForm.label,
          odds: Number(optionForm.odds),
        });
      }
      setOptionForm({});
      setSelectedOption(null);
      setOptionFormError(null);
    } catch (err) {
      // error handled by mutation
    }
  };
  const handleDeleteOption = async () => {
    if (!selectedOption) return;
    try {
      await deleteOptionMutation.mutateAsync({ id: selectedOption.id, market_id: selectedOption.market_id });
    } catch (err: unknown) {
      if (isErrorWithMessage(err)) {
        setOptionFormError(err.message);
      } else {
        setOptionFormError('Failed to delete option');
      }
    }
  };

  // Handlers for event CRUD
  const openAddEvent = (gameId: number) => {
    setEventDialogMode('add');
    setEventForm({ game_id: gameId, type: 'goal' });
    setSelectedEvent(null);
    setEventFormError(null);
    setShowEventDialog(true);
  }
  function openEditEvent(event: GameEvent) {
    setEventDialogMode('edit');
    setEventForm({ ...event });
    setSelectedEvent(event);
    setEventFormError(null);
    setShowEventDialog(true);
  }
  function openDeleteEvent(event: GameEvent) {
    setSelectedEvent(event);
    setShowDeleteEvent(true);
  }
  function handleEventFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
  }
  async function handleEventSubmit() {
    if (!eventForm.game_id || !eventForm.minute || !eventForm.type) {
      setEventFormError('Minute and type are required');
      return;
    }
    setEventFormError(null);
    try {
      if (eventDialogMode === 'add') {
        await addEventMutation.mutateAsync({
          game_id: eventForm.game_id,
          minute: Number(eventForm.minute),
          scorer: eventForm.scorer,
          type: eventForm.type,
        });
      } else if (eventDialogMode === 'edit' && selectedEvent) {
        await editEventMutation.mutateAsync({
          id: selectedEvent.id,
          game_id: selectedEvent.game_id,
          minute: Number(eventForm.minute),
          scorer: eventForm.scorer,
          type: eventForm.type,
        });
      }
      setEventForm({});
      setSelectedEvent(null);
      setEventFormError(null);
    } catch (err) {
      // error handled by mutation
    }
  }
  async function handleDeleteEvent() {
    if (!selectedEvent) return;
    try {
      await deleteEventMutation.mutateAsync({ id: selectedEvent.id, game_id: selectedEvent.game_id });
    } catch (err) {
      // error handled by mutation
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Games</h2>
        <Button variant="gradient" onClick={openAdd}>Add Game</Button>
      </div>
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg mb-2 text-destructive text-center">{error}</div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading games...</span>
        </div>
      ) : (
        <div className="overflow-x-auto w-full">  {/* Added for mobile responsiveness */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Home Team</TableHead>
                <TableHead>Away Team</TableHead>
                <TableHead>League</TableHead>
                <TableHead>Kickoff</TableHead>
                <TableHead>Odds (H/D/A)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">No games yet.</TableCell>
                </TableRow>
              ) : (
                games.map((game) => (
                  <React.Fragment key={game.id}>
                    <TableRow>
                      <TableCell>{game.id}</TableCell>
                      <TableCell>{game.home_team.logo ? <img src={game.home_team.logo} alt={game.home_team.name} className="inline-block h-6 w-6 object-contain mr-2" /> : '⚽'} {game.home_team.name}</TableCell>
                      <TableCell>{game.away_team.logo ? <img src={game.away_team.logo} alt={game.away_team.name} className="inline-block h-6 w-6 object-contain mr-2" /> : '⚽'} {game.away_team.name}</TableCell>
                      <TableCell>{game.league?.name}</TableCell>
                      <TableCell>{game.kick_off_time}</TableCell>
                      <TableCell>{game.odds_home} / {game.odds_draw} / {game.odds_away}</TableCell>
                      <TableCell>{game.status}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => openEdit(game)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => openDelete(game)} className="ml-2">Delete</Button>
                        <Button size="sm" variant="secondary" className="ml-2" onClick={() => {
                          setExpandedGameId(expandedGameId === game.id ? null : game.id);
                          if (expandedGameId !== game.id) {
                            // Invalidate markets and options for the expanded game
                            queryClient.invalidateQueries({ queryKey: ['admin-markets', game.id] });
                            queryClient.invalidateQueries({ queryKey: ['admin-market-options', game.id] });
                          }
                        }}>
                          {expandedGameId === game.id ? 'Hide Markets' : 'Manage Markets'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedGameId === game.id && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted p-0">
                          <Accordion type="single" collapsible defaultValue={undefined}>
                            <AccordionItem value={`markets-${game.id}`}>
                              <AccordionTrigger>Markets for this Game</AccordionTrigger>
                              <AccordionContent>
                                <Button size="sm" variant="outline" onClick={() => openAddMarket(game.id)} className="mb-2">Add Market</Button>
                                {marketsLoading ? (
                                  <div className="py-4 text-center">Loading markets...</div>
                                ) : (
                                  <div>
                                    {(marketsByGame[game.id] || []).length === 0 ? (
                                      <div className="py-2">No markets for this game yet.</div>
                                    ) : (
                                      <ul>
                                        {(marketsByGame[game.id] || []).map((market) => (
                                          <li key={market.id} className="mb-2">
                                            <div className="flex items-center gap-2 font-semibold">
                                              {market.name} <span className="text-xs text-muted-foreground">({market.type})</span>
                                              <Button size="sm" variant="outline" onClick={() => openEditMarket(market)}>Edit Market</Button>
                                              <Button size="sm" variant="destructive" onClick={() => openDeleteMarket(market)}>Delete</Button>
                                              <Button size="sm" variant="secondary" onClick={() => openAddOption(market.id)}>Add Option</Button>
                                            </div>
                                            <div className="ml-4">
                                              <div className="font-medium">Options:</div>
                                              {optionFormError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{optionFormError}</div>}
                                              {optionsLoading ? (
                                                <div className="py-4 text-center">Loading options...</div>
                                              ) : (
                                                <ul>
                                                  {(marketOptionsByMarket[market.id] || []).map((opt) => (
                                                    <li key={opt.id} className="flex items-center gap-2">
                                                      <span>{opt.label}</span>
                                                      <span className="text-xs text-muted-foreground">@ {opt.odds}</span>
                                                      <Button size="sm" variant="outline" onClick={() => openEditOption(opt)}>Edit</Button>
                                                      <Button size="sm" variant="destructive" onClick={() => openDeleteOption(opt)}>Delete</Button>
                                                    </li>
                                                  ))}
                                                </ul>
                                              )}
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value={`events-${game.id}`}>
                              <AccordionTrigger>Goal Events for this Game</AccordionTrigger>
                              <AccordionContent>
                                {eventsLoading ? (
                                  <div className="py-4 text-center">Loading events...</div>
                                ) : (
                                  <div>
                                    <Button size="sm" variant="outline" onClick={() => openAddEvent(game.id)} className="mb-2">Add Event</Button>
                                    <ul>
                                      {(eventsByGame[game.id] || []).map(event => (
                                        <li key={event.id} className="flex items-center gap-2">
                                          <span>{event.minute}'</span>
                                          <span>{event.scorer || 'Goal'}</span>
                                          <Button size="sm" variant="outline" onClick={() => openEditEvent(event)}>Edit</Button>
                                          <Button size="sm" variant="destructive" onClick={() => openDeleteEvent(event)}>Delete</Button>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Game Dialog */}
      {/* 3. Fix add game dialog open/close logic and form state */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) { setForm({}); setFormError(null); } }}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Game</DialogTitle>
            <DialogDescription>Fill in the details to add a new game.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleAdd(); }} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Home Team</Label>
                <select name="home_team_id" value={form.home_team_id || ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                  <option value="">Select</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <Label>Away Team</Label>
                <select name="away_team_id" value={form.away_team_id || ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                  <option value="">Select</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>League</Label>
              <select name="league_id" value={form.league_id || ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                <option value="">Select</option>
                {leagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Kickoff Time</Label>
              <Input name="kick_off_time" type="datetime-local" value={form.kick_off_time || ''} onChange={handleFormChange} required disabled={formLoading} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Odds Home</Label>
                <Input name="odds_home" type="number" step="0.01" value={form.odds_home || ''} onChange={handleFormChange} required disabled={formLoading} />
              </div>
              <div className="flex-1">
                <Label>Odds Draw</Label>
                <Input name="odds_draw" type="number" step="0.01" value={form.odds_draw || ''} onChange={handleFormChange} required disabled={formLoading} />
              </div>
              <div className="flex-1">
                <Label>Odds Away</Label>
                <Input name="odds_away" type="number" step="0.01" value={form.odds_away || ''} onChange={handleFormChange} required disabled={formLoading} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <select name="status" value={form.status || 'upcoming'} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="finished">Finished</option>
              </select>
            </div>
            {formError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAdd(false)} disabled={formLoading}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? (
                  <span className="flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Processing...</span>
                ) : (
                  'Add Game'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Game Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
            <DialogDescription>Update the details of this game.</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleEdit(); }} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Home Team</Label>
                <select name="home_team_id" value={form.home_team_id || ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                  <option value="">Select</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <Label>Away Team</Label>
                <select name="away_team_id" value={form.away_team_id || ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                  <option value="">Select</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>League</Label>
              <select name="league_id" value={form.league_id || ''} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                <option value="">Select</option>
                {leagues.map(league => <option key={league.id} value={league.id}>{league.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Kickoff Time</Label>
              <Input name="kick_off_time" type="datetime-local" value={form.kick_off_time || ''} onChange={handleFormChange} required disabled={formLoading} />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Odds Home</Label>
                <Input name="odds_home" type="number" step="0.01" value={form.odds_home || ''} onChange={handleFormChange} required disabled={formLoading} />
              </div>
              <div className="flex-1">
                <Label>Odds Draw</Label>
                <Input name="odds_draw" type="number" step="0.01" value={form.odds_draw || ''} onChange={handleFormChange} required disabled={formLoading} />
              </div>
              <div className="flex-1">
                <Label>Odds Away</Label>
                <Input name="odds_away" type="number" step="0.01" value={form.odds_away || ''} onChange={handleFormChange} required disabled={formLoading} />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <select name="status" value={form.status || 'upcoming'} onChange={handleFormChange} className="w-full border rounded p-2" disabled={formLoading}>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="halftime">Halftime</option>
                <option value="finished">Finished</option>
              </select>
            </div>
            {formError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{formError}</div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEdit(false)} disabled={formLoading}>Cancel</Button>
              <Button type="submit" disabled={formLoading} className="w-full">
                {formLoading ? (
                  <span className="flex items-center justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Processing...</span>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Game Dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Game</DialogTitle>
            <DialogDescription>Are you sure you want to delete this game? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          {formError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{formError}</div>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowDelete(false)} disabled={formLoading}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={formLoading}>{formLoading ? 'Deleting...' : 'Delete'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialogs for market and option add/edit/delete */}
      <Dialog open={showMarketDialog} onOpenChange={(open) => { setShowMarketDialog(open); if (!open) { setMarketForm({}); setSelectedMarket(null); setMarketFormError(null); } }}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{marketDialogMode === 'add' ? 'Add Market' : 'Edit Market'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input name="name" value={marketForm.name || ''} onChange={handleMarketFormChange} disabled={addMarketMutation.isPending || editMarketMutation.isPending} />
            <Label>Type</Label>
            <Input name="type" value={marketForm.type || ''} onChange={handleMarketFormChange} disabled={addMarketMutation.isPending || editMarketMutation.isPending} />
          </div>
          {marketFormError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{marketFormError}</div>}
          <DialogFooter>
            <form onSubmit={e => { e.preventDefault(); handleMarketSubmit(); }}>
              <Button type="submit" disabled={addMarketMutation.isPending || editMarketMutation.isPending}>{marketDialogMode === 'add' ? 'Add' : 'Update'}</Button>
              <DialogClose asChild><Button variant="secondary" disabled={addMarketMutation.isPending || editMarketMutation.isPending}>Cancel</Button></DialogClose>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteMarket} onOpenChange={setShowDeleteMarket}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Market</DialogTitle>
            <DialogDescription>Are you sure you want to delete this market?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteMarket} disabled={formLoading}>Delete</Button>
            <DialogClose asChild><Button variant="secondary" disabled={formLoading}>Cancel</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showOptionDialog} onOpenChange={(open) => { setShowOptionDialog(open); if (!open) { setOptionForm({}); setSelectedOption(null); setOptionFormError(null); } }}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{optionDialogMode === 'add' ? 'Add Option' : 'Edit Option'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Label</Label>
            <Input name="label" value={optionForm.label || ''} onChange={handleOptionFormChange} disabled={addOptionMutation.isPending || editOptionMutation.isPending} />
            <Label>Odds</Label>
            <Input name="odds" type="number" value={optionForm.odds || ''} onChange={handleOptionFormChange} disabled={addOptionMutation.isPending || editOptionMutation.isPending} />
          </div>
          {optionFormError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{optionFormError}</div>}
          <DialogFooter>
            <form onSubmit={e => { e.preventDefault(); handleOptionSubmit(); }}>
              <Button type="submit" disabled={addOptionMutation.isPending || editOptionMutation.isPending}>{optionDialogMode === 'add' ? 'Add' : 'Update'}</Button>
              <DialogClose asChild><Button variant="secondary" disabled={addOptionMutation.isPending || editOptionMutation.isPending}>Cancel</Button></DialogClose>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteOption} onOpenChange={setShowDeleteOption}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Option</DialogTitle>
            <DialogDescription>Are you sure you want to delete this option?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteOption} disabled={formLoading}>Delete</Button>
            <DialogClose asChild><Button variant="secondary" disabled={formLoading}>Cancel</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialogs for event add/edit/delete */}
      <Dialog open={showEventDialog} onOpenChange={(open) => { setShowEventDialog(open); if (!open) { setEventForm({}); setSelectedEvent(null); setEventFormError(null); } }}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{eventDialogMode === 'add' ? 'Add Event' : 'Edit Event'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Minute</Label>
            <Input name="minute" type="number" value={eventForm.minute || ''} onChange={handleEventFormChange} disabled={addEventMutation.isPending || editEventMutation.isPending} />
            <Label>Scorer (optional)</Label>
            <Input name="scorer" value={eventForm.scorer || ''} onChange={handleEventFormChange} disabled={addEventMutation.isPending || editEventMutation.isPending} />
            <Label>Type</Label>
            <select name="type" value={eventForm.type || ''} onChange={handleEventFormChange} disabled={addEventMutation.isPending || editEventMutation.isPending}>
              <option value="goal">Goal</option>
              <option value="yellow_card">Yellow Card</option>
              <option value="red_card">Red Card</option>
              <option value="substitution">Substitution</option>
              <option value="penalty">Penalty</option>
              <option value="other">Other</option>
            </select>
          </div>
          {eventFormError && <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-destructive text-sm mb-2">{eventFormError}</div>}
          <DialogFooter>
            <form onSubmit={e => { e.preventDefault(); handleEventSubmit(); }}>
              <Button type="submit" disabled={addEventMutation.isPending || editEventMutation.isPending}>{eventDialogMode === 'add' ? 'Add' : 'Update'}</Button>
              <DialogClose asChild><Button variant="secondary" disabled={addEventMutation.isPending || editEventMutation.isPending}>Cancel</Button></DialogClose>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteEvent} onOpenChange={setShowDeleteEvent}>
        <DialogContent className="w-full max-w-sm sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>Are you sure you want to delete this event?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleDeleteEvent} disabled={formLoading}>Delete</Button>
            <DialogClose asChild><Button variant="secondary" disabled={formLoading}>Cancel</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminGamesManager; 