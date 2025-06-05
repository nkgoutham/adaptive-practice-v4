/*
  # Add page range to concepts table
  
  1. Changes
     - Add start_page_number and end_page_number columns to concepts table
     - These columns will store the page range where the concept appears in the chapter
  
  2. Purpose
     - Allows more efficient content fetching when generating questions
     - Enables more contextually relevant question generation
*/

-- Add page range columns to concepts table
ALTER TABLE concepts 
ADD COLUMN start_page_number integer,
ADD COLUMN end_page_number integer;

-- Update description for easier future reference
COMMENT ON TABLE concepts IS 'Stores educational concepts extracted from chapters with page range information';