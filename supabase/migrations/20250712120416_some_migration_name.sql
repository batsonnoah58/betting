-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for game status
CREATE TYPE public.game_status AS ENUM ('upcoming', 'live', 'finished');

-- Create enum for game result
CREATE TYPE public.game_result AS ENUM ('home_win', 'draw', 'away_win', 'pending');

-- Create enum for bet status
CREATE TYPE public.bet_status AS ENUM ('active', 'won', 'lost');

-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  wallet_balance NUMERIC DEFAULT 0 NOT NULL,
  daily_access_granted_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create leagues table
CREATE TABLE public.leagues (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create teams table
CREATE TABLE public.teams (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  league_id BIGINT REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  logo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create games table
CREATE TABLE public.games (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  home_team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  away_team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  league_id BIGINT REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  kick_off_time TIMESTAMP WITH TIME ZONE NOT NULL,
  odds_home NUMERIC,
  odds_draw NUMERIC,
  odds_away NUMERIC,
  status game_status DEFAULT 'upcoming' NOT NULL,
  result game_result DEFAULT 'pending' NOT NULL,
  confidence TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bets table
CREATE TABLE public.bets (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  game_id BIGINT REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  stake NUMERIC NOT NULL CHECK (stake > 0),
  bet_on game_result NOT NULL,
  odds NUMERIC NOT NULL,
  status bet_status DEFAULT 'active' NOT NULL,
  potential_winnings NUMERIC NOT NULL,
  placed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table for wallet history
CREATE TABLE public.transactions (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'deposit', 'bet_placed', 'bet_won', 'subscription'
  amount NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create RLS policies for leagues (publicly readable, admin manageable)
CREATE POLICY "Anyone can view leagues" 
ON public.leagues 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage leagues" 
ON public.leagues 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create RLS policies for teams (publicly readable, admin manageable)
CREATE POLICY "Anyone can view teams" 
ON public.teams 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage teams" 
ON public.teams 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create RLS policies for games (publicly readable, admin manageable)
CREATE POLICY "Anyone can view games" 
ON public.games 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage games" 
ON public.games 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create RLS policies for bets
CREATE POLICY "Users can view their own bets" 
ON public.bets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can place their own bets" 
ON public.bets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bets" 
ON public.bets 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update bet status" 
ON public.bets 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

-- Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions" 
ON public.transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" 
ON public.transactions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, wallet_balance)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    0
  );
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function: credit_wallet_on_bet_win
CREATE OR REPLACE FUNCTION public.credit_wallet_on_bet_win()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if status changed to 'won' and was not 'won' before
  IF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
    -- Credit the user's wallet with potential winnings
    UPDATE public.profiles
      SET wallet_balance = wallet_balance + NEW.potential_winnings
      WHERE id = NEW.user_id;
    -- Insert a transaction record
    INSERT INTO public.transactions (user_id, type, amount, description)
      VALUES (NEW.user_id, 'bet_won', NEW.potential_winnings, 'Bet won payout');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: credit_wallet_on_bet_win
CREATE TRIGGER credit_wallet_on_bet_win
AFTER UPDATE OF status ON public.bets
FOR EACH ROW
WHEN (NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won')
EXECUTE FUNCTION public.credit_wallet_on_bet_win();

-- Insert sample data
INSERT INTO public.leagues (name) VALUES 
  ('Premier League'),
  ('La Liga'),
  ('Bundesliga'),
  ('Serie A'),
  ('Ligue 1');

INSERT INTO public.teams (name, league_id, logo) VALUES
  ('Manchester United', 1, '🔴'),
  ('Arsenal', 1, '🔴'),
  ('Barcelona', 2, '🔵'),
  ('Real Madrid', 2, '⚪'),
  ('Bayern Munich', 3, '🔴'),
  ('Borussia Dortmund', 3, '🟡'),
  ('Juventus', 4, '⚫'),
  ('AC Milan', 4, '🔴');

INSERT INTO public.games (home_team_id, away_team_id, league_id, kick_off_time, odds_home, odds_draw, odds_away, confidence) VALUES
  (1, 2, 1, '2024-07-13T15:00:00Z', 2.4, 3.2, 2.8, 'high'),
  (3, 4, 2, '2024-07-13T18:30:00Z', 2.1, 3.5, 3.2, 'very-high'),
  (5, 6, 3, '2024-07-13T16:30:00Z', 1.8, 3.8, 4.2, 'medium'),
  (7, 8, 4, '2024-07-13T19:45:00Z', 2.2, 3.1, 3.4, 'high');