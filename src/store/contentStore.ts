/**
 * Content store using Zustand
 * Manages chapters, concepts, questions, and associated data
 */
import { create } from 'zustand';
import { Chapter, Concept, Question, QuestionOption, Misconception, BloomLevel, DifficultyLevel } from '../types';
import { supabase } from '../lib/supabase';

interface ContentState {
  chapters: Chapter[];
  concepts: Concept[];
  questions: Question[];
  misconceptions: Misconception[];
  isLoading: boolean;
  error: string | null;
  
  // Chapter methods
  fetchChapters: () => Promise<void>;
  getChapterById: (id: string) => Chapter | undefined;
  getChaptersByCriteria: (grade?: number, subject?: string) => Chapter[];
  
  // Concept methods
  getConceptById: (id: string) => Concept | undefined;
  getConceptsByChapterId: (chapterId: string) => Concept[];
  
  // Question methods
  getQuestionById: (id: string) => Question | undefined;
  getQuestionsByConceptId: (conceptId: string) => Question[];
  getQuestionsByBloomLevel: (bloomLevel: BloomLevel) => Question[];
  getQuestionsByDifficulty: (difficulty: DifficultyLevel) => Question[];
  
  // Misconception methods
  fetchMisconceptions: () => Promise<void>;
  getMisconceptionByTag: (tag: string) => Misconception | undefined;
  
  // Upload and generation methods
  uploadChapterPDF: (file: File) => Promise<string>;
  generateQuestionsForChapter: (chapterId: string) => Promise<void>;
  generateQuestionsForConcept: (conceptId: string) => Promise<void>;
  publishChapter: (chapterId: string) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  chapters: [],
  concepts: [],
  questions: [],
  misconceptions: [],
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
            questions (
              id,
              bloom_level,
              difficulty,
              stem,
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
          questions: concept.questions.map(question => ({
            id: question.id,
            conceptId: concept.id,
            bloomLevel: question.bloom_level as BloomLevel,
            difficulty: question.difficulty as DifficultyLevel,
            stem: question.stem,
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
  
  // Concept methods
  getConceptById: (id: string) => {
    return get().concepts.find(concept => concept.id === id);
  },
  
  getConceptsByChapterId: (chapterId: string) => {
    const chapter = get().chapters.find(c => c.id === chapterId);
    return chapter ? chapter.concepts : [];
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
        questions: [...get().questions, ...formattedQuestions],
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
  },
  
  publishChapter: async (chapterId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const { error } = await supabase
        .from('chapters')
        .update({ is_published: true })
        .eq('id', chapterId);
      
      if (error) throw error;
      
      // Update local state
      const updatedChapters = get().chapters.map(chapter => 
        chapter.id === chapterId
          ? { ...chapter, isPublished: true }
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
  }
}));