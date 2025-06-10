## **Supabase Backend**

### **Edge Functions (supabase/functions/)**

* extract-concepts/index.ts \- AI-powered concept extraction  
  * Dependencies: OpenAI API, Supabase client  
  * Features: PDF content analysis, concept identification, fallback processing  
* generate-questions/index.ts \- AI question generation  
  * Dependencies: OpenAI API, Supabase client  
  * Features: Bloom taxonomy questions, difficulty levels, misconception tagging  
* generate-misconception-explanation/index.ts \- Personalized explanations  
  * Dependencies: OpenAI API, Supabase client  
  * Features: Context-aware explanations, fallback responses  
* parse-pdf/index.ts \- PDF processing (legacy)  
  * Status: Deprecated in favor of client-side processing

### **Database Migrations (supabase/migrations/)**

* 20250604115754\_golden\_darkness.sql \- User profiles setup  
* 20250604120450\_noisy\_fire.sql \- Core content tables  
* 20250604121839\_shiny\_night.sql \- Chapter content storage  
* 20250604130246\_muddy\_stream.sql \- RLS policy fixes  
* 20250604134053\_fancy\_valley.sql \- PDF pages table  
* 20250604165040\_morning\_hill.sql \- Math misconception tags  
* 20250604172402\_silent\_river.sql \- Question edit history  
* 20250605110529\_little\_ocean.sql \- Concept page ranges  
* 20250605132109\_damp\_mountain.sql \- Edit history RLS updates

## **Documentation**

* database-schema.md \- Database schema documentation  
* file-structure.md \- This file  
* implemented-features.md \- Feature documentation

## **Dependencies Summary**

### **Frontend Dependencies**

* React 18 \- UI framework  
* TypeScript \- Type safety  
* Vite \- Build tool  
* Tailwind CSS \- Styling  
* Zustand \- State management  
* React Router DOM \- Routing  
* Framer Motion \- Animations  
* Lucide React \- Icons  
* PDF.js \- PDF processing  
* Supabase JS \- Backend client

### **Backend Dependencies**

* Supabase \- Database, auth, edge functions  
* OpenAI API \- AI content generation  
* PostgreSQL \- Database (via Supabase)

## **Architecture Notes**

### **State Management Pattern**

* Zustand stores for client state  
* Supabase for server state and real-time updates  
* TypeScript for type safety across stores

### **Component Architecture**

* Atomic design principles  
* Composition over inheritance  
* Props interface definitions  
* Reusable UI components

### **Data Flow**

1. User interactions trigger store actions  
2. Stores communicate with Supabase  
3. Edge functions handle AI processing  
4. Real-time updates via Supabase subscriptions  
5. Optimistic UI updates where appropriate

### **Security Model**

* Row Level Security (RLS) on all tables  
* Role-based access control  
* JWT-based authentication  
* API key protection for AI services

\# Database Schema Documentation

## **Overview**

The Adaptive Practice platform uses PostgreSQL (via Supabase) with Row Level Security (RLS) enabled on all tables. The schema supports an educational platform where teachers upload content and students practice with adaptive questions.

## **Tables**

### **Authentication & User Management**

#### **profiles**

Purpose: Stores user information linked to Supabase Auth users.

Columns:

* id (UUID, PRIMARY KEY) \- Links to auth.users.id  
* role (TEXT, NOT NULL) \- Either 'teacher' or 'student'  
* name (TEXT, NOT NULL) \- User's display name  
* avatar (TEXT, NULLABLE) \- URL to user's avatar image  
* created\_at (TIMESTAMPTZ, DEFAULT now()) \- Account creation timestamp  
* updated\_at (TIMESTAMPTZ, DEFAULT now()) \- Last update timestamp

Constraints:

* profiles\_role\_check: Role must be 'teacher' or 'student'

Foreign Keys:

* profiles\_id\_fkey: References auth.users(id) ON DELETE CASCADE

RLS Policies:

* Anyone can read profiles: All authenticated users can read any profile  
* Users can update their own profile: Users can update only their own data  
* Profiles can be created by the user: Users can create their own profile

### **Content Management**

#### **chapters**

Purpose: Stores educational chapters uploaded by teachers.

Columns:

* id (UUID, PRIMARY KEY, DEFAULT gen\_random\_uuid())  
* title (TEXT, NOT NULL) \- Chapter title  
* grade (INTEGER, NOT NULL) \- Target grade level  
* subject (TEXT, NOT NULL) \- Subject area  
* teacher\_id (UUID, NOT NULL) \- Reference to teacher who created it  
* created\_at (TIMESTAMPTZ, DEFAULT now())  
* updated\_at (TIMESTAMPTZ, DEFAULT now())  
* is\_published (BOOLEAN, DEFAULT false) \- Publication status  
* content (TEXT, NULLABLE) \- Raw chapter content  
* processing\_status (TEXT, NULLABLE) \- Current AI processing stage  
* processing\_error (TEXT, NULLABLE) \- Error message if processing failed

Constraints:

* chapters\_processing\_status\_check: Status must be 'uploading', 'extracting', 'generating', 'completed', or 'error'

Foreign Keys:

* chapters\_teacher\_id\_fkey: References profiles(id) ON DELETE CASCADE

RLS Policies:

* Anyone can view chapters: All authenticated users can view any chapter  
* Teachers can create chapters: Teachers can create new chapters  
* Teachers can update their own chapters: Teachers can modify their own chapters  
* Teachers can delete their own chapters: Teachers can delete their own chapters

#### **concepts**

Purpose: Stores educational concepts extracted from chapters.

Columns:

* id (UUID, PRIMARY KEY, DEFAULT gen\_random\_uuid())  
* chapter\_id (UUID, NOT NULL) \- Reference to parent chapter  
* name (TEXT, NOT NULL) \- Concept name  
* created\_at (TIMESTAMPTZ, DEFAULT now())  
* is\_published (BOOLEAN, DEFAULT false) \- Publication status  
* start\_page\_number (INTEGER, NULLABLE) \- Starting page in chapter  
* end\_page\_number (INTEGER, NULLABLE) \- Ending page in chapter

Foreign Keys:

* concepts\_chapter\_id\_fkey: References chapters(id) ON DELETE CASCADE

RLS Policies:

* Anyone can view concepts: All authenticated users can view any concept  
* Students can view all concepts: Additional policy for student access  
* Students can view published concepts: Restricts access to published concepts  
* Teachers can manage their concepts: Teachers can manage concepts in their chapters

#### **pdf\_pages**

Purpose: Stores extracted text content from each page of uploaded PDFs.

Columns:

* id (UUID, PRIMARY KEY, DEFAULT gen\_random\_uuid())  
* chapter\_id (UUID, NOT NULL) \- Reference to chapter  
* page\_number (INTEGER, NOT NULL) \- Page number in the PDF  
* content (TEXT, NOT NULL) \- Extracted text content  
* created\_at (TIMESTAMPTZ, DEFAULT now())

Indexes:

* pdf\_pages\_chapter\_id\_page\_number\_idx: Composite index on (chapter\_id, page\_number)

Foreign Keys:

* pdf\_pages\_chapter\_id\_fkey: References chapters(id) ON DELETE CASCADE

RLS Policies:

* Teachers can manage pdf pages for their chapters: Full CRUD access for teachers  
* Students can read pdf pages from published chapters: Read-only access for students

### **Question Management**

#### **questions**

Purpose: Stores practice questions for concepts.

Columns:

* id (UUID, PRIMARY KEY, DEFAULT gen\_random\_uuid())  
* concept\_id (UUID, NOT NULL) \- Reference to parent concept  
* bloom\_level (TEXT, NOT NULL) \- Bloom's taxonomy level  
* difficulty (TEXT, NOT NULL) \- Question difficulty level  
* stem (TEXT, NOT NULL) \- Question text  
* created\_at (TIMESTAMPTZ, DEFAULT now())  
* last\_updated\_by (UUID, NULLABLE) \- Reference to user who last updated  
* last\_updated\_at (TIMESTAMPTZ, DEFAULT now()) \- Last update timestamp

Constraints:

* questions\_bloom\_level\_check: Must be 'Recall', 'Conceptual', 'Application', or 'Analysis'  
* questions\_difficulty\_check: Must be 'Easy', 'Medium', or 'Hard'

Foreign Keys:

* questions\_concept\_id\_fkey: References concepts(id) ON DELETE CASCADE  
* questions\_last\_updated\_by\_fkey: References profiles(id)

RLS Policies:

* Anyone can view questions: All authenticated users can view any question  
* Students can view published questions: Students can view questions for published concepts  
* Students can view questions for published concepts: Additional policy for student access  
* Teachers can manage questions for their chapters: Teachers can manage questions in their chapters

#### **options**

Purpose: Stores answer options for questions.

Columns:

* id (UUID, PRIMARY KEY, DEFAULT gen\_random\_uuid())  
* question\_id (UUID, NOT NULL) \- Reference to parent question  
* text (TEXT, NOT NULL) \- Option text  
* is\_correct (BOOLEAN, NOT NULL) \- Whether this option is correct  
* misconception\_tag (TEXT, NULLABLE) \- Reference to misconception if incorrect  
* created\_at (TIMESTAMPTZ, DEFAULT now())

Foreign Keys:

* options\_question\_id\_fkey: References questions(id) ON DELETE CASCADE  
* options\_misconception\_tag\_fkey: References misconceptions(tag) ON DELETE SET NULL

RLS Policies:

* Anyone can view options: All authenticated users can view any option  
* Students can view options for published concepts: Students can view options for published concepts  
* Teachers can manage options for their questions: Teachers can manage options for their questions

#### **misconceptions**

Purpose: Stores common educational misconceptions and explanations.

Columns:

* tag (TEXT, PRIMARY KEY) \- Unique identifier for the misconception  
* explanation (TEXT, NOT NULL) \- Explanation of the misconception  
* created\_at (TIMESTAMPTZ, DEFAULT now())

RLS Policies:

* Anyone can view misconceptions: All authenticated users can view misconceptions

#### **question\_edit\_history**

Purpose: Tracks edits made to questions for audit purposes.

Columns:

* id (UUID, PRIMARY KEY, DEFAULT gen\_random\_uuid())  
* question\_id (UUID, NOT NULL) \- Reference to question  
* user\_id (UUID, NOT NULL) \- Reference to user who made the edit  
* timestamp (TIMESTAMPTZ, DEFAULT now()) \- Edit timestamp  
* previous\_value (JSONB, NOT NULL) \- Previous question data  
* new\_value (JSONB, NOT NULL) \- New question data

Indexes:

* question\_edit\_history\_question\_id\_idx: Index on question\_id for faster queries

Foreign Keys:

* question\_edit\_history\_question\_id\_fkey: References questions(id) ON DELETE CASCADE  
* question\_edit\_history\_user\_id\_fkey: References profiles(id) ON DELETE CASCADE

RLS Policies:

* Authenticated users can manage edit history: All authenticated users can manage edit history

### **Student Progress Tracking**

#### **student\_sessions**

Purpose: Tracks student practice sessions.

Columns:

* id (UUID, PRIMARY KEY, DEFAULT gen\_random\_uuid())  
* student\_id (UUID, NOT NULL) \- Reference to student  
* chapter\_id (UUID, NOT NULL) \- Reference to chapter being practiced  
* started\_at (TIMESTAMPTZ, DEFAULT now()) \- Session start timestamp  
* finished\_at (TIMESTAMPTZ, NULLABLE) \- Session end timestamp

Foreign Keys:

* student\_sessions\_student\_id\_fkey: References profiles(id) ON DELETE CASCADE  
* student\_sessions\_chapter\_id\_fkey: References chapters(id) ON DELETE CASCADE

RLS Policies:

* Students can manage their own sessions: Students can manage only their sessions  
* Teachers can view sessions for their chapters: Teachers can view sessions for their chapters

#### **attempts**

Purpose: Records student attempts at answering questions.

Columns:

* id (UUID, PRIMARY KEY, DEFAULT gen\_random\_uuid())  
* session\_id (UUID, NOT NULL) \- Reference to practice session  
* question\_id (UUID, NOT NULL) \- Reference to question attempted  
* is\_correct (BOOLEAN, NOT NULL) \- Whether the answer was correct  
* selected\_option\_id (UUID, NULLABLE) \- Reference to selected answer option  
* answered\_at (TIMESTAMPTZ, DEFAULT now()) \- Timestamp when question was answered

Foreign Keys:

* attempts\_session\_id\_fkey: References student\_sessions(id) ON DELETE CASCADE  
* attempts\_question\_id\_fkey: References questions(id) ON DELETE CASCADE  
* attempts\_selected\_option\_id\_fkey: References options(id) ON DELETE SET NULL

RLS Policies:

* Students can manage their own attempts: Students can manage only their attempts  
* Teachers can view attempts: Teachers can view attempts for their chapters

## **Row Level Security (RLS) Overview**

All tables have RLS enabled with policies that enforce:

### **Teacher Access Control**

* Teachers can view and manage only their own content (chapters, concepts, questions)  
* Teachers can view analytics for students practicing their content  
* Teachers cannot access other teachers' content

### **Student Access Control**

* Students can view only published content  
* Students can manage only their own practice sessions and attempts  
* Students cannot access draft or unpublished content  
* Students cannot modify content created by teachers

### **General Security**

* All operations require authentication  
* No public access to any tables  
* Role-based access control through profile.role column

## **Edge Functions**

### **extract-concepts**

Purpose: AI-powered extraction of educational concepts from PDF content.

Dependencies:

* OpenAI API for concept extraction  
* Supabase client for database operations

Functionality:

* Processes uploaded PDF content  
* Extracts key educational concepts  
* Identifies page ranges for each concept  
* Generates misconception tags  
* Fallback processing when AI is unavailable

Error Handling:

* Robust JSON parsing for AI responses  
* Graceful degradation to basic extraction  
* Comprehensive logging for debugging

### **generate-questions**

Purpose: AI-powered generation of practice questions for concepts.

Dependencies:

* OpenAI API for question generation  
* Supabase client for database operations

Functionality:

* Generates questions across Bloom taxonomy levels  
* Creates questions at different difficulty levels  
* Assigns misconception tags to incorrect options  
* Avoids duplicate questions through similarity checking  
* Supports custom regeneration instructions

Question Matrix:

* Bloom Levels: Recall, Conceptual, Application, Analysis  
* Difficulty Levels: Easy, Medium, Hard  
* Total: 12 questions per concept (4 × 3 matrix)

### **generate-misconception-explanation**

Purpose: Generates personalized explanations for student misconceptions.

Dependencies:

* OpenAI API for explanation generation  
* Supabase client for context retrieval

Functionality:

* Context-aware explanations based on question and misconception  
* Personalized feedback for incorrect answers  
* Fallback explanations when AI is unavailable  
* Non-judgmental, educational tone

## **Data Relationships**

### **Content Hierarchy**

Teachers → Chapters → Concepts → Questions → Options  
                  ↓  
               PDF Pages

### **Learning Progress**

Students → Sessions → Attempts → Selected Options  
                  ↓  
             Question Responses

### **Misconception System**

Misconceptions ← Options ← Questions  
                    ↓  
           Student Attempts → AI Explanations

## **Migration History**

1. Profiles Setup \- User authentication and role management  
2. Core Content \- Chapters, concepts, questions, and options  
3. Content Storage \- PDF processing and storage columns  
4. RLS Fixes \- Security policy refinements  
5. PDF Pages \- Extracted content storage  
6. Misconceptions \- Math-specific misconception tags  
7. Edit History \- Question modification tracking  
8. Page Ranges \- Concept location tracking

## **Performance Considerations**

### **Indexes**

* pdf\_pages\_chapter\_id\_page\_number\_idx: Fast page retrieval  
* question\_edit\_history\_question\_id\_idx: Efficient edit history queries  
* Primary key indexes on all UUID columns

### **Query Optimization**

* RLS policies designed for efficient filtering  
* Foreign key constraints ensure referential integrity  
* Composite indexes for common query patterns

## **Security Features**

### **Authentication**

* JWT-based authentication via Supabase Auth  
* Session management with automatic token refresh  
* Role-based access control

### **Data Protection**

* Row Level Security on all tables  
* Encrypted connections (TLS)  
* API key protection for external services  
* Input validation and sanitization

### **Audit Trail**

* Question edit history tracking  
* Timestamp tracking on all operations  
* User attribution for all modifications