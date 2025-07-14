alter table "public"."market_options" alter column "market_id" set data type integer using "market_id"::integer;

alter table "public"."markets" alter column "game_id" set data type integer using "game_id"::integer;


