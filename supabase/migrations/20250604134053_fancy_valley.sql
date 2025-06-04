/*
  # Add PDF pages table for storing extracted page content

  1. New Tables
    - `pdf_pages` - Stores extracted text content from each page of uploaded PDFs
      - `id` (uuid, primary key)
      - `chapter_id` (uuid, references chapters)
      - `page_number` (integer)
      - `content` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `pdf_pages` table
    - Add policies for teachers to manage their pages
    - Add policies for students to read pages from published chapters
*/

-- Create pdf_pages table
CREATE TABLE IF NOT EXISTS pdf_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS pdf_pages_chapter_id_page_number_idx 
ON pdf_pages (chapter_id, page_number);

-- Enable Row Level Security
ALTER TABLE pdf_pages ENABLE ROW LEVEL SECURITY;

-- Create policy for teachers to manage their pages
CREATE POLICY "Teachers can manage pdf pages for their chapters"
  ON pdf_pages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = pdf_pages.chapter_id
      AND chapters.teacher_id = auth.uid()
    )
  );

-- Create policy for students to read pages from published chapters
CREATE POLICY "Students can read pdf pages from published chapters"
  ON pdf_pages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chapters
      WHERE chapters.id = pdf_pages.chapter_id
      AND chapters.is_published = true
    )
  );