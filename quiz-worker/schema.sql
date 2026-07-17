CREATE TABLE IF NOT EXISTS quizzes (
  seed TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  questions TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  pass_mark INTEGER NOT NULL DEFAULT 8
);

CREATE TABLE IF NOT EXISTS results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seed TEXT NOT NULL,
  user_id TEXT,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  passed INTEGER NOT NULL,
  answers TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  FOREIGN KEY (seed) REFERENCES quizzes(seed)
);

CREATE INDEX IF NOT EXISTS results_seed_submitted_idx
ON results(seed, submitted_at DESC);

INSERT OR REPLACE INTO quizzes (seed, title, questions, answer_key, pass_mark)
VALUES (
  'demo-even-001',
  'Which of These Is Even?',
  '[{"id":"q1","text":"Which of these numbers is even?","options":[{"id":"a","text":"7"},{"id":"b","text":"12"},{"id":"c","text":"19"},{"id":"d","text":"25"}]},{"id":"q2","text":"Which of these numbers is even?","options":[{"id":"a","text":"31"},{"id":"b","text":"43"},{"id":"c","text":"56"},{"id":"d","text":"67"}]},{"id":"q3","text":"Which of these numbers is even?","options":[{"id":"a","text":"81"},{"id":"b","text":"94"},{"id":"c","text":"105"},{"id":"d","text":"117"}]},{"id":"q4","text":"Which of these numbers is even?","options":[{"id":"a","text":"123"},{"id":"b","text":"135"},{"id":"c","text":"148"},{"id":"d","text":"159"}]},{"id":"q5","text":"Which of these numbers is even?","options":[{"id":"a","text":"171"},{"id":"b","text":"182"},{"id":"c","text":"193"},{"id":"d","text":"205"}]},{"id":"q6","text":"Which of these numbers is even?","options":[{"id":"a","text":"217"},{"id":"b","text":"229"},{"id":"c","text":"240"},{"id":"d","text":"251"}]},{"id":"q7","text":"Which of these numbers is even?","options":[{"id":"a","text":"263"},{"id":"b","text":"274"},{"id":"c","text":"285"},{"id":"d","text":"297"}]},{"id":"q8","text":"Which of these numbers is even?","options":[{"id":"a","text":"309"},{"id":"b","text":"311"},{"id":"c","text":"323"},{"id":"d","text":"336"}]},{"id":"q9","text":"Which of these numbers is even?","options":[{"id":"a","text":"347"},{"id":"b","text":"358"},{"id":"c","text":"369"},{"id":"d","text":"371"}]},{"id":"q10","text":"Which of these numbers is even?","options":[{"id":"a","text":"383"},{"id":"b","text":"395"},{"id":"c","text":"406"},{"id":"d","text":"417"}]}]',
  '{"q1":"b","q2":"c","q3":"b","q4":"c","q5":"b","q6":"c","q7":"b","q8":"d","q9":"b","q10":"c"}',
  8
);
