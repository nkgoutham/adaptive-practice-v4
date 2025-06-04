/**
 * Analytics store using Zustand
 * Manages teacher analytics data
 */
import { create } from 'zustand';
import { StudentAnalytics, ClassAnalytics, ConceptMastery } from '../types';
import { useStudentProgressStore } from './studentProgressStore';
import { useContentStore } from './contentStore';
import { useAuthStore } from './authStore';

interface AnalyticsState {
  studentAnalytics: Record<string, StudentAnalytics>;
  classAnalytics: Record<string, ClassAnalytics>; // chapterId -> ClassAnalytics
  isLoading: boolean;
  error: string | null;
  
  // Student analytics methods
  getStudentAnalytics: (studentId: string) => StudentAnalytics | null;
  generateStudentAnalytics: (studentId: string) => StudentAnalytics;
  
  // Class analytics methods
  getClassAnalytics: (chapterId: string) => ClassAnalytics | null;
  generateClassAnalytics: (chapterId: string) => ClassAnalytics;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  studentAnalytics: {},
  classAnalytics: {},
  isLoading: false,
  error: null,
  
  // Student analytics methods
  getStudentAnalytics: (studentId: string) => {
    return get().studentAnalytics[studentId] || null;
  },
  
  generateStudentAnalytics: (studentId: string) => {
    const progressStore = useStudentProgressStore.getState();
    const contentStore = useContentStore.getState();
    
    // Get all sessions for this student
    const studentSessions = progressStore.sessions.filter(
      session => session.studentId === studentId
    );
    
    if (studentSessions.length === 0) {
      const emptyAnalytics: StudentAnalytics = {
        studentId,
        conceptMasteries: [],
        timeSpent: 0,
        totalAttempts: 0,
        correctAttempts: 0,
        misconceptionsEncountered: []
      };
      
      set(state => ({
        studentAnalytics: {
          ...state.studentAnalytics,
          [studentId]: emptyAnalytics
        }
      }));
      
      return emptyAnalytics;
    }
    
    // Calculate total time spent
    const timeSpent = studentSessions.reduce((total, session) => {
      if (!session.finishedAt) return total;
      
      const startTime = new Date(session.startedAt).getTime();
      const endTime = new Date(session.finishedAt).getTime();
      return total + (endTime - startTime) / 1000; // Convert to seconds
    }, 0);
    
    // Get all attempts
    const allAttempts = studentSessions.flatMap(session => session.attempts);
    const totalAttempts = allAttempts.length;
    const correctAttempts = allAttempts.filter(attempt => attempt.isCorrect).length;
    
    // Get concept masteries
    const conceptMasteries = progressStore.getConceptMasteriesByStudentId(studentId);
    
    // Calculate misconceptions encountered
    const misconceptionsEncountered: string[] = [];
    
    allAttempts.forEach(attempt => {
      if (attempt.isCorrect || !attempt.selectedOptionId) return;
      
      // Find the question and selected option
      const question = contentStore.getQuestionById(attempt.questionId);
      if (!question) return;
      
      const selectedOption = question.options.find(
        option => option.id === attempt.selectedOptionId
      );
      
      if (selectedOption?.misconceptionTag) {
        misconceptionsEncountered.push(selectedOption.misconceptionTag);
      }
    });
    
    // Create analytics object
    const analytics: StudentAnalytics = {
      studentId,
      conceptMasteries,
      timeSpent,
      totalAttempts,
      correctAttempts,
      misconceptionsEncountered: [...new Set(misconceptionsEncountered)] // Unique tags
    };
    
    set(state => ({
      studentAnalytics: {
        ...state.studentAnalytics,
        [studentId]: analytics
      }
    }));
    
    return analytics;
  },
  
  // Class analytics methods
  getClassAnalytics: (chapterId: string) => {
    return get().classAnalytics[chapterId] || null;
  },
  
  generateClassAnalytics: (chapterId: string) => {
    const progressStore = useStudentProgressStore.getState();
    const contentStore = useContentStore.getState();
    const authStore = useAuthStore.getState();
    
    // Get all students (in a real app, would filter by class)
    const students = [
      'student-1',
      'student-2',
      'student-3'
    ];
    
    // Get all concepts for this chapter
    const concepts = contentStore.getConceptsByChapterId(chapterId);
    
    // Calculate concept heatmap
    const conceptHeatmap = concepts.map(concept => {
      let totalProficiency = 0;
      let studentCount = 0;
      
      students.forEach(studentId => {
        const masteries = progressStore.getConceptMasteriesByStudentId(studentId);
        const mastery = masteries.find(m => m.conceptId === concept.id);
        
        if (mastery) {
          totalProficiency += mastery.proficiencyScore;
          studentCount++;
        }
      });
      
      const averageProficiency = studentCount > 0 
        ? Math.round(totalProficiency / studentCount) 
        : 0;
      
      return {
        conceptId: concept.id,
        conceptName: concept.name,
        averageProficiency
      };
    });
    
    // Calculate hardest concepts
    const hardestConcepts = concepts.map(concept => {
      let totalAttempts = 0;
      let studentCount = 0;
      
      students.forEach(studentId => {
        // Get all sessions for this student and chapter
        const studentSessions = progressStore.sessions.filter(
          session => session.studentId === studentId && session.chapterId === chapterId
        );
        
        if (studentSessions.length === 0) return;
        
        // Count attempts for this concept
        let conceptAttempts = 0;
        
        studentSessions.forEach(session => {
          session.attempts.forEach(attempt => {
            const question = contentStore.getQuestionById(attempt.questionId);
            if (question?.conceptId === concept.id) {
              conceptAttempts++;
            }
          });
        });
        
        if (conceptAttempts > 0) {
          totalAttempts += conceptAttempts;
          studentCount++;
        }
      });
      
      const averageAttempts = studentCount > 0 
        ? Math.round(totalAttempts / studentCount * 10) / 10 
        : 0;
      
      return {
        conceptId: concept.id,
        conceptName: concept.name,
        averageAttempts
      };
    }).sort((a, b) => b.averageAttempts - a.averageAttempts);
    
    // Generate suggested interventions
    const suggestedInterventions = conceptHeatmap
      .filter(item => item.averageProficiency < 50)
      .sort((a, b) => a.averageProficiency - b.averageProficiency)
      .slice(0, 3)
      .map(item => ({
        conceptId: item.conceptId,
        conceptName: item.conceptName,
        reason: `Low class proficiency (${item.averageProficiency}%)`
      }));
    
    // Create class analytics object
    const analytics: ClassAnalytics = {
      conceptHeatmap,
      hardestConcepts: hardestConcepts.slice(0, 5),
      suggestedInterventions
    };
    
    set(state => ({
      classAnalytics: {
        ...state.classAnalytics,
        [chapterId]: analytics
      }
    }));
    
    return analytics;
  }
}));