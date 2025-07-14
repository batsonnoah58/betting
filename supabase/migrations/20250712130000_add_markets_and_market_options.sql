-- Add markets table
create table if not exists public.markets (
  id serial primary key,
  game_id BIGINT references games(id) on delete cascade,
  type text not null, -- e.g. '1st_half_total', '1st_goal', 'multigoals'
  name text not null, -- e.g. '1st Half - Total'
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Add market_options table
create table if not exists public.market_options (
  id serial primary key,
  market_id BIGINT references markets(id) on delete cascade,
  label text not null, -- e.g. 'Over 0.5', 'Under 0.5', '1-2', 'None', etc.
  odds numeric(8,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
); 