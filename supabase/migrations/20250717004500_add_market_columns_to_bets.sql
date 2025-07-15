-- Add market_id and market_option_id columns to bets table
ALTER TABLE bets
ADD COLUMN market_id integer,
ADD COLUMN market_option_id integer; 