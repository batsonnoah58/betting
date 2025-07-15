-- Add result type and score fields to games table
ALTER TABLE games
  ADD COLUMN result_type TEXT CHECK (result_type IN ('half_time', 'full_time')) DEFAULT 'full_time',
  ADD COLUMN score_home_half INTEGER,
  ADD COLUMN score_away_half INTEGER,
  ADD COLUMN score_home_full INTEGER,
  ADD COLUMN score_away_full INTEGER; 