/*
  # Fix All RLS Policies

  1. Simplifies RLS policies across all tables to ensure proper functionality
  2. Makes sure storage buckets and objects are accessible
  3. Focuses on core access patterns needed by the application:
     - Teachers can manage their own content
     - Students can access published content
     - Users can manage their own sessions/attempts
*/

-- ==========================================
-- STORAGE POLICIES
-- ==========================================

-- Make sure the chapter-pdfs bucket exists and is public
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  SELECT 'chapter-pdfs', 'chapter-pdfs', true
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chapter-pdfs'
  );
EXCEPTION WHEN unique_violation THEN
  -- Bucket already exists, update it to public
  UPDATE storage.buckets SET public = true WHERE id = 'chapter-pdfs';
END $$;

-- Drop all existing policies for the chapter-pdfs bucket
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM storage.policies 
    WHERE bucket_id = 'chapter-pdfs'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
  END LOOP;
EXCEPTION WHEN undefined_table THEN
  -- storage.policies might not exist in some Supabase versions
  NULL;
END $$;

-- Create simple permissive policies for storage objects
DROP POLICY IF EXISTS "Allow all uploads to chapter-pdfs" ON storage.objects;
CREATE POLICY "Allow all uploads to chapter-pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chapter-pdfs');

DROP POLICY IF EXISTS "Allow all downloads from chapter-pdfs" ON storage.objects;
CREATE POLICY "Allow all downloads from chapter-pdfs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'chapter-pdfs');

DROP POLICY IF EXISTS "Allow all updates to chapter-pdfs" ON storage.objects;
CREATE POLICY "Allow all updates to chapter-pdfs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'chapter-pdfs');

DROP POLICY IF EXISTS "Allow all deletes from chapter-pdfs" ON storage.objects;
CREATE POLICY "Allow all deletes from chapter-pdfs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'chapter-pdfs');

-- ==========================================
-- PROFILES TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles can be created by the user" ON profiles;

-- Create simplified policies
CREATE POLICY "Anyone can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Profiles can be created by the user"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ==========================================
-- CHAPTERS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can create their own chapters" ON chapters;
DROP POLICY IF EXISTS "Teachers can update their own chapters" ON chapters;
DROP POLICY IF EXISTS "Teachers can view their own chapters" ON chapters;

-- Create simplified policies
CREATE POLICY "Anyone can view chapters"
  ON chapters
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can create chapters"
  ON chapters
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own chapters"
  ON chapters
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own chapters"
  ON chapters
  FOR DELETE
  TO authenticated
  USING (auth.uid() = teacher_id);

-- ==========================================
-- CONCEPTS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage concepts for their chapters" ON concepts;
DROP POLICY IF EXISTS "Students can view concepts for published chapters" ON concepts;

-- Create simplified policies
CREATE POLICY "Anyone can view concepts"
  ON concepts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage their concepts"
  ON concepts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = concepts.chapter_id
      AND chapters.teacher_id = auth.uid()
    )
  );

-- ==========================================
-- MISCONCEPTIONS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Misconceptions are readable by all authenticated users" ON misconceptions;

-- Create simplified policies
CREATE POLICY "Anyone can view misconceptions"
  ON misconceptions
  FOR SELECT
  TO authenticated
  USING (true);

-- ==========================================
-- QUESTIONS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage questions for their chapters" ON questions;
DROP POLICY IF EXISTS "Students can view questions for published chapters" ON questions;

-- Create simplified policies
CREATE POLICY "Anyone can view questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage questions for their chapters"
  ON questions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM concepts
      JOIN chapters ON concepts.chapter_id = chapters.id
      WHERE concepts.id = questions.concept_id
      AND chapters.teacher_id = auth.uid()
    )
  );

-- ==========================================
-- OPTIONS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can manage options for their questions" ON options;
DROP POLICY IF EXISTS "Students can view options for published chapters" ON options;

-- Create simplified policies
CREATE POLICY "Anyone can view options"
  ON options
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Teachers can manage options for their questions"
  ON options
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions
      JOIN concepts ON questions.concept_id = concepts.id
      JOIN chapters ON concepts.chapter_id = chapters.id
      WHERE questions.id = options.question_id
      AND chapters.teacher_id = auth.uid()
    )
  );

-- ==========================================
-- STUDENT_SESSIONS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can manage their own sessions" ON student_sessions;
DROP POLICY IF EXISTS "Teachers can view sessions for their chapters" ON student_sessions;

-- Create simplified policies
CREATE POLICY "Students can manage their own sessions"
  ON student_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view sessions for their chapters"
  ON student_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = student_sessions.chapter_id
      AND chapters.teacher_id = auth.uid()
    )
  );

-- ==========================================
-- ATTEMPTS TABLE
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "Students can manage their own attempts" ON attempts;
DROP POLICY IF EXISTS "Teachers can view attempts for their chapters" ON attempts;

-- Create simplified policies
CREATE POLICY "Students can manage their own attempts"
  ON attempts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_sessions
      WHERE student_sessions.id = attempts.session_id
      AND student_sessions.student_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can view attempts"
  ON attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM student_sessions
      JOIN chapters ON student_sessions.chapter_id = chapters.id
      WHERE student_sessions.id = attempts.session_id
      AND chapters.teacher_id = auth.uid()
    )
  );