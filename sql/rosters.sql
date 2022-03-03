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
