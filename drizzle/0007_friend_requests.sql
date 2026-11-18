-- Public leaderboard identifiers are separate from private friend codes and sessions.
ALTER TABLE social_profiles ADD COLUMN public_id TEXT;
UPDATE social_profiles SET public_id=lower(hex(randomblob(16))) WHERE public_id IS NULL;
CREATE UNIQUE INDEX social_profiles_public_id ON social_profiles(public_id);

CREATE TABLE social_friend_requests (
 id TEXT NOT NULL UNIQUE,
 a TEXT NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
 b TEXT NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
 sender TEXT NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
 recipient TEXT NOT NULL REFERENCES social_profiles(id) ON DELETE CASCADE,
 status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined','cancelled')),
 created INTEGER NOT NULL,
 updated INTEGER NOT NULL,
 PRIMARY KEY(a,b),
 CHECK(a < b),
 CHECK((sender=a AND recipient=b) OR (sender=b AND recipient=a))
);
CREATE INDEX friend_requests_recipient ON social_friend_requests(recipient,status);
CREATE INDEX friend_requests_sender ON social_friend_requests(sender,status);
