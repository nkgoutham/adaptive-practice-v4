/*
  # Content Tables for Adaptive Practice

  1. New Tables
     - `chapters` - Stores information about uploaded educational chapters
     - `concepts` - Stores concepts extracted from chapters
     - `misconceptions` - Stores common misconception tags and explanations
     - `questions` - Stores generated questions for each concept
     - `options` - Stores answer options for each question
     - `student_sessions` - Tracks student practice sessions
     - `attempts` - Records question attempts by students
  
  2. Security
     - Row Level Security enabled on all tables
     - Policies for teachers to manage their content
     - Policies for students to access content and record their attempts
*/

-- Create chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  grade INTEGER NOT NULL,
  subject TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_published BOOLEAN DEFAULT false
);

-- Create concepts table
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create misconceptions table
CREATE TABLE IF NOT EXISTS misconceptions (
  tag TEXT PRIMARY KEY,
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  bloom_level TEXT NOT NULL CHECK (bloom_level IN ('Recall', 'Conceptual', 'Application', 'Analysis')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  stem TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create options table
CREATE TABLE IF NOT EXISTS options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  misconception_tag TEXT REFERENCES misconceptions(tag) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create student_sessions table
CREATE TABLE IF NOT EXISTS student_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Create attempts table
CREATE TABLE IF NOT EXISTS attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES student_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  selected_option_id UUID REFERENCES options(id) ON DELETE SET NULL,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Insert common misconceptions
INSERT INTO misconceptions (tag, explanation) VALUES
  ('decimal-place-value', 'Remember that in a decimal, each place has a specific value. The first place after the decimal is tenths (0.1), the second place is hundredths (0.01), and so on.'),
  ('division-error', 'When converting a fraction to a decimal, we divide the numerator by the denominator. Make sure you''re dividing the correct numbers.'),
  ('fraction-meaning', 'A fraction represents a part of a whole. The numerator (top number) tells us how many parts we have, and the denominator (bottom number) tells us how many equal parts the whole is divided into.'),
  ('conceptual-misunderstanding', 'This concept requires understanding the relationships between multiple ideas. Try to connect what you know with what the question is asking.'),
  ('procedure-error', 'There''s a mistake in the steps you followed to solve this problem. Let''s review the correct procedure.'),
  ('calculation-error', 'Check your arithmetic carefully. Even a small calculation error can lead to an incorrect answer.');

-- RLS Policies for chapters table
CREATE POLICY "Teachers can create their own chapters"
  ON chapters FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher'
  ));

CREATE POLICY "Teachers can update their own chapters"
  ON chapters FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can view their own chapters"
  ON chapters FOR SELECT TO authenticated
  USING (
    auth.uid() = teacher_id
    OR
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student') AND is_published = true)
  );

-- RLS Policies for concepts table
CREATE POLICY "Teachers can manage concepts for their chapters"
  ON concepts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = concepts.chapter_id
      AND chapters.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view concepts for published chapters"
  ON concepts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = concepts.chapter_id
      AND chapters.is_published = true
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
    )
  );

-- RLS Policies for misconceptions table
CREATE POLICY "Misconceptions are readable by all authenticated users"
  ON misconceptions FOR SELECT TO authenticated
  USING (true);

-- RLS Policies for questions table
CREATE POLICY "Teachers can manage questions for their chapters"
  ON questions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM concepts
      JOIN chapters ON concepts.chapter_id = chapters.id
      WHERE concepts.id = questions.concept_id
      AND chapters.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view questions for published chapters"
  ON questions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM concepts
      JOIN chapters ON concepts.chapter_id = chapters.id
      WHERE concepts.id = questions.concept_id
      AND chapters.is_published = true
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
    )
  );

-- RLS Policies for options table
CREATE POLICY "Teachers can manage options for their questions"
  ON options FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions
      JOIN concepts ON questions.concept_id = concepts.id
      JOIN chapters ON concepts.chapter_id = chapters.id
      WHERE questions.id = options.question_id
      AND chapters.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can view options for published chapters"
  ON options FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions
      JOIN concepts ON questions.concept_id = concepts.id
      JOIN chapters ON concepts.chapter_id = chapters.id
      WHERE questions.id = options.question_id
      AND chapters.is_published = true
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
    )
  );

-- RLS Policies for student_sessions table
CREATE POLICY "Students can manage their own sessions"
  ON student_sessions FOR ALL TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view sessions for their chapters"
  ON student_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = student_sessions.chapter_id
      AND chapters.teacher_id = auth.uid()
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
    )
  );

-- RLS Policies for attempts table
CREATE POLICY "Students can manage their own attempts"
  ON attempts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_sessions
      WHERE student_sessions.id = attempts.session_id
      AND student_sessions.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view attempts for their chapters"
  ON attempts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_sessions
      JOIN chapters ON student_sessions.chapter_id = chapters.id
      WHERE student_sessions.id = attempts.session_id
      AND chapters.teacher_id = auth.uid()
      AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
    )
  );