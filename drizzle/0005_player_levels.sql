-- Look up one player's achievements efficiently for their lifetime XP and level.
CREATE INDEX chart_scores_user_game_event ON chart_scores (user_id, game, event);
