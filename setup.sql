
-- Players Table
CREATE TABLE "chathamabate/jdg"."players" (
    pid INTEGER NOT NULL, 
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


-- Games Table
CREATE TABLE "chathamabate/jdg"."games" (
    gid INTEGER NOT NULL, 
    game_start TIMESTAMP,
    loc VARCHAR(255),
    player_1 INTEGER, -- These are in order of rotation.
    player_2 INTEGER,
    player_3 INTEGER,
    player_4 INTEGER,
    PRIMARY KEY (gid),

    -- All players must exist in the player table!
    CONSTRAINT p1 
        FOREIGN KEY(player_1) REFERENCES "chathamabate/jdg"."players"(pid),
    CONSTRAINT p2 
        FOREIGN KEY(player_2) REFERENCES "chathamabate/jdg"."players"(pid),
    CONSTRAINT p3 
        FOREIGN KEY(player_3) REFERENCES "chathamabate/jdg"."players"(pid),
    CONSTRAINT p4 
        FOREIGN KEY(player_4) REFERENCES "chathamabate/jdg"."players"(pid)
);

-- Insert First Game 
INSERT INTO "chathamabate/jdg"."games" (gid, game_start, loc, player_1, player_2, player_3, player_4)
VALUES (1, '3-23-2022 10:00 PM', 'Jones', 1, 4, 7, 3);

-- Insert Arbitrary Game.
INSERT INTO "chathamabate/jdg"."games" (gid, game_start, loc, player_1, player_2, player_3, player_4)
VALUES 
    ((SELECT MAX(gid) + 1 FROM "chathamabate/jdg"."games"), 
    '3-23-2022 10:00 PM', 'Jones', 1, 4, 7, 3);

