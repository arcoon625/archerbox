CREATE TABLE browser_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX browser_sessions_expiry ON browser_sessions (expires);
