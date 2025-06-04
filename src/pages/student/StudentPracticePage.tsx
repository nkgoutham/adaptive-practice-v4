/**
 * Student Practice Page component
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../../components/Layout';
import { QuestionCard } from '../../components/student/QuestionCard';
import { StarStreak } from '../../components/student/StarStreak';
import { Button } from '../../components/ui/Button';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';
import { useStudentProgressStore } from '../../store/studentProgressStore';
import { Question, StarType } from '../../types';

export const StudentPracticePage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { user } = useAuthStore();
  const { 
    getChapterById, 
    getConceptsByChapterId,
    misconceptions
  } = useContentStore();
  const { 
    getCurrentSession,
    getNextQuestion,
    recordAttempt,
    isConceptMastered,
    getStarsByStudentId
  } = useStudentProgressStore();
  const navigate = useNavigate();
  
  const [currentConcept, setCurrentConcept] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState<StarType[]>([]);
  const [completed, setCompleted] = useState(false);
  
  useEffect(() => {
    if (!chapterId || !user) return;
    
    const chapter = getChapterById(chapterId);
    if (!chapter) {
      navigate('/student/chapters');
      return;
    }
    
    // Get current session
    const session = getCurrentSession();
    if (!session) {
      navigate('/student/chapters');
      return;
    }
    
    // Get stars
    const studentStars = getStarsByStudentId(user.id);
    setStars(studentStars.map(star => star.type));
    
    // Initialize with first concept if none is selected
    if (!currentConcept) {
      const concepts = getConceptsByChapterId(chapterId);
      if (concepts.length > 0) {
        const firstUnmasteredConcept = concepts.find(
          concept => !isConceptMastered(user.id, concept.id)
        );
        
        setCurrentConcept(firstUnmasteredConcept?.id || concepts[0].id);
      }
    }
    
    setLoading(false);
  }, [chapterId, user, navigate, getChapterById, getCurrentSession, getStarsByStudentId, currentConcept, getConceptsByChapterId, isConceptMastered]);
  
  useEffect(() => {
    if (!currentConcept || !user) return;
    
    // Get next question for current concept
    const nextQuestion = getNextQuestion(user.id, currentConcept);
    
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
    } else {
      // If no more questions for this concept, check if all concepts are mastered
      const concepts = getConceptsByChapterId(chapterId!);
      const unmasteredConcept = concepts.find(
        concept => !isConceptMastered(user.id, concept.id)
      );
      
      if (unmasteredConcept) {
        // Move to next unmastered concept
        setCurrentConcept(unmasteredConcept.id);
      } else {
        // All concepts mastered!
        setCompleted(true);
      }
    }
  }, [currentConcept, user, getNextQuestion, chapterId, getConceptsByChapterId, isConceptMastered]);
  
  const handleAnswer = (isCorrect: boolean, selectedOptionId: string) => {
    if (!currentQuestion || !user) return;
    
    // Record the attempt
    recordAttempt(currentQuestion.id, isCorrect, selectedOptionId);
    
    // Update stars display
    const updatedStars = getStarsByStudentId(user.id);
    setStars(updatedStars.map(star => star.type));
    
    // Will trigger useEffect to load next question
  };
  
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      </Layout>
    );
  }
  
  const chapter = getChapterById(chapterId!);
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">
            {chapter?.title}
          </h1>
          
          <Button
            variant="outline"
            onClick={() => navigate('/student/chapters')}
          >
            Exit Practice
          </Button>
        </div>
        
        <StarStreak
          stars={stars}
          className="mb-6"
        />
        
        <AnimatePresence mode="wait">
          {completed ? (
            <motion.div
              key="completed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center py-12"
            >
              <div className="bg-primary-100 rounded-full p-6 inline-block mb-6">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-12 w-12 text-primary-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-3">
                Chapter Completed!
              </h2>
              <p className="text-neutral-600 mb-6">
                Great job! You've mastered all the concepts in this chapter.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate('/student/progress')}
              >
                View My Progress
              </Button>
            </motion.div>
          ) : currentQuestion ? (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <QuestionCard
                question={currentQuestion}
                onAnswer={handleAnswer}
                misconceptions={misconceptions}
              />
            </motion.div>
          ) : (
            <div className="text-center py-12">
              <p>Loading next question...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};