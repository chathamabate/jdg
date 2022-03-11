-- View for turn data with cumulative stats as well.

CREATE VIEW "chathamabate/jdg"."turn_extras_full" AS
SELECT 
    te.*, 
    (
        SELECT SUM(tep.base_pts) +  (-50 * (SUM(tep.extra_pts) / 5))
        FROM "chathamabate/jdg"."turn_extras" tep
        WHERE   tep.gid = te.gid AND 
                tep.pos = te.pos AND 
                tep.round_num <= te.round_num 
    ) AS cumulative_pts
FROM "chathamabate/jdg"."turn_extras" te;