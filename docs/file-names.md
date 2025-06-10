## **Overview**

This document provides a comprehensive overview of all files in the Adaptive Practice platform, including their purpose, components, functions, and dependencies.

## **Root Configuration Files**

### **Package & Build Configuration**

* package.json \- Project dependencies and npm scripts  
  * Dependencies: React, Supabase, Zustand, Framer Motion, Lucide React, PDF.js  
  * Scripts: dev, build, preview  
* vite.config.ts \- Vite bundler configuration  
  * Plugins: React SWC  
  * Optimizations: Excludes lucide-react from pre-bundling  
* tsconfig.json \- TypeScript configuration root  
* tsconfig.app.json \- TypeScript config for application code  
* tsconfig.node.json \- TypeScript config for Node.js files

### **Styling Configuration**

* tailwind.config.js \- Tailwind CSS configuration  
  * Custom color palette (primary, secondary, accent, success, warning, error, neutral)  
  * Custom shadows and animations  
  * Font configuration (Inter)  
* postcss.config.js \- PostCSS configuration for Tailwind  
* eslint.config.js \- ESLint configuration for code linting

### **Application Entry Points**

* index.html \- Main HTML template with font imports  
* src/main.tsx \- React application entry point  
  * Renders App component with StrictMode

## **Source Code Structure**

### **Core Application**

* src/App.tsx \- Main application component  
  * Functions: PrivateRoute wrapper component  
  * Dependencies: React Router, auth store  
  * Features: Route protection, role-based navigation

### **Layout Components**

* src/components/Layout.tsx \- Main application layout  
  * Components: Header, sidebar navigation, main content area  
  * Dependencies: Auth store, navigation icons  
  * Features: Role-based navigation, user profile display

### **UI Components (src/components/ui/)**

* Button.tsx \- Reusable button component  
  * Variants: primary, secondary, outline, ghost, success, warning, error  
  * Features: Loading states, animations, size variants  
* Card.tsx \- Content container component  
  * Features: Elevation levels, hover effects, animations  
* ConfirmationModal.tsx \- Modal for user confirmation  
  * Dependencies: Framer Motion for animations  
* ProgressBar.tsx \- Progress visualization component  
  * Features: Animated progress, color variants  
* Star.tsx \- Gamification star component  
  * Types: white, bronze, silver, gold  
  * Features: Animations, size variants  
* TeachingBuddyCard.tsx \- Misconception explanation modal  
  * Dependencies: Framer Motion, Lucide icons  
  * Features: Modal overlay, loading states  
* ConceptMasteryIndicator.tsx \- Progress visualization for concepts  
  * Dependencies: Star component, progress animations

### **Student Components (src/components/student/)**

* ChapterCard.tsx \- Chapter display for students  
  * Dependencies: UI components (Card, Button, ProgressBar)  
  * Features: Progress tracking, publication status  
* ConceptCard.tsx \- Individual concept display  
  * Features: Mastery indicators, practice availability  
* QuestionCard.tsx \- Interactive question component  
  * Dependencies: Teaching Buddy, Star components  
  * Features: Option shuffling, answer validation, star rewards  
* StarStreak.tsx \- Star progress visualization  
  * Dependencies: Star component, Framer Motion  
  * Features: Progress levels, animated display

### **Teacher Components (src/components/teacher/)**

* ConceptHeatmap.tsx \- Analytics visualization  
  * Features: Color-coded proficiency display  
* PDFUploader.tsx \- PDF upload and processing  
  * Dependencies: PDF.js, Supabase client  
  * Features: Drag-and-drop, client-side PDF parsing, progress tracking  
* QuestionCard.tsx \- Question display for teachers  
  * Features: Edit/delete actions, option visualization  
* QuestionEditModal.tsx \- Question editing interface  
  * Dependencies: Content store, misconception data  
  * Features: Form validation, option management  
* QuestionReviewList.tsx \- Batch question management  
  * Dependencies: Question components, confirmation modal  
  * Features: Filtering, publishing, bulk operations

### **Pages**

#### **Authentication**

* src/pages/LoginPage.tsx \- User login interface  
  * Dependencies: Auth store, UI components  
  * Features: Form validation, role-based redirection

#### **Student Pages (src/pages/student/)**

* StudentChaptersPage.tsx \- Chapter browser  
  * Dependencies: Content store, progress store  
  * Features: Chapter filtering, progress display  
* StudentPracticePage.tsx \- Practice interface  
  * Dependencies: Question components, progress tracking  
  * Features: Adaptive question selection, session management  
* StudentProgressPage.tsx \- Progress dashboard  
  * Dependencies: Progress store, analytics store  
  * Features: Statistics, mastery indicators, star tracking

#### **Teacher Pages (src/pages/teacher/)**

* TeacherUploadPage.tsx \- PDF upload interface  
  * Dependencies: PDF uploader component  
* TeacherChaptersPage.tsx \- Chapter management  
  * Dependencies: Content store  
  * Features: Chapter overview, status tracking  
* TeacherGeneratePage.tsx \- Question generation interface  
  * Dependencies: Content store, question components  
  * Features: Concept management, question generation, publishing  
* TeacherAnalyticsPage.tsx \- Analytics dashboard  
  * Dependencies: Analytics store, visualization components  
  * Features: Class performance, student analysis

### **State Management (src/store/)**

* authStore.ts \- Authentication state management  
  * Functions: login, logout, checkSession  
  * Dependencies: Supabase auth  
* contentStore.ts \- Content and question management  
  * Functions: Chapter/concept/question CRUD operations  
  * Dependencies: Supabase client, types  
* studentProgressStore.ts \- Student progress tracking  
  * Functions: Session management, attempt tracking, adaptive logic  
  * Dependencies: Content store, Supabase client  
* analyticsStore.ts \- Analytics data processing  
  * Functions: Performance calculations, class analytics  
  * Dependencies: Progress store, content store

### **Type Definitions**

* src/types/index.ts \- Core application types  
  * Types: User, Chapter, Concept, Question, StudentSession, Analytics  
* src/types/supabase.ts \- Generated Supabase database types  
* src/vite-env.d.ts \- Vite environment type declarations

### **Utility Libraries**

* src/lib/supabase.ts \- Supabase client configuration  
  * Dependencies: Supabase SDK, environment variables
