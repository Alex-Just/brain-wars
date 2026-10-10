CREATE TABLE IF NOT EXISTS answers (
    id TEXT PRIMARY KEY,
    game TEXT NOT NULL,
    correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
    ts INTEGER NOT NULL,
    device TEXT,
    ip TEXT,
    country TEXT,
    received_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_answers_ts ON answers (ts);
CREATE INDEX IF NOT EXISTS idx_answers_device ON answers (device);
CREATE INDEX IF NOT EXISTS idx_answers_ip_received ON answers (ip, received_at);
CREATE INDEX IF NOT EXISTS idx_answers_country_ts ON answers (country, ts);
