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
