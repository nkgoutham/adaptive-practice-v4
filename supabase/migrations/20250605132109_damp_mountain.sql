/*
  # Update Question Edit History RLS Policy
  
  1. Changes
    - Remove existing RLS policies on question_edit_history table
    - Add new permissive policy allowing any authenticated user to insert/select records
  
  2. Security
    - Enables basic authentication check
    - Allows any authenticated user to record and view edit history
*/

-- Drop existing policies
drop policy if exists "Teachers can view edit history for their questions" on question_edit_history;

-- Enable RLS
alter table question_edit_history enable row level security;

-- Add permissive policy for authenticated users
create policy "Authenticated users can manage edit history"
  on question_edit_history
  for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);