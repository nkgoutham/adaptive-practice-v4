/*
  # Fix student access to published content and concepts
  
  1. Changes
    - Updates RLS policies to ensure students can access any chapter with published concepts
    - Adds explicit policies for students to view published content
    - Modifies how chapters are considered "available" for students
  
  2. Security
    - Maintains proper access control while fixing visibility issues
*/

-- First, let's ensure students can view all chapters (even unpublished ones)
DROP POLICY IF EXISTS "Students can view all chapters" ON chapters;
CREATE POLICY "Students can view all chapters"
  ON chapters
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure students can view all concepts (necessary to show "coming soon" status)
DROP POLICY IF EXISTS "Students can view all concepts" ON concepts;
CREATE POLICY "Students can view all concepts"
  ON concepts
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure students can only view questions for published concepts
DROP POLICY IF EXISTS "Students can view questions for published concepts" ON questions;
CREATE POLICY "Students can view questions for published concepts"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM concepts
      WHERE concepts.id = questions.concept_id
      AND (
        concepts.is_published = true
        OR EXISTS (
          SELECT 1 FROM chapters
          WHERE chapters.id = concepts.chapter_id
          AND chapters.teacher_id = auth.uid()
        )
      )
    )
  );

-- Ensure students can view options for published concepts only
DROP POLICY IF EXISTS "Students can view options for published concepts" ON options;
CREATE POLICY "Students can view options for published concepts"
  ON options
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions
      JOIN concepts ON questions.concept_id = concepts.id
      WHERE questions.id = options.question_id
      AND (
        concepts.is_published = true
        OR EXISTS (
          SELECT 1 FROM chapters
          WHERE chapters.id = concepts.chapter_id
          AND chapters.teacher_id = auth.uid()
        )
      )
    )
  );