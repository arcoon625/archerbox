CREATE TABLE social_chat_messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 a TEXT NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
 b TEXT NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
 sender TEXT NOT NULL,
 nonce TEXT NOT NULL,
 body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 400),
 created INTEGER NOT NULL,
 read_at INTEGER,
 CHECK(a < b),
 CHECK(sender = a OR sender = b),
 UNIQUE(a,b,sender,nonce)
);
CREATE INDEX social_chat_thread ON social_chat_messages(a,b,id);
CREATE INDEX social_chat_unread ON social_chat_messages(a,b,sender,id) WHERE read_at IS NULL;
CREATE INDEX social_chat_sends ON social_chat_messages(sender,created);
CREATE INDEX social_chat_recipients ON social_chat_messages(b);
