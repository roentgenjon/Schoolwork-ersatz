-- Users: admin/teacher require password_hash; permissions is JSON array of granted permission strings
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'student')),
  password_hash TEXT,
  permissions TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER DEFAULT (unixepoch())
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT,
  color TEXT DEFAULT '#007AFF',
  icon TEXT DEFAULT '📚',
  created_at INTEGER DEFAULT (unixepoch())
);

-- Class members (students enrolled in a class)
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
  created_by TEXT REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch())
);

-- Multiple files/links per assignment
CREATE TABLE IF NOT EXISTS assignment_attachments (
  id TEXT PRIMARY KEY,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('file', 'link')),
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  assignment_id TEXT REFERENCES assignments(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'turned_in', 'returned', 'graded')),
  score INTEGER,
  feedback TEXT,
  submitted_at INTEGER,
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(assignment_id, student_id)
);

-- Handouts (materials)
CREATE TABLE IF NOT EXISTS handouts (
  id TEXT PRIMARY KEY,
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_type TEXT,
  created_by TEXT REFERENCES users(id),
  created_at INTEGER DEFAULT (unixepoch())
);

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Chat rooms
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT,
  type TEXT NOT NULL CHECK(type IN ('global', 'class', 'dm')),
  class_id TEXT REFERENCES classes(id) ON DELETE CASCADE
);

-- Default global chat room
INSERT OR IGNORE INTO chat_rooms (id, name, type) VALUES ('global', 'Global', 'global');
