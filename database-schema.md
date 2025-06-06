# Database Schema

## Overview

The database schema is designed to support an adaptive educational platform where teachers can create content from PDF chapters and students can practice with adaptive questions. The schema includes tables for user profiles, educational content (chapters, concepts, questions), student progress tracking, and analytics.

## Tables

### `profiles`

Stores user information for both teachers and students.

**Columns:**
- `id` (uuid, primary key): User ID linked to Supabase Auth
- `role` (text): User role, either 'teacher' or 'student' (constrained by check)
- `name` (text): User's display name
- `avatar` (text, nullable): URL to user's avatar image
- `created_at` (timestamp with time zone): Account creation timestamp
- `updated_at` (timestamp with time zone): Account update timestamp

**Constraints:**
- `profiles_pkey`: Primary key constraint on `id`
- `profiles_role_check`: Check constraint ensuring role is either 'teacher' or 'student'

**Foreign Keys:**
- `profiles_id_fkey`: References `users(id)` with CASCADE on delete

**RLS Policies:**
- `Anyone can read profiles`: Allows authenticated users to read any profile
- `Profiles can be created by the user`: Allows authenticated users to create their own profile
- `Users can update their own profile`: Allows users to update only their own profile

### `chapters`

Stores educational chapter content uploaded by teachers.

**Columns:**
- `id` (uuid, primary key): Generated UUID
- `title` (text): Chapter title
- `grade` (integer): Grade level
- `subject` (text): Subject area
- `teacher_id` (uuid): Reference to teacher who created the chapter
- `created_at` (timestamp with time zone): Creation timestamp
- `updated_at` (timestamp with time zone): Update timestamp
- `is_published` (boolean): Publication status
- `content` (text, nullable): Raw chapter content
- `processing_status` (text, nullable): Current processing stage ('uploading', 'extracting', 'generating', 'completed', 'error')
- `processing_error` (text, nullable): Error message if processing failed

**Constraints:**
- `chapters_pkey`: Primary key constraint on `id`
- `chapters_processing_status_check`: Check constraint for valid processing statuses

**Foreign Keys:**
- `chapters_teacher_id_fkey`: References `profiles(id)` with CASCADE on delete

**RLS Policies:**
- `Anyone can view chapters`: Allows authenticated users to view any chapter
- `Students can view all chapters`: Additional policy for student access
- `Students can view published chapters`: Restricts student access to published chapters or those owned by their teacher
- `Teachers can create chapters`: Allows teachers to create chapters
- `Teachers can delete their own chapters`: Allows teachers to delete only their chapters
- `Teachers can update their own chapters`: Allows teachers to update only their chapters

### `concepts`

Stores educational concepts extracted from chapters.

**Columns:**
- `id` (uuid, primary key): Generated UUID
- `chapter_id` (uuid): Reference to parent chapter
- `name` (text): Concept name
- `created_at` (timestamp with time zone): Creation timestamp
- `is_published` (boolean): Publication status
- `start_page_number` (integer, nullable): Starting page in chapter
- `end_page_number` (integer, nullable): Ending page in chapter

**Constraints:**
- `concepts_pkey`: Primary key constraint on `id`

**Foreign Keys:**
- `concepts_chapter_id_fkey`: References `chapters(id)` with CASCADE on delete

**RLS Policies:**
- `Anyone can view concepts`: Allows authenticated users to view any concept
- `Students can view all concepts`: Additional policy for student access
- `Students can view published concepts`: Restricts student access to published concepts
- `Teachers can manage their concepts`: Allows teachers to manage concepts in their chapters

### `misconceptions`

Stores common educational misconceptions and their explanations.

**Columns:**
- `tag` (text, primary key): Unique identifier for the misconception
- `explanation` (text): Explanation of the misconception
- `created_at` (timestamp with time zone): Creation timestamp

**Constraints:**
- `misconceptions_pkey`: Primary key constraint on `tag`

**RLS Policies:**
- `Anyone can view misconceptions`: Allows authenticated users to view misconceptions

### `questions`

Stores practice questions for concepts.

**Columns:**
- `id` (uuid, primary key): Generated UUID
- `concept_id` (uuid): Reference to parent concept
- `bloom_level` (text): Bloom's taxonomy level ('Recall', 'Conceptual', 'Application', 'Analysis')
- `difficulty` (text): Question difficulty ('Easy', 'Medium', 'Hard')
- `stem` (text): Question text
- `created_at` (timestamp with time zone): Creation timestamp
- `last_updated_by` (uuid, nullable): Reference to user who last updated the question
- `last_updated_at` (timestamp with time zone): Last update timestamp

**Constraints:**
- `questions_pkey`: Primary key constraint on `id`
- `questions_bloom_level_check`: Check constraint for valid Bloom's levels
- `questions_difficulty_check`: Check constraint for valid difficulty levels

**Foreign Keys:**
- `questions_concept_id_fkey`: References `concepts(id)` with CASCADE on delete
- `questions_last_updated_by_fkey`: References `profiles(id)`

**RLS Policies:**
- `Anyone can view questions`: Allows authenticated users to view any question
- `Students can view published questions`: Restricts student access to questions for published concepts
- `Students can view questions for published concepts`: Another policy for student access
- `Teachers can manage questions for their chapters`: Allows teachers to manage questions in their chapters

### `options`

Stores answer options for questions.

**Columns:**
- `id` (uuid, primary key): Generated UUID
- `question_id` (uuid): Reference to parent question
- `text` (text): Option text
- `is_correct` (boolean): Whether this option is correct
- `misconception_tag` (text, nullable): Reference to misconception if incorrect
- `created_at` (timestamp with time zone): Creation timestamp

**Constraints:**
- `options_pkey`: Primary key constraint on `id`

**Foreign Keys:**
- `options_question_id_fkey`: References `questions(id)` with CASCADE on delete
- `options_misconception_tag_fkey`: References `misconceptions(tag)` with SET NULL on delete

**RLS Policies:**
- `Anyone can view options`: Allows authenticated users to view any option
- `Students can view options for published concepts`: Restricts student access to options for published concepts
- `Teachers can manage options for their questions`: Allows teachers to manage options for their questions

### `student_sessions`

Tracks student practice sessions.

**Columns:**
- `id` (uuid, primary key): Generated UUID
- `student_id` (uuid): Reference to student
- `chapter_id` (uuid): Reference to chapter being practiced
- `started_at` (timestamp with time zone): Session start timestamp
- `finished_at` (timestamp with time zone, nullable): Session end timestamp

**Constraints:**
- `student_sessions_pkey`: Primary key constraint on `id`

**Foreign Keys:**
- `student_sessions_student_id_fkey`: References `profiles(id)` with CASCADE on delete
- `student_sessions_chapter_id_fkey`: References `chapters(id)` with CASCADE on delete

**RLS Policies:**
- `Students can manage their own sessions`: Allows students to manage only their sessions
- `Teachers can view sessions for their chapters`: Allows teachers to view sessions for their chapters

### `attempts`

Records student attempts at answering questions.

**Columns:**
- `id` (uuid, primary key): Generated UUID
- `session_id` (uuid): Reference to practice session
- `question_id` (uuid): Reference to question attempted
- `is_correct` (boolean): Whether the answer was correct
- `selected_option_id` (uuid, nullable): Reference to selected answer option
- `answered_at` (timestamp with time zone): Timestamp when question was answered

**Constraints:**
- `attempts_pkey`: Primary key constraint on `id`

**Foreign Keys:**
- `attempts_session_id_fkey`: References `student_sessions(id)` with CASCADE on delete
- `attempts_question_id_fkey`: References `questions(id)` with CASCADE on delete
- `attempts_selected_option_id_fkey`: References `options(id)` with SET NULL on delete

**RLS Policies:**
- `Students can manage their own attempts`: Allows students to manage only their attempts
- `Teachers can view attempts`: Allows teachers to view attempts for their chapters

### `pdf_pages`

Stores extracted text content from PDF pages.

**Columns:**
- `id` (uuid, primary key): Generated UUID
- `chapter_id` (uuid): Reference to chapter
- `page_number` (integer): Page number in the PDF
- `content` (text): Extracted text content
- `created_at` (timestamp with time zone): Creation timestamp

**Constraints:**
- `pdf_pages_pkey`: Primary key constraint on `id`

**Indexes:**
- `pdf_pages_chapter_id_page_number_idx`: Index on chapter_id and page_number for faster queries

**Foreign Keys:**
- `pdf_pages_chapter_id_fkey`: References `chapters(id)` with CASCADE on delete

**RLS Policies:**
- `Students can read pdf pages from published chapters`: Allows students to read pages from published chapters
- `Teachers can manage pdf pages for their chapters`: Allows teachers to manage pages for their chapters

### `question_edit_history`

Tracks edits made to questions.

**Columns:**
- `id` (uuid, primary key): Generated UUID
- `question_id` (uuid): Reference to question
- `user_id` (uuid): Reference to user who made the edit
- `timestamp` (timestamp with time zone): Edit timestamp
- `previous_value` (jsonb): Previous question data
- `new_value` (jsonb): New question data

**Constraints:**
- `question_edit_history_pkey`: Primary key constraint on `id`

**Indexes:**
- `question_edit_history_question_id_idx`: Index on question_id for faster queries

**Foreign Keys:**
- `question_edit_history_question_id_fkey`: References `questions(id)` with CASCADE on delete
- `question_edit_history_user_id_fkey`: References `profiles(id)` with CASCADE on delete

**RLS Policies:**
- `Authenticated users can manage edit history`: Allows authenticated users to manage edit history

## Relationships

1. **User Relationships:**
   - A profile can be either a teacher or a student
   - Teachers create chapters and manage concepts/questions
   - Students participate in practice sessions

2. **Content Hierarchy:**
   - Chapters contain multiple concepts
   - Concepts contain multiple questions
   - Questions have multiple options (one correct, others incorrect)

3. **Learning Progress:**
   - Students have practice sessions
   - Sessions contain attempts
   - Attempts reference questions and selected options

4. **Misconceptions:**
   - Incorrect options can reference misconceptions
   - Misconceptions provide explanations for incorrect answers

## Row-Level Security (RLS)

The database implements comprehensive Row-Level Security:

1. **Teacher Access:**
   - Teachers can view and manage only their own content
   - Teachers can see analytics for their students

2. **Student Access:**
   - Students can view only published content
   - Students can manage only their own practice sessions and attempts
   - Students can view their own progress data

3. **General Policies:**
   - Authentication is required for all data access
   - Public access is not permitted to any tables