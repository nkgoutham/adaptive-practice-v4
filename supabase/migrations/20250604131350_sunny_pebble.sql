/*
  # Simplified RLS policies
  
  1. Changes
    - Remove storage bucket creation and policies since we're parsing PDFs client-side
    - All PDF parsing happens in the browser, no storage needed
*/

-- This migration is intentionally empty as we no longer need the storage bucket