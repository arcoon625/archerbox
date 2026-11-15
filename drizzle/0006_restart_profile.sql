-- Keep an interrupted restart retryable, and reject stale pages after a fresh profile is created.
ALTER TABLE browser_sessions ADD COLUMN generation_guard INTEGER NOT NULL DEFAULT 0;
ALTER TABLE browser_sessions ADD COLUMN resetting INTEGER NOT NULL DEFAULT 0;
