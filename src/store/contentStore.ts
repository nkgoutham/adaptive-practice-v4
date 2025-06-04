/**
 * Content store using Zustand
 * Manages chapters, concepts, questions, and associated data
 */
import { create } from 'zustand';
import { Chapter, Concept, Question, QuestionOption, Misconception, BloomLevel, DifficultyLevel, EditHistoryEntry } from '../types';
import { supabase } from '../lib/supabase';

interface ContentState {
  chapters: Chapter[];
  concepts: Concept[];
  questions: Question[];
  misconceptions: Misconception[];
  editHistory: EditHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  
  // Chapter methods
  fetchChapters: () => Promise<void>;
  getChapterById: (id: string) => Chapter | undefined;
  getChaptersByCriteria: (grade?: number, subject?: string) => Chapter[];
  publishChapter: (chapterId: string) => Promise<void>;
  unpublishChapter: (chapterId: string) => Promise<void>;
  
  // Concept methods
  getConceptById: (id: string) => Concept | undefined;
  getConceptsByChapterId: (chapterId: string) => Concept[];
  publishConcept: (conceptId: string) => Promise<void>;
  unpublishConcept: (conceptId: string) => Promise<void>;
  
  // Question methods
  getQuestionById: (id: string) => Question | undefined;
  getQuestionsByConceptId: (conceptId: string) => Question[];
  getQuestionsByBloomLevel: (bloomLevel: BloomLevel) => Question[];
  getQuestionsByDifficulty: (difficulty: DifficultyLevel) => Question[];
  updateQuestion: (
    questionId: string, 
    updatedData: Partial<Question>,
    userId: string
  ) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
  
  // Question Option methods
  updateQuestionOption: (
    optionId: string, 
    updatedData: Partial<QuestionOption>
  ) => Promise<void>;
  
  // Misconception methods
  fetchMisconceptions: () => Promise<void>;
  getMisconceptionByTag: (tag: string) => Misconception | undefined;
  
  // Edit history methods
  fetchQuestionEditHistory: (questionId: string) => Promise<void>;
  
  // Upload and generation methods
  uploadChapterPDF: (file: File) => Promise<string>;
  generateQuestionsForChapter: (chapterId: string) => Promise<void>;
  generateQuestionsForConcept: (conceptId: string) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  chapters: [],
  concepts: [],
  questions: [],
  misconceptions: [],
  editHistory: [],
  isLoading: false,
  error: null,
  
  // Fetch chapters from Supabase
  fetchChapters: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: chapters, error } = await supabase
        .from('chapters')
        .select(`
          id,
          title,
          grade,
          subject,
          teacher_id,
          created_at,
          is_published,
          concepts (
            id,
            name,
            created_at,
            is_published,
            questions (
              id,
              bloom_level,
              difficulty,
              stem,
              last_updated_at,
              last_updated_by,
              options (
                id,
                text,
                is_correct,
                misconception_tag
              )
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our types
      const formattedChapters: Chapter[] = chapters.map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        grade: chapter.grade,
        subject: chapter.subject,
        concepts: chapter.concepts.map(concept => ({
          id: concept.id,
          chapterId: chapter.id,
          name: concept.name,
          isPublished: concept.is_published,
          questions: concept.questions.map(question => ({
            id: question.id,
            conceptId: concept.id,
            bloomLevel: question.bloom_level as BloomLevel,
            difficulty: question.difficulty as DifficultyLevel,
            stem: question.stem,
            lastUpdatedAt: question.last_updated_at,
            lastUpdatedBy: question.last_updated_by,
            options: question.options.map(option => ({
              id: option.id,
              questionId: question.id,
              text: option.text,
              isCorrect: option.is_correct,
              misconceptionTag: option.misconception_tag || undefined
            }))
          }))
        })),
        createdAt: chapter.created_at,
        isPublished: chapter.is_published
      }));

      // Extract all questions for the question store
      const allQuestions: Question[] = [];
      formattedChapters.forEach(chapter => {
        chapter.concepts.forEach(concept => {
          concept.questions.forEach(question => {
            allQuestions.push(question);
          });
        });
      });
      
      set({ 
        chapters: formattedChapters, 
        questions: allQuestions,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching chapters:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch chapters', 
        isLoading: false 
      });
    }
  },
  
  // Chapter methods
  getChapterById: (id: string) => {
    return get().chapters.find(chapter => chapter.id === id);
  },
  
  getChaptersByCriteria: (grade?: number, subject?: string) => {
    const { chapters } = get();
    return chapters.filter(chapter => 
      (grade === undefined || chapter.grade === grade) && 
      (subject === undefined || chapter.subject === subject)
    );
  },
  
  publishChapter: async (chapterId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const chapter = get().getChapterById(chapterId);
      if (!chapter) throw new Error('Chapter not found');
      
      // Check if all concepts have questions
      const concepts = chapter.concepts;
      const conceptsWithoutQuestions = concepts.filter(c => c.questions.length === 0);
      
      if (conceptsWithoutQuestions.length > 0) {
        throw new Error('All concepts must have questions before publishing');
      }
      
      // Update chapter and all its concepts to published
      const { error: chapterError } = await supabase
        .from('chapters')
        .update({ is_published: true })
        .eq('id', chapterId);
      
      if (chapterError) throw chapterError;
      
      // Publish all concepts
      const conceptIds = concepts.map(c => c.id);
      const { error: conceptsError } = await supabase
        .from('concepts')
        .update({ is_published: true })
        .in('id', conceptIds);
      
      if (conceptsError) throw conceptsError;
      
      // Update local state
      const updatedChapters = get().chapters.map(chapter => 
        chapter.id === chapterId
          ? { 
              ...chapter, 
              isPublished: true,
              concepts: chapter.concepts.map(concept => ({
                ...concept,
                isPublished: true
              }))
            }
          : chapter
      );
      
      set({ chapters: updatedChapters, isLoading: false });
    } catch (error) {
      console.error('Error publishing chapter:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Publishing failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  unpublishChapter: async (chapterId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Update chapter to unpublished
      const { error: chapterError } = await supabase
        .from('chapters')
        .update({ is_published: false })
        .eq('id', chapterId);
      
      if (chapterError) throw chapterError;
      
      // Get all concept IDs for this chapter
      const chapter = get().getChapterById(chapterId);
      if (!chapter) throw new Error('Chapter not found');
      
      const conceptIds = chapter.concepts.map(c => c.id);
      
      // Unpublish all concepts
      const { error: conceptsError } = await supabase
        .from('concepts')
        .update({ is_published: false })
        .in('id', conceptIds);
      
      if (conceptsError) throw conceptsError;
      
      // Update local state
      const updatedChapters = get().chapters.map(chapter => 
        chapter.id === chapterId
          ? { 
              ...chapter, 
              isPublished: false,
              concepts: chapter.concepts.map(concept => ({
                ...concept,
                isPublished: false
              }))
            }
          : chapter
      );
      
      set({ chapters: updatedChapters, isLoading: false });
    } catch (error) {
      console.error('Error unpublishing chapter:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unpublishing failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Concept methods
  getConceptById: (id: string) => {
    let foundConcept: Concept | undefined;
    
    get().chapters.forEach(chapter => {
      const concept = chapter.concepts.find(c => c.id === id);
      if (concept) {
        foundConcept = concept;
      }
    });
    
    return foundConcept;
  },
  
  getConceptsByChapterId: (chapterId: string) => {
    const chapter = get().chapters.find(c => c.id === chapterId);
    return chapter ? chapter.concepts : [];
  },
  
  publishConcept: async (conceptId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const concept = get().getConceptById(conceptId);
      if (!concept) throw new Error('Concept not found');
      
      // Check if the concept has questions
      if (concept.questions.length === 0) {
        throw new Error('Concept must have questions before publishing');
      }
      
      // Update concept to published
      const { error: conceptError } = await supabase
        .from('concepts')
        .update({ is_published: true })
        .eq('id', conceptId);
      
      if (conceptError) throw conceptError;
      
      // Update local state
      let foundChapterId: string | null = null;
      
      const updatedChapters = get().chapters.map(chapter => {
        const updatedConcepts = chapter.concepts.map(c => {
          if (c.id === conceptId) {
            foundChapterId = chapter.id;
            return { ...c, isPublished: true };
          }
          return c;
        });
        
        return { ...chapter, concepts: updatedConcepts };
      });
      
      set({ chapters: updatedChapters, isLoading: false });
      
      // If all concepts are published, publish the chapter
      if (foundChapterId) {
        const updatedChapter = updatedChapters.find(c => c.id === foundChapterId)!;
        const allConceptsPublished = updatedChapter.concepts.every(c => c.isPublished);
        
        if (allConceptsPublished && !updatedChapter.isPublished) {
          await get().publishChapter(foundChapterId);
        }
      }
    } catch (error) {
      console.error('Error publishing concept:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Publishing failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  unpublishConcept: async (conceptId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Update concept to unpublished
      const { error: conceptError } = await supabase
        .from('concepts')
        .update({ is_published: false })
        .eq('id', conceptId);
      
      if (conceptError) throw conceptError;
      
      // Update local state
      let foundChapterId: string | null = null;
      
      const updatedChapters = get().chapters.map(chapter => {
        const updatedConcepts = chapter.concepts.map(c => {
          if (c.id === conceptId) {
            foundChapterId = chapter.id;
            return { ...c, isPublished: false };
          }
          return c;
        });
        
        return { ...chapter, concepts: updatedConcepts };
      });
      
      // If any concept is unpublished, unpublish the chapter
      if (foundChapterId) {
        const { error: chapterError } = await supabase
          .from('chapters')
          .update({ is_published: false })
          .eq('id', foundChapterId);
        
        if (chapterError) throw chapterError;
        
        // Update local state to reflect chapter unpublished
        const finalUpdatedChapters = updatedChapters.map(chapter => 
          chapter.id === foundChapterId
            ? { ...chapter, isPublished: false }
            : chapter
        );
        
        set({ chapters: finalUpdatedChapters, isLoading: false });
      } else {
        set({ chapters: updatedChapters, isLoading: false });
      }
    } catch (error) {
      console.error('Error unpublishing concept:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Unpublishing failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Question methods
  getQuestionById: (id: string) => {
    return get().questions.find(question => question.id === id);
  },
  
  getQuestionsByConceptId: (conceptId: string) => {
    return get().questions.filter(question => question.conceptId === conceptId);
  },
  
  getQuestionsByBloomLevel: (bloomLevel: BloomLevel) => {
    return get().questions.filter(question => question.bloomLevel === bloomLevel);
  },
  
  getQuestionsByDifficulty: (difficulty: DifficultyLevel) => {
    return get().questions.filter(question => question.difficulty === difficulty);
  },
  
  updateQuestion: async (
    questionId: string, 
    updatedData: Partial<Question>,
    userId: string
  ) => {
    set({ isLoading: true, error: null });
    
    try {
      const currentQuestion = get().getQuestionById(questionId);
      if (!currentQuestion) throw new Error('Question not found');
      
      // Save previous state for history
      const previousValue = {
        stem: currentQuestion.stem,
        bloomLevel: currentQuestion.bloomLevel,
        difficulty: currentQuestion.difficulty
      };
      
      // Update question in Supabase
      const { error: questionError } = await supabase
        .from('questions')
        .update({ 
          stem: updatedData.stem,
          bloom_level: updatedData.bloomLevel,
          difficulty: updatedData.difficulty,
          last_updated_by: userId,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', questionId);
      
      if (questionError) throw questionError;
      
      // Create edit history entry
      const { error: historyError } = await supabase
        .from('question_edit_history')
        .insert({
          question_id: questionId,
          user_id: userId,
          previous_value: previousValue,
          new_value: {
            stem: updatedData.stem || currentQuestion.stem,
            bloomLevel: updatedData.bloomLevel || currentQuestion.bloomLevel,
            difficulty: updatedData.difficulty || currentQuestion.difficulty
          }
        });
      
      if (historyError) throw historyError;
      
      // If options were updated
      if (updatedData.options && updatedData.options.length > 0) {
        // Process each option update
        for (const option of updatedData.options) {
          if (!option.id) continue;
          
          const { error: optionError } = await supabase
            .from('options')
            .update({ 
              text: option.text,
              is_correct: option.isCorrect,
              misconception_tag: option.misconceptionTag
            })
            .eq('id', option.id);
          
          if (optionError) throw optionError;
        }
      }
      
      // Update local state
      const updatedQuestions = get().questions.map(q => 
        q.id === questionId
          ? {
              ...q,
              ...updatedData,
              lastUpdatedAt: new Date().toISOString(),
              lastUpdatedBy: userId
            }
          : q
      );
      
      // Update the question within its concept in chapters
      const updatedChapters = get().chapters.map(chapter => {
        const updatedConcepts = chapter.concepts.map(concept => {
          if (concept.id === currentQuestion.conceptId) {
            return {
              ...concept,
              questions: concept.questions.map(q => 
                q.id === questionId
                  ? {
                      ...q,
                      ...updatedData,
                      lastUpdatedAt: new Date().toISOString(),
                      lastUpdatedBy: userId
                    }
                  : q
              )
            };
          }
          return concept;
        });
        
        return { ...chapter, concepts: updatedConcepts };
      });
      
      set({ 
        questions: updatedQuestions, 
        chapters: updatedChapters,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error updating question:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Update failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  deleteQuestion: async (questionId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const currentQuestion = get().getQuestionById(questionId);
      if (!currentQuestion) throw new Error('Question not found');
      
      // Delete question from Supabase (cascades to options)
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      // Update local state - remove question from questions array
      const updatedQuestions = get().questions.filter(q => q.id !== questionId);
      
      // Remove question from its concept in chapters
      const updatedChapters = get().chapters.map(chapter => {
        const updatedConcepts = chapter.concepts.map(concept => {
          if (concept.id === currentQuestion.conceptId) {
            return {
              ...concept,
              questions: concept.questions.filter(q => q.id !== questionId)
            };
          }
          return concept;
        });
        
        return { ...chapter, concepts: updatedConcepts };
      });
      
      set({ 
        questions: updatedQuestions, 
        chapters: updatedChapters,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error deleting question:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Deletion failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Question Option methods
  updateQuestionOption: async (optionId: string, updatedData: Partial<QuestionOption>) => {
    set({ isLoading: true, error: null });
    
    try {
      // Update option in Supabase
      const { error } = await supabase
        .from('options')
        .update({ 
          text: updatedData.text,
          is_correct: updatedData.isCorrect,
          misconception_tag: updatedData.misconceptionTag
        })
        .eq('id', optionId);
      
      if (error) throw error;
      
      // Find the question this option belongs to
      let questionId: string | null = null;
      let updatedOption: QuestionOption | null = null;
      
      // Update local state
      const updatedQuestions = get().questions.map(question => {
        const options = question.options.map(option => {
          if (option.id === optionId) {
            questionId = question.id;
            updatedOption = { ...option, ...updatedData };
            return updatedOption;
          }
          return option;
        });
        
        return { ...question, options };
      });
      
      // Update the option within its question in chapters
      const updatedChapters = get().chapters.map(chapter => {
        const updatedConcepts = chapter.concepts.map(concept => {
          const updatedQuestions = concept.questions.map(question => {
            if (question.id === questionId) {
              const updatedOptions = question.options.map(option => {
                if (option.id === optionId) {
                  return { ...option, ...updatedData };
                }
                return option;
              });
              
              return { ...question, options: updatedOptions };
            }
            return question;
          });
          
          return { ...concept, questions: updatedQuestions };
        });
        
        return { ...chapter, concepts: updatedConcepts };
      });
      
      set({ 
        questions: updatedQuestions, 
        chapters: updatedChapters,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error updating option:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Option update failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Misconception methods
  fetchMisconceptions: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: misconceptions, error } = await supabase
        .from('misconceptions')
        .select('*');
      
      if (error) throw error;
      
      // Transform the data to match our types
      const formattedMisconceptions: Misconception[] = misconceptions.map(misc => ({
        tag: misc.tag,
        explanation: misc.explanation
      }));
      
      set({ misconceptions: formattedMisconceptions, isLoading: false });
    } catch (error) {
      console.error('Error fetching misconceptions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch misconceptions', 
        isLoading: false 
      });
    }
  },
  
  getMisconceptionByTag: (tag: string) => {
    return get().misconceptions.find(misconception => misconception.tag === tag);
  },
  
  // Edit history methods
  fetchQuestionEditHistory: async (questionId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { data: historyData, error } = await supabase
        .from('question_edit_history')
        .select(`
          id,
          question_id,
          user_id,
          timestamp,
          previous_value,
          new_value,
          profiles (name)
        `)
        .eq('question_id', questionId)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match our types
      const formattedHistory: EditHistoryEntry[] = historyData.map(entry => ({
        questionId: entry.question_id,
        userId: entry.user_id,
        userName: entry.profiles?.name || 'Unknown User',
        timestamp: entry.timestamp,
        previousValue: JSON.stringify(entry.previous_value),
        newValue: JSON.stringify(entry.new_value)
      }));
      
      set({ editHistory: formattedHistory, isLoading: false });
    } catch (error) {
      console.error('Error fetching edit history:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch edit history', 
        isLoading: false 
      });
    }
  },
  
  // Upload and generation methods
  uploadChapterPDF: async (file: File) => {
    set({ isLoading: true, error: null });
    
    try {
      // This function is now a stub, as PDF uploading and parsing
      // is handled directly in the PDFUploader component
      const id = await new Promise<string>((resolve, reject) => {
        setTimeout(() => reject(new Error("This function should not be called directly")), 100);
      });
      
      set({ isLoading: false });
      return id;
    } catch (error) {
      console.error('Error uploading PDF:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Upload failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  generateQuestionsForChapter: async (chapterId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const chapter = get().getChapterById(chapterId);
      if (!chapter) throw new Error('Chapter not found');
      
      // Get the concepts for this chapter
      const concepts = chapter.concepts;
      if (concepts.length === 0) throw new Error('No concepts found for this chapter');
      
      // Generate questions for each concept in parallel
      const conceptPromises = concepts.map(async (concept) => {
        try {
          const { data, error } = await supabase
            .functions
            .invoke('generate-questions', {
              body: JSON.stringify({
                conceptId: concept.id
              })
            });
          
          if (error) throw error;
          return data;
        } catch (err) {
          console.error(`Error generating questions for concept ${concept.id}:`, err);
          throw err;
        }
      });
      
      await Promise.all(conceptPromises);
      
      // Fetch all questions for this chapter
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          concept_id,
          bloom_level,
          difficulty,
          stem,
          created_at,
          last_updated_at,
          last_updated_by,
          options (
            id,
            text,
            is_correct,
            misconception_tag
          )
        `)
        .in('concept_id', concepts.map(c => c.id));
      
      if (questionsError) throw questionsError;
      
      // Transform the questions data to match our types
      const formattedQuestions: Question[] = questionsData.map(q => ({
        id: q.id,
        conceptId: q.concept_id,
        bloomLevel: q.bloom_level as BloomLevel,
        difficulty: q.difficulty as DifficultyLevel,
        stem: q.stem,
        lastUpdatedAt: q.last_updated_at,
        lastUpdatedBy: q.last_updated_by,
        options: q.options.map(opt => ({
          id: opt.id,
          questionId: q.id,
          text: opt.text,
          isCorrect: opt.is_correct,
          misconceptionTag: opt.misconception_tag || undefined
        }))
      }));
      
      // Update concepts with their questions
      const updatedConcepts = concepts.map(concept => ({
        ...concept,
        questions: formattedQuestions.filter(q => q.conceptId === concept.id)
      }));
      
      // Update the chapter with its concepts and questions
      const updatedChapters = get().chapters.map(c => 
        c.id === chapterId
          ? { ...c, concepts: updatedConcepts }
          : c
      );
      
      set({
        chapters: updatedChapters,
        questions: [...get().questions.filter(q => !concepts.some(c => c.id === q.conceptId)), ...formattedQuestions],
        isLoading: false
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Generation failed', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  generateQuestionsForConcept: async (conceptId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Find the concept and its chapter
      let foundChapterId: string | null = null;
      let foundConcept: Concept | null = null;
      
      for (const chapter of get().chapters) {
        const concept = chapter.concepts.find(c => c.id === conceptId);
        if (concept) {
          foundChapterId = chapter.id;
          foundConcept = concept;
          break;
        }
      }
      
      if (!foundChapterId || !foundConcept) {
        throw new Error('Concept not found');
      }
      
      // Call the Supabase Edge Function to generate questions
      const { data, error } = await supabase
        .functions
        .invoke('generate-questions', {
          body: JSON.stringify({
            conceptId: conceptId
          })
        });
      
      if (error) throw error;
      
      // Fetch all questions for this concept
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select(`
          id,
          concept_id,
          bloom_level,
          difficulty,
          stem,
          created_at,
          last_updated_at,
          last_updated_by,
          options (
            id,
            text,
            is_correct,
            misconception_tag
          )
        `)
        .eq('concept_id', conceptId);
      
      if (questionsError) throw questionsError;
      
      // Transform the questions data to match our types
      const formattedQuestions: Question[] = questionsData.map(q => ({
        id: q.id,
        conceptId: q.concept_id,
        bloomLevel: q.bloom_level as BloomLevel,
        difficulty: q.difficulty as DifficultyLevel,
        stem: q.stem,
        lastUpdatedAt: q.last_updated_at,
        lastUpdatedBy: q.last_updated_by,
        options: q.options.map(opt => ({
          id: opt.id,
          questionId: q.id,
          text: opt.text,
          isCorrect: opt.is_correct,
          misconceptionTag: opt.misconception_tag || undefined
        }))
      }));
      
      // Update the concept with its questions
      const updatedConcept = {
        ...foundConcept,
        questions: formattedQuestions
      };
      
      // Update the chapter's concepts
      const updatedChapters = get().chapters.map(chapter => {
        if (chapter.id === foundChapterId) {
          return {
            ...chapter,
            concepts: chapter.concepts.map(concept => 
              concept.id === conceptId 
                ? updatedConcept 
                : concept
            )
          };
        }
        return chapter;
      });
      
      set({
        chapters: updatedChapters,
        questions: [
          ...get().questions.filter(q => q.conceptId !== conceptId),
          ...formattedQuestions
        ],
        isLoading: false
      });
    } catch (error) {
      console.error('Error generating questions for concept:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Concept generation failed', 
        isLoading: false 
      });
      throw error;
    }
  }
}));