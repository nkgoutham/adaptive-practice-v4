# Project File Structure

## Core Application Files

- **index.html**: Main HTML entry point with font imports and basic page structure
- **src/main.tsx**: React application entry point that renders the App component
- **src/App.tsx**: Main component with routing for student and teacher pages, implements PrivateRoute for authentication
- **src/index.css**: Global CSS file with Tailwind CSS imports
- **src/vite-env.d.ts**: TypeScript declarations for Vite

## Configuration Files

- **package.json**: Project dependencies and scripts
- **tailwind.config.js**: Tailwind CSS configuration with custom colors, box shadows, and animations
- **postcss.config.js**: PostCSS configuration for Tailwind
- **vite.config.ts**: Vite bundler configuration
- **tsconfig.json**, **tsconfig.app.json**, **tsconfig.node.json**: TypeScript configuration files
- **eslint.config.js**: ESLint configuration for code linting

## Supabase Configuration

- **src/lib/supabase.ts**: Supabase client configuration
- **src/types/supabase.ts**: TypeScript types for Supabase database schema

## Supabase Edge Functions

- **supabase/functions/extract-concepts/index.ts**: Edge function that extracts educational concepts from chapter content using AI
- **supabase/functions/generate-questions/index.ts**: Edge function that generates practice questions for concepts using AI
- **supabase/functions/generate-misconception-explanation/index.ts**: Edge function that provides personalized explanations for misconceptions
- **supabase/functions/parse-pdf/index.ts**: Edge function for processing uploaded PDF files

## Type Definitions

- **src/types/index.ts**: Core type definitions for the application (User, Chapter, Question, etc.)

## State Management (Zustand Stores)

- **src/store/authStore.ts**: Authentication state management
- **src/store/contentStore.ts**: Content management for chapters, concepts, and questions
- **src/store/studentProgressStore.ts**: Student progress tracking and adaptive learning logic
- **src/store/analyticsStore.ts**: Analytics for student and class performance

## Pages

### Authentication
- **src/pages/LoginPage.tsx**: User login page

### Student Pages
- **src/pages/student/StudentChaptersPage.tsx**: Student dashboard showing available chapters
- **src/pages/student/StudentPracticePage.tsx**: Interactive practice page for students
- **src/pages/student/StudentProgressPage.tsx**: Student progress tracking and performance overview

### Teacher Pages
- **src/pages/teacher/TeacherUploadPage.tsx**: PDF chapter upload interface
- **src/pages/teacher/TeacherChaptersPage.tsx**: Teacher's chapter management dashboard
- **src/pages/teacher/TeacherGeneratePage.tsx**: Question generation and concept management
- **src/pages/teacher/TeacherAnalyticsPage.tsx**: Analytics dashboard for class performance

## Components

### Layout
- **src/components/Layout.tsx**: Main layout with header and sidebar navigation

### UI Components
- **src/components/ui/Button.tsx**: Reusable button component with variants
- **src/components/ui/Card.tsx**: Card component for content containers
- **src/components/ui/ConfirmationModal.tsx**: Modal for confirming actions
- **src/components/ui/ProgressBar.tsx**: Visual progress indicator
- **src/components/ui/Star.tsx**: Star component for gamification
- **src/components/ui/TeachingBuddyCard.tsx**: Explanation component for misconceptions
- **src/components/ui/ConceptMasteryIndicator.tsx**: Visual indicator for concept proficiency

### Student Components
- **src/components/student/ChapterCard.tsx**: Card displaying chapter information for students
- **src/components/student/ConceptCard.tsx**: Card displaying concept information
- **src/components/student/QuestionCard.tsx**: Interactive question card for student practice
- **src/components/student/StarStreak.tsx**: Visual display of earned stars

### Teacher Components
- **src/components/teacher/ConceptHeatmap.tsx**: Heatmap visualization for concept mastery
- **src/components/teacher/PDFUploader.tsx**: Component for uploading and processing PDFs
- **src/components/teacher/QuestionCard.tsx**: Question display for teacher review
- **src/components/teacher/QuestionEditModal.tsx**: Modal for editing questions
- **src/components/teacher/QuestionReviewList.tsx**: List for reviewing generated questions

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **State Management**: Zustand
- **UI Animation**: Framer Motion
- **Icons**: Lucide React
- **Backend/Database**: Supabase (Auth, Database, Storage, Edge Functions)
- **PDF Processing**: PDF.js
- **AI Integration**: OpenAI API (via Edge Functions)