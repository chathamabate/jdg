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