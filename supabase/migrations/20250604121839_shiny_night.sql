/*
  # Add chapter content storage

  1. Changes
    - Add `content` column to chapters table to store extracted PDF text
    - Add `processing_status` column to track AI processing stages
    - Add `processing_error` column to store any errors that occur

  2. Security
    - Maintain existing RLS policies
*/

ALTER TABLE chapters
ADD COLUMN content TEXT,
ADD COLUMN processing_status TEXT CHECK (processing_status IN ('uploading', 'extracting', 'generating', 'completed', 'error')),
ADD COLUMN processing_error TEXT;