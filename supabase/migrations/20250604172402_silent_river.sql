/*
  # Question Edit History Table

  1. New Tables
    - `question_edit_history` - Stores history of question edits for audit purposes
      - `id` (uuid, primary key)
      - `question_id` (uuid, references questions)
      - `user_id` (uuid, references profiles)
      - `timestamp` (timestamptz)
      - `previous_value` (jsonb)
      - `new_value` (jsonb)
  
  2. Security
    - Enable RLS on the table
    - Add policies for teachers to view edit history
*/

-- Create question_edit_history table
CREATE TABLE IF NOT EXISTS question_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT now(),
  previous_value JSONB NOT NULL,
  new_value JSONB NOT NULL
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS question_edit_history_question_id_idx 
ON question_edit_history (question_id);

-- Enable Row Level Security
ALTER TABLE question_edit_history ENABLE ROW LEVEL SECURITY;

-- Create policy for teachers to view edit history
CREATE POLICY "Teachers can view edit history for their questions"
  ON question_edit_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM questions
      JOIN concepts ON questions.concept_id = concepts.id
      JOIN chapters ON concepts.chapter_id = chapters.id
      WHERE questions.id = question_edit_history.question_id
      AND chapters.teacher_id = auth.uid()
    )
  );