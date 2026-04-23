-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
  created_at INTEGER DEFAULT (unixepoch())
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT,
  color TEXT,
  icon TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Class Members (students assigned to classes)
CREATE TABLE IF NOT EXISTS class_members (
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (class_id, student_id)
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('quiz', 'handout', 'activity', 'book_report', 'collaboration')),
  due_date INTEGER,
  points INTEGER DEFAULT 100,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Assignment Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('not_started', 'in_progress', 'turned_in', 'returned', 'graded')),
  score INTEGER,
  feedback TEXT,
  submitted_at INTEGER,
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Handouts (Materials)
CREATE TABLE IF NOT EXISTS handouts (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Chat Rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK(type IN ('global', 'class', 'dm')),
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_class_members_student ON class_members(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_handouts_class ON handouts(class_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id, created_at);

-- Seed: Global Chat Room
INSERT OR IGNORE INTO chat_rooms (id, name, type, class_id)
VALUES ('global', 'Globaler Chat', 'global', NULL);
