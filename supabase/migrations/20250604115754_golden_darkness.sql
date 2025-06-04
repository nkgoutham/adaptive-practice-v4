/*
  # Create profiles table

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users.id)
      - `role` (text, either 'teacher' or 'student')
      - `name` (text, user's display name)
      - `avatar` (text, URL to user's avatar, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  
  2. Security
    - Enable RLS on `profiles` table
    - Add policies for authenticated users to read their own data
    - Add policy for users to update their own profile
*/

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'student')),
  name TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for profile creation on signup
CREATE POLICY "Profiles can be created by the user"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Insert existing users into profiles table
INSERT INTO profiles (id, role, name)
VALUES 
  ('ccca4d41-3783-435e-9086-934598db3d62', 'student', 'Student User'),
  ('dd7bfa85-ef95-446d-901a-9b250684f551', 'teacher', 'Teacher User')
ON CONFLICT (id) DO NOTHING;