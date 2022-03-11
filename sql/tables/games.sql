-- Games Table (Just gives logistical information about the game)
CREATE TABLE "chathamabate/jdg"."games" (
    gid INTEGER, 
    league_match BOOLEAN DEFAULT FALSE,
    game_start TIMESTAMP,
    loc VARCHAR(255),

    CONSTRAINT games_pkey PRIMARY KEY (gid),
    CONSTRAINT positive_gid CHECK(gid >= 0)
);

-- Insert First Game.
-- INSERT INTO "chathamabate/jdg"."games" (gid, league_match, game_start, loc)
-- VALUES (0, TRUE, '3-23-2022 10:00 PM', 'Jones');

-- Insert Arbitrary League Match.
-- INSERT INTO "chathamabate/jdg"."games" (gid, league_match, game_start, loc)
-- VALUES 
--     ((SELECT MAX(gid) + 1 FROM "chathamabate/jdg"."games"), TRUE, '3-23-2022 10:00 PM', 'Jones');
