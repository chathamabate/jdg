
-- Complete games view.
-- These are games with a full roster and set of turns.

-- A game is complete iff its roster is full.

CREATE VIEW "chathamabate/jdg"."complete_games" AS 
SELECT g.gid FROM "chathamabate/jdg"."games" g
WHERE (
    SELECT COUNT(*) FROM (
        SELECT MAX(t.gid), t.round_num
        FROM "chathamabate/jdg"."turn_extras" t
        WHERE (
            -- All turns from this game with valid
            -- bet and earned values.
            t.gid = g.gid AND
            0 <= t.bet AND t.bet <= t.card_amount AND
            0 <= t.earned  AND t.earned <= t.card_amount
        )
        GROUP BY t.round_num, t.card_amount 
        HAVING (
            SUM(t.bet) != t.card_amount AND 
            SUM(t.earned) = t.card_amount AND
            COUNT(*) = 4
        )
    ) vts
) = 25; 