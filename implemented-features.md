# Implemented Features and User Flows

## Core System Overview

The Adaptive Practice platform is an educational tool that leverages AI to create personalized learning experiences. It features two main user roles - teachers and students - each with distinct workflows and features.

## Teacher Features

### Content Creation and Management

1. **PDF Chapter Management:**
   - Upload PDF chapters (up to 20 pages)
   - Specify chapter title, grade level, and subject
   - View a list of all uploaded chapters
   - Track chapter processing status

2. **AI-Powered Concept Extraction:**
   - Automatic extraction of key concepts from PDF content
   - Identification of page ranges for each concept
   - Visualization of extracted concepts with descriptions

3. **Question Generation:**
   - AI generation of questions for each concept
   - Questions categorized by:
     - Bloom's Taxonomy levels (Recall, Conceptual, Application, Analysis)
     - Difficulty levels (Easy, Medium, Hard)
   - Questions include misconception tags for incorrect answers

4. **Question Management:**
   - Review generated questions
   - Edit question text, options, and metadata
   - Delete inappropriate questions
   - Filter questions by Bloom level and difficulty
   - Track edit history with user attribution

5. **Publishing System:**
   - Publish individual concepts or entire chapters
   - Unpublish content as needed
   - Control what students can access

### Analytics Dashboard

1. **Class Performance:**
   - Concept proficiency heatmap
   - Identification of hardest concepts
   - Suggested interventions based on class performance

2. **Student-Specific Analytics:**
   - Individual concept mastery tracking
   - Question attempt statistics
   - Time spent learning
   - Identified misconceptions

## Student Features

### Learning Experience

1. **Content Discovery:**
   - Browse available chapters
   - View publication status of chapters and concepts
   - See progress indicators for previously studied content

2. **Adaptive Practice:**
   - Select specific concepts to practice
   - Receive questions tailored to current proficiency level
   - Get immediate feedback on answers

3. **Teaching Buddy:**
   - Receive personalized explanations for misconceptions
   - Learn from mistakes through guided feedback
   - Understand why incorrect answers are wrong

4. **Gamification:**
   - Earn stars based on question difficulty and correctness:
     - Bronze stars for easy questions
     - Silver stars for medium questions
     - Gold stars for hard questions
   - Track star streaks for motivation

5. **Progress Tracking:**
   - View concept mastery levels
   - Track star collection progress
   - See overall proficiency percentage
   - Identify areas for improvement

## Business Logic

### Adaptive Question Selection

The platform implements sophisticated logic for selecting the next question:

1. **Difficulty Progression:**
   - Questions follow a matrix of Bloom levels and difficulty
   - For correct answers:
     1. First escalate Bloom level at same difficulty
     2. If at highest Bloom level, increase difficulty and reset Bloom
     3. At highest difficulty and Bloom, maintain level
   - For incorrect answers:
     1. First decrease difficulty at same Bloom level
     2. If at lowest difficulty, decrease Bloom level
     3. At lowest difficulty and Bloom, maintain level

2. **Question Filtering:**
   - System prioritizes unattempted questions
   - Matches next question to target Bloom level and difficulty
   - Falls back to similar questions if exact match not available

### Concept Mastery Determination

A concept is considered mastered when:
- Student has ≥2 correct answers at Medium or higher difficulty, OR
- Student has ≥1 correct answer at Hard difficulty

### Star System

Stars are awarded based on:
- White stars: For all attempts (including incorrect)
- Bronze stars: Correct answers on Easy questions
- Silver stars: Correct answers on Medium questions
- Gold stars: Correct answers on Hard questions

Proficiency score calculation:
- `proficiencyScore = (coloredStars / totalStars) * 100`
- Colored stars are any non-white stars (bronze, silver, gold)

## Technical Implementation

### Authentication Flow

1. User enters email and password
2. System authenticates with Supabase Auth
3. User profile is fetched from the profiles table
4. User is redirected to role-specific dashboard

### PDF Processing Pipeline

1. File uploaded through client-side interface
2. PDF parsed using PDF.js in browser
3. Text content extracted page-by-page
4. Content stored in pdf_pages table
5. Edge function triggered to extract concepts
6. AI processes content to identify key concepts
7. Concepts stored in concepts table

### Question Generation Process

1. Teacher initiates question generation
2. Edge function invoked with concept ID
3. Concept content retrieved from database
4. AI generates questions with varying Bloom levels and difficulties
5. Generated questions stored in questions table
6. Options stored in options table with misconception tags

### Adaptive Practice Session

1. Student initiates practice for a concept
2. System creates new session record
3. Next question selected based on adaptive logic
4. Student submits answer
5. System records attempt and updates mastery
6. For incorrect answers with misconception tags:
   - Generate personalized explanation
   - Present explanation in Teaching Buddy interface
7. Process repeats until concept is completed or mastered