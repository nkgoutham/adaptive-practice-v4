/*
  # Fix student access to published content
  
  1. Changes
    - Updates RLS policies to ensure students can access published chapters and concepts
    - Adds explicit policies for students to view published content
  
  2. Security
    - Maintains proper access control while fixing visibility issues
*/

-- First, let's ensure students can view published chapters
DROP POLICY IF EXISTS "Students can view published chapters" ON chapters;
CREATE POLICY "Students can view published chapters"
  ON chapters
  FOR SELECT
  TO authenticated
  USING (
    is_published = true OR
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  );

-- Ensure students can view published concepts
DROP POLICY IF EXISTS "Students can view published concepts" ON concepts;
CREATE POLICY "Students can view published concepts"
  ON concepts
  FOR SELECT
  TO authenticated
  USING (
    is_published = true OR
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = concepts.chapter_id AND (
        chapters.teacher_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
        )
      )
    )
  );

-- Ensure students can only access published questions from published concepts
DROP POLICY IF EXISTS "Students can view published questions" ON questions;
CREATE POLICY "Students can view published questions"
  ON questions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM concepts
      JOIN chapters ON concepts.chapter_id = chapters.id
      WHERE 
        concepts.id = questions.concept_id AND
        (concepts.is_published = true AND chapters.is_published = true) OR
        chapters.teacher_id = auth.uid()
    )
  );