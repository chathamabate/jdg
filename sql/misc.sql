-- Table Drop Commands --
DROP VIEW "chathamabate/jdg"."complete_games";
DROP TABLE "chathamabate/jdg"."turns";
DROP TABLE "chathamabate/jdg"."rosters";
DROP TABLE "chathamabate/jdg"."games";
DROP TABLE "chathamabate/jdg"."players";

-- Table Delete Commands --
DELETE FROM "chathamabate/jdg"."turns" WHERE 1=1;
DELETE FROM "chathamabate/jdg"."rosters" WHERE 1=1;
DELETE FROM "chathamabate/jdg"."games" WHERE 1=1;

-- Total Points Query --
SELECT  cg.gid, 
        r.pid, 
        SUM(t.bet)
FROM "chathamabate/jdg"."complete_games" cg 
    JOIN "chathamabate/jdg"."turns" t ON cg.gid = t.gid
    JOIN "chathamabate/jdg"."games" g ON cg.gid = g.gid
    JOIN "chathamabate/jdg"."rosters" r ON  (cg.gid = r.gid AND t.pos = r.pos)
GROUP BY cg.gid, r.pid
ORDER BY MAX(g.game_start) ASC;


