CREATE TABLE IF NOT EXISTS quiz_attempts (
  id TEXT PRIMARY KEY,
  quiz_seed TEXT NOT NULL,
  learner_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  variant_seed TEXT NOT NULL,
  question_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  score INTEGER,
  total INTEGER,
  passed INTEGER,
  incorrect_ids TEXT,
  answers TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  submitted_at INTEGER,
  FOREIGN KEY (quiz_seed) REFERENCES quizzes(seed)
);

CREATE UNIQUE INDEX IF NOT EXISTS quiz_attempts_learner_number_idx
ON quiz_attempts(learner_id, quiz_seed, attempt_number);

UPDATE quizzes SET pass_mark = 80 WHERE seed = 'demo-even-001';
