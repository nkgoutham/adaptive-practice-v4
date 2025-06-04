/**
 * Type definitions for the Adaptive Practice application
 */

// User types
export type UserRole = 'teacher' | 'student';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// Chapter and content types
export interface Chapter {
  id: string;
  title: string;
  grade: number;
  subject: string;
  concepts: Concept[];
  createdAt: string;
}

export interface Concept {
  id: string;
  chapterId: string;
  name: string;
  questions: Question[];
}

export type BloomLevel = 'Recall' | 'Conceptual' | 'Application' | 'Analysis';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  conceptId: string;
  bloomLevel: BloomLevel;
  difficulty: DifficultyLevel;
  stem: string;
  options: QuestionOption[];
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  isCorrect: boolean;
  misconceptionTag?: string;
}

export interface Misconception {
  tag: string;
  explanation: string;
}

// Student progress types
export interface StudentSession {
  id: string;
  studentId: string;
  chapterId: string;
  startedAt: string;
  finishedAt?: string;
  attempts: Attempt[];
}

export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  isCorrect: boolean;
  answeredAt: string;
  selectedOptionId?: string;
}

export interface ConceptMastery {
  conceptId: string;
  conceptName: string;
  proficiencyScore: number; // 0-100
  totalStars: number;
  coloredStars: number;
}

// Star types for gamification
export type StarType = 'white' | 'bronze' | 'silver' | 'gold';

export interface Star {
  type: StarType;
  earnedAt: string;
  questionId: string;
}

// Analytics types
export interface StudentAnalytics {
  studentId: string;
  conceptMasteries: ConceptMastery[];
  timeSpent: number; // in seconds
  totalAttempts: number;
  correctAttempts: number;
  misconceptionsEncountered: string[];
}

export interface ClassAnalytics {
  conceptHeatmap: {
    conceptId: string;
    conceptName: string;
    averageProficiency: number;
  }[];
  hardestConcepts: {
    conceptId: string;
    conceptName: string;
    averageAttempts: number;
  }[];
  suggestedInterventions: {
    conceptId: string;
    conceptName: string;
    reason: string;
  }[];
}