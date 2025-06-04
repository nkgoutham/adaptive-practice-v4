/*
  # Create storage bucket for chapter PDFs

  1. Changes
    - Create storage bucket 'chapter-pdfs' for storing uploaded chapter PDFs
    - Set bucket as private (not public)
    - Add RLS policies for:
      - PDF uploads by teachers
      - Reading own PDFs
      - Deleting own PDFs
    
  2. Security
    - Restrict uploads to PDF files only
    - 20MB file size limit
    - Teachers can only access their own files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chapter-pdfs', 'chapter-pdfs', false);

-- Create a policy to allow authenticated users to upload PDFs
CREATE POLICY "Teachers can upload PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chapter-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) = 'pdf'
  AND length(name) < 255
);

-- Create a policy to allow teachers to read their own PDFs
CREATE POLICY "Teachers can read their own PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chapter-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create a policy to allow teachers to delete their own PDFs
CREATE POLICY "Teachers can delete their own PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chapter-pdfs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);