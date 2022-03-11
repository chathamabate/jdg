-- View for memoing the points each player scored per turn.

SELECT 
    t.*,
    CASE
        WHEN t.bet = 0 AND t.earned = 0 THEN t.card_amount * 10
        WHEN t.bet = 0 THEN -(t.earned * 10) 
        WHEN t.earned < t.bet THEN -10 * (t.bet - t.earned)
        ELSE t.bet * 10
    END AS base_pts,
    CASE 
        WHEN t.bet > 0 AND t.earned > t.bet THEN t.earned - t.bet
        ELSE 0
    END AS extra_pts
FROM (
    SELECT 
        tp.*, 
        CASE 
            WHEN tp.round_num > 13 THEN 26 - tp.round_num
            ELSE tp.round_num 
        END AS card_amount
    FROM "chathamabate/jdg"."turns" tp
) t;