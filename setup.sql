
-- Players Table
CREATE TABLE "chathamabate/jdg"."players" (
    pid INTEGER, 
    firstname VARCHAR(255),
    lastname VARCHAR(255),
    college VARCHAR(255),
    birthday DATE,
    PRIMARY KEY (pid)
);

-- Insert Root User (i.e. ME!)
INSERT INTO "chathamabate/jdg"."players" (pid, firstname, lastname, college, birthday)
VALUES (0, 'Chatham', 'Abate', 'McMurtry', '04-01-1999');

-- Insert Non Root User (i.e. Someone else)
INSERT INTO "chathamabate/jdg"."players" (pid, firstname, lastname, college, birthday)
VALUES 
    ((SELECT MAX(pid) + 1 FROM "chathamabate/jdg"."players"),
    'Anastasia', 'Alexander', 'McMurtry', '01-07-1999');



-- Games Table (Just gives logistical information about the game)
CREATE TABLE "chathamabate/jdg"."games" (
    gid INTEGER, 
    league_match BOOLEAN DEFAULT FALSE,
    game_start TIMESTAMP,
    loc VARCHAR(255),
    PRIMARY KEY (gid)
);

-- Insert First Game.
INSERT INTO "chathamabate/jdg"."games" (gid, league_match, game_start, loc)
VALUES (0, TRUE, '3-23-2022 10:00 PM', 'Jones');

-- Insert Arbitrary League Match.
INSERT INTO "chathamabate/jdg"."games" (gid, league_match, game_start, loc)
VALUES 
    ((SELECT MAX(gid) + 1 FROM "chathamabate/jdg"."games"), TRUE, '3-23-2022 10:00 PM', 'Jones');



-- This table describes which players played in which games
-- at what positions.
CREATE TABLE "chathamabate/jdg"."rosters" (
    gid INTEGER,
    pid INTEGER,
    pos INTEGER,
    PRIMARY KEY(gid, pid, pos),

    CONSTRAINT game_exists
        FOREIGN KEY(gid) REFERENCES "chathamabate/jdg"."games"(gid),
    CONSTRAINT player_exists
        FOREIGN KEY(pid) REFERENCES "chathamabate/jdg"."players"(pid),
    CONSTRAINT pos_is_valid
        CHECK(0 <= pos AND pos <= 3)
);

-- Insert First game rosters into rosters table.
INSERT INTO "chathamabate/jdg"."rosters" (gid, pid, pos)
VALUES  (0, 1, 0),
        (0, 4, 1),
        (0, 7, 2),
        (0, 3, 3);
        


-- Turns Table
CREATE TABLE "chathamabate/jdg"."turns" (
    gid INTEGER,
    pid INTEGER,
    round_num INTEGER,
    bet INTEGER NOT NULL,
    earned INTEGER NOT NULL,
    PRIMARY KEY(gid, pid, round_num),

    CONSTRAINT game_exists
        FOREIGN KEY(gid) REFERENCES "chathamabate/jdg"."games"(gid),
    CONSTRAINT player_exists
        FOREIGN KEY(pid) REFERENCES "chathamabate/jdg"."players"(pid),
    CONSTRAINT valid_turn
        CHECK(
            (1 <= round_num AND round_num <= 25) AND
            (0 <= bet AND bet <= round_num)
        ) 
);



-- Finally, we will need a view containing just complete games!