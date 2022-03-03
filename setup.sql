
-- Players Table
CREATE TABLE "chathamabate/jdg"."players" (
    pid INTEGER, 
    firstname VARCHAR(255),
    lastname VARCHAR(255),
    college VARCHAR(255),
    birthday DATE,
    PRIMARY KEY (pid),
    CONSTRAINT positive_pid CHECK(pid >= 0)
);

-- Insert Root User (i.e. ME!)
-- INSERT INTO "chathamabate/jdg"."players" (pid, firstname, lastname, college, birthday)
-- VALUES (0, 'Chatham', 'Abate', 'McMurtry', '04-01-1999');

-- Insert Non Root User (i.e. Someone else)
-- INSERT INTO "chathamabate/jdg"."players" (pid, firstname, lastname, college, birthday)
-- VALUES 
--     ((SELECT MAX(pid) + 1 FROM "chathamabate/jdg"."players"),
--     'Anastasia', 'Alexander', 'McMurtry', '01-07-1999');



-- Games Table (Just gives logistical information about the game)
CREATE TABLE "chathamabate/jdg"."games" (
    gid INTEGER, 
    league_match BOOLEAN DEFAULT FALSE,
    game_start TIMESTAMP,
    loc VARCHAR(255),
    PRIMARY KEY (gid),
    CONSTRAINT positive_gid CHECK(gid >= 0)
);

-- Insert First Game.
-- INSERT INTO "chathamabate/jdg"."games" (gid, league_match, game_start, loc)
-- VALUES (0, TRUE, '3-23-2022 10:00 PM', 'Jones');

-- Insert Arbitrary League Match.
-- INSERT INTO "chathamabate/jdg"."games" (gid, league_match, game_start, loc)
-- VALUES 
--     ((SELECT MAX(gid) + 1 FROM "chathamabate/jdg"."games"), TRUE, '3-23-2022 10:00 PM', 'Jones');



-- This table describes which players played in which games
-- at what positions.
CREATE TABLE "chathamabate/jdg"."rosters" (
    gid INTEGER,
    pos INTEGER,
    pid INTEGER,
    PRIMARY KEY(gid, pos),

    CONSTRAINT game_exists
        FOREIGN KEY(gid) REFERENCES "chathamabate/jdg"."games"(gid),
    CONSTRAINT pos_is_valid
        CHECK(0 <= pos AND pos <= 3),
    CONSTRAINT player_exists
        FOREIGN KEY(pid) REFERENCES "chathamabate/jdg"."players"(pid)
);      


-- Turns Table
CREATE TABLE "chathamabate/jdg"."turns" (
    gid INTEGER,
    pos INTEGER,
    round_num INTEGER,
    bet INTEGER NOT NULL,
    earned INTEGER NOT NULL,
    PRIMARY KEY(gid, pos, round_num),

    CONSTRAINT game_and_turn_exist
        FOREIGN KEY(gid, pos) REFERENCES "chathamabate/jdg"."rosters"(gid, pos),
    CONSTRAINT valid_round
        CHECK(1 <= round_num AND round_num <= 25)

    -- Checks on bet and earned columns will occur through the use of a view... 
);

-- Table Drop Commands...
DROP TABLE "chathamabate/jdg"."turns";
DROP TABLE "chathamabate/jdg"."rosters";
DROP TABLE "chathamabate/jdg"."games";
DROP TABLE "chathamabate/jdg"."players";

-- Table Delete Commands...
DELETE FROM "chathamabate/jdg"."turns" WHERE 1=1;
DELETE FROM "chathamabate/jdg"."rosters" WHERE 1=1;
DELETE FROM "chathamabate/jdg"."games" WHERE 1=1;

-- Finally, we will need a view containing just complete games!