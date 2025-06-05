/**
 * Student Progress store using Zustand
 * Manages student practice sessions, attempts, and progress data
 */
import { create } from 'zustand';
import { StudentSession, Attempt, ConceptMastery, Star, Question, BloomLevel, DifficultyLevel } from '../types';
import { supabase } from '../lib/supabase';
import { useContentStore } from './contentStore';

interface StudentProgressState {
  currentSession: StudentSession | null;
  sessions: StudentSession[];
  stars: Record<string, Star[]>; // studentId -> stars
  conceptMasteries: Record<string, ConceptMastery[]>; // studentId -> concept masteries
  isLoading: boolean;
  error: string | null;
  
  // Session methods
  startSession: (studentId: string, chapterId: string) => Promise<StudentSession>;
  endSession: (sessionId: string) => Promise<void>;
  getCurrentSession: () => StudentSession | null;
  fetchStudentSessions: (studentId: string) => Promise<void>;
  
  // Attempt methods
  recordAttempt: (
    questionId: string, 
    isCorrect: boolean, 
    selectedOptionId?: string
  ) => Promise<Attempt>;
  
  // Progress methods
  getStarsByStudentId: (studentId: string) => Star[];
  getConceptMasteriesByStudentId: (studentId: string) => ConceptMastery[];
  updateConceptMastery: (studentId: string, conceptId: string, isCorrect: boolean, question: Question) => void;
  calculateConceptMasteries: (studentId: string) => Promise<void>;
  
  // Adaptive learning methods
  getNextQuestion: (studentId: string, conceptId: string) => Promise<Question | null>;
  isConceptMastered: (studentId: string, conceptId: string) => boolean;
}

export const useStudentProgressStore = create<StudentProgressState>((set, get) => ({
  currentSession: null,
  sessions: [],
  stars: {},
  conceptMasteries: {},
  isLoading: false,
  error: null,
  
  // Fetch student sessions from Supabase
  fetchStudentSessions: async (studentId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: sessions, error } = await supabase
        .from('student_sessions')
        .select(`
          id,
          student_id,
          chapter_id,
          started_at,
          finished_at,
          attempts (
            id,
            question_id,
            is_correct,
            selected_option_id,
            answered_at
          )
        `)
        .eq('student_id', studentId)
        .order('started_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our types
      const formattedSessions: StudentSession[] = sessions.map(session => ({
        id: session.id,
        studentId: session.student_id,
        chapterId: session.chapter_id,
        startedAt: session.started_at,
        finishedAt: session.finished_at || undefined,
        attempts: (session.attempts || []).map(attempt => ({
          id: attempt.id,
          sessionId: session.id,
          questionId: attempt.question_id,
          isCorrect: attempt.is_correct,
          answeredAt: attempt.answered_at,
          selectedOptionId: attempt.selected_option_id || undefined
        }))
      }));
      
      set({ sessions: formattedSessions, isLoading: false });
      
      // Calculate concept masteries based on these sessions
      await get().calculateConceptMasteries(studentId);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch sessions', 
        isLoading: false 
      });
    }
  },
  
  // Session methods
  startSession: async (studentId: string, chapterId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: session, error } = await supabase
        .from('student_sessions')
        .insert({
          student_id: studentId,
          chapter_id: chapterId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newSession: StudentSession = {
        id: session.id,
        studentId: session.student_id,
        chapterId: session.chapter_id,
        startedAt: session.started_at,
        attempts: []
      };
      
      set(state => ({
        currentSession: newSession,
        sessions: [newSession, ...state.sessions],
        isLoading: false
      }));
      
      return newSession;
    } catch (error) {
      console.error('Error starting session:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to start session', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  endSession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('student_sessions')
        .update({ finished_at: new Date().toISOString() })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      set(state => {
        const updatedSessions = state.sessions.map(session => 
          session.id === sessionId 
            ? { ...session, finishedAt: new Date().toISOString() } 
            : session
        );
        
        return {
          sessions: updatedSessions,
          currentSession: state.currentSession?.id === sessionId 
            ? { ...state.currentSession, finishedAt: new Date().toISOString() } 
            : state.currentSession,
          isLoading: false
        };
      });
    } catch (error) {
      console.error('Error ending session:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to end session', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  getCurrentSession: () => {
    return get().currentSession;
  },
  
  // Attempt methods
  recordAttempt: async (questionId: string, isCorrect: boolean, selectedOptionId?: string) => {
    const { currentSession } = get();
    
    if (!currentSession) {
      throw new Error('No active session');
    }
    
    set({ isLoading: true, error: null });
    
    try {
      const { data: attempt, error } = await supabase
        .from('attempts')
        .insert({
          session_id: currentSession.id,
          question_id: questionId,
          is_correct: isCorrect,
          selected_option_id: selectedOptionId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const newAttempt: Attempt = {
        id: attempt.id,
        sessionId: attempt.session_id,
        questionId: attempt.question_id,
        isCorrect: attempt.is_correct,
        answeredAt: attempt.answered_at,
        selectedOptionId: attempt.selected_option_id || undefined
      };
      
      set(state => {
        // Update the current session with this attempt
        const updatedSessions = state.sessions.map(session => 
          session.id === currentSession.id 
            ? { 
                ...session, 
                attempts: [...session.attempts, newAttempt] 
              } 
            : session
        );
        
        const updatedCurrentSession = {
          ...currentSession,
          attempts: [...currentSession.attempts, newAttempt]
        };
        
        return {
          sessions: updatedSessions,
          currentSession: updatedCurrentSession,
          isLoading: false
        };
      });
      
      // Get the question to update concept mastery
      const contentStore = useContentStore.getState();
      const question = contentStore.getQuestionById(questionId);
      if (question) {
        get().updateConceptMastery(
          currentSession.studentId,
          question.conceptId,
          isCorrect,
          question
        );
      }
      
      return newAttempt;
    } catch (error) {
      console.error('Error recording attempt:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to record attempt', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Progress methods
  getStarsByStudentId: (studentId: string) => {
    return get().stars[studentId] || [];
  },
  
  getConceptMasteriesByStudentId: (studentId: string) => {
    return get().conceptMasteries[studentId] || [];
  },
  
  updateConceptMastery: (studentId: string, conceptId: string, isCorrect: boolean, question: Question) => {
    set(state => {
      // Get existing stars for this student or initialize empty array
      const studentStars = state.stars[studentId] || [];
      
      // Determine star type based on correctness and difficulty
      let starType: Star['type'] = 'white'; // Default for attempt
      
      if (isCorrect) {
        switch (question.difficulty) {
          case 'Easy':
            starType = 'bronze';
            break;
          case 'Medium':
            starType = 'silver';
            break;
          case 'Hard':
            starType = 'gold';
            break;
        }
      }
      
      // Create new star
      const newStar: Star = {
        type: starType,
        earnedAt: new Date().toISOString(),
        questionId: question.id
      };
      
      // Add star to student's collection
      const updatedStars = {
        ...state.stars,
        [studentId]: [...studentStars, newStar]
      };
      
      // Update concept mastery
      const studentMasteries = state.conceptMasteries[studentId] || [];
      const existingMastery = studentMasteries.find(m => m.conceptId === conceptId);
      
      let updatedMasteries;
      
      if (existingMastery) {
        // Update existing mastery
        const totalStars = existingMastery.totalStars + 1;
        const coloredStars = existingMastery.coloredStars + (starType !== 'white' ? 1 : 0);
        const proficiencyScore = Math.min(100, Math.round((coloredStars / totalStars) * 100));
        
        updatedMasteries = studentMasteries.map(mastery => 
          mastery.conceptId === conceptId 
            ? { 
                ...mastery, 
                totalStars,
                coloredStars,
                proficiencyScore
              } 
            : mastery
        );
      } else {
        // Create new mastery record
        const contentStore = useContentStore.getState();
        const concept = contentStore.getConceptById(conceptId);
        const conceptName = concept?.name || 'Unknown Concept';
        
        const newMastery: ConceptMastery = {
          conceptId,
          conceptName,
          totalStars: 1,
          coloredStars: starType !== 'white' ? 1 : 0,
          proficiencyScore: starType !== 'white' ? 100 : 0
        };
        
        updatedMasteries = [...studentMasteries, newMastery];
      }
      
      return {
        stars: updatedStars,
        conceptMasteries: {
          ...state.conceptMasteries,
          [studentId]: updatedMasteries
        }
      };
    });
  },
  
  calculateConceptMasteries: async (studentId: string) => {
    set({ isLoading: true });
    
    try {
      // Get all sessions for this student
      const sessions = get().sessions.filter(session => session.studentId === studentId);
      
      if (sessions.length === 0) {
        set({ isLoading: false });
        return;
      }
      
      // Get all attempts across all sessions
      const attempts = sessions.flatMap(session => session.attempts || []);
      
      // Get all questions for these attempts
      const questionIds = [...new Set(attempts.map(attempt => attempt.questionId))];
      
      if (questionIds.length === 0) {
        set({ isLoading: false });
        return;
      }
      
      // Fetch question details from Supabase
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          concept_id,
          difficulty,
          bloom_level,
          concepts (
            id,
            name
          )
        `)
        .in('id', questionIds);
      
      if (questionsError) throw questionsError;
      
      // Create a map of questionId -> questionData for easy lookup
      const questionMap = new Map(
        questionsData.map(q => [
          q.id, 
          { 
            id: q.id, 
            conceptId: q.concept_id, 
            difficulty: q.difficulty, 
            conceptName: q.concepts?.name || 'Unknown' 
          }
        ])
      );
      
      // Calculate stars and masteries
      const stars: Star[] = [];
      const conceptMasteryMap = new Map<string, ConceptMastery>();
      
      for (const attempt of attempts) {
        const question = questionMap.get(attempt.questionId);
        if (!question) continue;
        
        // Determine star type based on correctness and difficulty
        let starType: Star['type'] = 'white'; // Default for attempt
        
        if (attempt.isCorrect) {
          switch (question.difficulty) {
            case 'Easy':
              starType = 'bronze';
              break;
            case 'Medium':
              starType = 'silver';
              break;
            case 'Hard':
              starType = 'gold';
              break;
          }
        }
        
        // Add star
        stars.push({
          type: starType,
          earnedAt: attempt.answeredAt,
          questionId: attempt.questionId
        });
        
        // Update concept mastery
        const conceptId = question.conceptId;
        let mastery = conceptMasteryMap.get(conceptId);
        
        if (!mastery) {
          mastery = {
            conceptId,
            conceptName: question.conceptName,
            totalStars: 0,
            coloredStars: 0,
            proficiencyScore: 0
          };
        }
        
        mastery.totalStars += 1;
        if (starType !== 'white') {
          mastery.coloredStars += 1;
        }
        
        mastery.proficiencyScore = Math.min(100, Math.round((mastery.coloredStars / mastery.totalStars) * 100));
        
        conceptMasteryMap.set(conceptId, mastery);
      }
      
      // Update the store
      set(state => ({
        stars: {
          ...state.stars,
          [studentId]: stars
        },
        conceptMasteries: {
          ...state.conceptMasteries,
          [studentId]: Array.from(conceptMasteryMap.values())
        },
        isLoading: false
      }));
    } catch (error) {
      console.error('Error calculating concept masteries:', error);
      set({ isLoading: false });
    }
  },
  
  // Adaptive learning methods
  getNextQuestion: async (studentId: string, conceptId: string) => {
    set({ isLoading: true });
    
    try {
      // Get all questions for this concept
      const contentStore = useContentStore.getState();
      const allConceptQuestions = contentStore.getQuestionsByConceptId(conceptId);
      
      if (!allConceptQuestions || allConceptQuestions.length === 0) {
        console.log("No questions found for concept:", conceptId);
        set({ isLoading: false });
        return null;
      }
      
      console.log(`Found ${allConceptQuestions.length} questions for concept`);
      
      // Get current session
      const { currentSession } = get();
      if (!currentSession) {
        console.log("No active session found");
        set({ isLoading: false });
        return allConceptQuestions[0]; // Default to first question if no session
      }
      
      // Get attempted question IDs in this session
      const attemptedQuestionIds = currentSession.attempts
        .map(attempt => attempt.questionId);
      
      console.log(`Student has attempted ${attemptedQuestionIds.length} questions in this session`);
      
      // Find questions that haven't been attempted yet
      const unattemptedQuestions = allConceptQuestions.filter(
        question => !attemptedQuestionIds.includes(question.id)
      );
      
      console.log(`${unattemptedQuestions.length} unattempted questions remain`);
      
      // If all questions attempted, return null (concept complete)
      if (unattemptedQuestions.length === 0) {
        console.log("All questions have been attempted");
        set({ isLoading: false });
        return null;
      }
      
      // Get concept mastery to determine appropriate difficulty
      const masteries = get().getConceptMasteriesByStudentId(studentId);
      const mastery = masteries.find(m => m.conceptId === conceptId);
      
      // Find most recent attempt for this concept to determine next question
      const conceptAttempts = currentSession.attempts.filter(attempt => {
        const question = contentStore.getQuestionById(attempt.questionId);
        return question?.conceptId === conceptId;
      });
      
      console.log(`${conceptAttempts.length} attempts for this concept`);
      
      // Define the progression matrices
      const bloomOrder: BloomLevel[] = ['Recall', 'Conceptual', 'Application', 'Analysis'];
      const difficultyOrder: DifficultyLevel[] = ['Easy', 'Medium', 'Hard'];
      
      let nextBloomLevel: BloomLevel;
      let nextDifficulty: DifficultyLevel;
      
      // Adaptive logic
      if (conceptAttempts.length === 0) {
        // Start with Easy-Recall for new concepts
        nextBloomLevel = 'Recall';
        nextDifficulty = 'Easy';
        console.log("Starting with Easy-Recall for new concept");
      } else {
        const lastAttempt = conceptAttempts[conceptAttempts.length - 1];
        const lastQuestion = contentStore.getQuestionById(lastAttempt.questionId);
        
        if (!lastQuestion) {
          // Default if we can't find the last question
          nextBloomLevel = 'Recall';
          nextDifficulty = 'Easy';
          console.log("Could not find last question, defaulting to Easy-Recall");
        } else {
          const currentBloomIndex = bloomOrder.indexOf(lastQuestion.bloomLevel);
          const currentDifficultyIndex = difficultyOrder.indexOf(lastQuestion.difficulty);
          
          if (lastAttempt.isCorrect) {
            // Correct answer - escalate difficulty following the matrix
            // First try to increase bloom level at same difficulty
            if (currentBloomIndex < bloomOrder.length - 1) {
              nextBloomLevel = bloomOrder[currentBloomIndex + 1];
              nextDifficulty = lastQuestion.difficulty;
              console.log(`Escalating bloom level: ${lastQuestion.bloomLevel} -> ${nextBloomLevel}`);
            } else {
              // If at highest bloom, increase difficulty and reset bloom
              if (currentDifficultyIndex < difficultyOrder.length - 1) {
                nextDifficulty = difficultyOrder[currentDifficultyIndex + 1];
                nextBloomLevel = 'Recall';
                console.log(`Escalating difficulty: ${lastQuestion.difficulty} -> ${nextDifficulty}, resetting bloom to Recall`);
              } else {
                // At highest difficulty and bloom, stay there
                nextBloomLevel = lastQuestion.bloomLevel;
                nextDifficulty = lastQuestion.difficulty;
                console.log("Already at highest level, maintaining difficulty");
              }
            }
          } else {
            // Incorrect answer - de-escalate difficulty
            // First try to decrease difficulty at same bloom level
            if (currentDifficultyIndex > 0) {
              nextDifficulty = difficultyOrder[currentDifficultyIndex - 1];
              nextBloomLevel = lastQuestion.bloomLevel;
              console.log(`De-escalating difficulty: ${lastQuestion.difficulty} -> ${nextDifficulty}`);
            } else {
              // If at lowest difficulty, decrease bloom level
              if (currentBloomIndex > 0) {
                nextBloomLevel = bloomOrder[currentBloomIndex - 1];
                nextDifficulty = 'Easy';
                console.log(`De-escalating bloom level: ${lastQuestion.bloomLevel} -> ${nextBloomLevel}`);
              } else {
                // At lowest difficulty and bloom, stay there
                nextBloomLevel = 'Recall';
                nextDifficulty = 'Easy';
                console.log("Already at lowest level, maintaining Easy-Recall");
              }
            }
          }
        }
      }
      
      // Try to find a question matching the next bloom level and difficulty
      let nextQuestion = unattemptedQuestions.find(q => 
        q.bloomLevel === nextBloomLevel && q.difficulty === nextDifficulty
      );
      
      // If no exact match, try to find any unattempted question with the same bloom level
      if (!nextQuestion) {
        nextQuestion = unattemptedQuestions.find(q => q.bloomLevel === nextBloomLevel);
      }
      
      // If still no match, try to find any unattempted question with the same difficulty
      if (!nextQuestion) {
        nextQuestion = unattemptedQuestions.find(q => q.difficulty === nextDifficulty);
      }
      
      // If still no match, just use any unattempted question
      if (!nextQuestion) {
        nextQuestion = unattemptedQuestions[0];
      }
      
      console.log(`Selected next question with bloom=${nextQuestion?.bloomLevel}, difficulty=${nextQuestion?.difficulty}`);
      
      set({ isLoading: false });
      return nextQuestion;
    } catch (error) {
      console.error('Error getting next question:', error);
      set({ isLoading: false });
      return null;
    }
  },
  
  isConceptMastered: (studentId: string, conceptId: string) => {
    const masteries = get().getConceptMasteriesByStudentId(studentId);
    const mastery = masteries.find(m => m.conceptId === conceptId);
    
    if (!mastery) return false;
    
    // Get all stars for this student and concept
    const studentStars = get().getStarsByStudentId(studentId);
    
    // Count correct answers at Medium+ and Hard
    let mediumPlusCorrect = 0;
    let hardCorrect = 0;
    
    studentStars.forEach(star => {
      if (star.type === 'white') return; // Skip incorrect attempts
      
      // Try to get question from question store
      const contentStore = useContentStore.getState();
      const question = contentStore.getQuestionById(star.questionId);
      if (!question || question.conceptId !== conceptId) return;
      
      if (question.difficulty === 'Medium' || question.difficulty === 'Hard') {
        mediumPlusCorrect++;
      }
      
      if (question.difficulty === 'Hard') {
        hardCorrect++;
      }
    });
    
    // Mastery criteria from PRD:
    // ≥2 correct answers at Medium+ OR ≥1 correct at Hard → concept mastered
    return mediumPlusCorrect >= 2 || hardCorrect >= 1;
  }
}));