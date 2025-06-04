/**
 * Student Practice Page component
 * Shows all concepts in a chapter with practice available for published concepts
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../../components/Layout';
import { QuestionCard } from '../../components/student/QuestionCard';
import { StarStreak } from '../../components/student/StarStreak';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';
import { useStudentProgressStore } from '../../store/studentProgressStore';
import { Book, CheckCircle, Lock, ArrowRight } from 'lucide-react';
import { Question, StarType, Concept } from '../../types';

export const StudentPracticePage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { user } = useAuthStore();
  const { 
    getChapterById,
    misconceptions
  } = useContentStore();
  const { 
    getCurrentSession,
    getNextQuestion,
    recordAttempt,
    isConceptMastered,
    getStarsByStudentId,
    startSession
  } = useStudentProgressStore();
  const navigate = useNavigate();
  
  const [currentConcept, setCurrentConcept] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [activePractice, setActivePractice] = useState(false);
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
    
    // Get stars
    const studentStars = getStarsByStudentId(user.id);
    setStars(studentStars.map(star => star.type));
    
    setLoading(false);
  }, [chapterId, user, navigate, getChapterById, getStarsByStudentId]);
  
  useEffect(() => {
    // Load question when a concept is selected and practice is active
    if (!currentConcept || !user || !activePractice) return;
    
    const loadQuestion = async () => {
      // Get next question for current concept
      const nextQuestion = await getNextQuestion(user.id, currentConcept);
      
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
      } else {
        // If no more questions for this concept, complete practice
        setCompleted(true);
        setActivePractice(false);
      }
    };
    
    loadQuestion();
  }, [currentConcept, user, getNextQuestion, activePractice]);
  
  const handleAnswer = async (isCorrect: boolean, selectedOptionId: string) => {
    if (!currentQuestion || !user) return;
    
    // Record the attempt
    await recordAttempt(currentQuestion.id, isCorrect, selectedOptionId);
    
    // Update stars display
    const updatedStars = getStarsByStudentId(user.id);
    setStars(updatedStars.map(star => star.type));
    
    // After a short delay, load the next question
    setTimeout(() => {
      setCurrentQuestion(null); // Clear current question to show loading state
      
      // Get next question (this will trigger the useEffect)
      getNextQuestion(user.id, currentConcept!).then(nextQuestion => {
        if (nextQuestion) {
          setCurrentQuestion(nextQuestion);
        } else {
          // No more questions for this concept
          setCompleted(true);
          setActivePractice(false);
        }
      });
    }, 1500);
  };
  
  const handleStartConceptPractice = async (conceptId: string) => {
    if (!user || !chapterId) return;
    
    // Ensure we have a session
    const currentSession = getCurrentSession();
    if (!currentSession) {
      await startSession(user.id, chapterId);
    }
    
    setCurrentConcept(conceptId);
    setCurrentQuestion(null);
    setCompleted(false);
    setActivePractice(true);
  };
  
  const handleExitPractice = () => {
    navigate('/student/chapters');
  };
  
  const handleBackToConceptList = () => {
    setActivePractice(false);
    setCurrentConcept(null);
    setCurrentQuestion(null);
    setCompleted(false);
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
  if (!chapter) {
    navigate('/student/chapters');
    return null;
  }
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">
            {chapter?.title}
          </h1>
          
          <Button
            variant="outline"
            onClick={handleExitPractice}
          >
            Exit Practice
          </Button>
        </div>
        
        <StarStreak
          stars={stars}
          className="mb-6"
        />
        
        {!activePractice ? (
          // Display concept list
          <div className="mb-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-neutral-700 mb-2">Select a Concept to Practice</h2>
              <p className="text-neutral-600">
                Choose from the concepts below to start practicing. Some concepts may not be available yet.
              </p>
            </div>
            
            <div className="space-y-4">
              {chapter.concepts.map((concept) => {
                const isMastered = isConceptMastered(user?.id || '', concept.id);
                
                return (
                  <Card
                    key={concept.id}
                    className={`
                      ${concept.isPublished ? 'hover:border-primary-300 cursor-pointer' : 'opacity-70'}
                    `}
                    elevation="low"
                    hoverEffect={concept.isPublished}
                    onClick={() => concept.isPublished && handleStartConceptPractice(concept.id)}
                  >
                    <div className="flex items-start">
                      <div className={`p-2.5 rounded-lg mr-3 ${
                        concept.isPublished 
                          ? isMastered 
                            ? 'bg-success-100' 
                            : 'bg-primary-100'
                          : 'bg-neutral-100'
                      }`}>
                        <Book className={`w-4 h-4 ${
                          concept.isPublished 
                            ? isMastered 
                              ? 'text-success-600'
                              : 'text-primary-600'
                            : 'text-neutral-500'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <h3 className="font-medium text-neutral-800">{concept.name}</h3>
                            {concept.isPublished ? (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                                <CheckCircle size={10} className="mr-1" />
                                {isMastered ? 'Mastered' : 'Available'}
                              </span>
                            ) : (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                                <Lock size={10} className="mr-1" />
                                Coming Soon
                              </span>
                            )}
                          </div>
                          
                          {concept.isPublished && (
                            <ArrowRight size={16} className="text-primary-500" />
                          )}
                        </div>
                        
                        <p className="text-sm text-neutral-600 mt-1">
                          {concept.isPublished 
                            ? `${concept.questions.length} questions available`
                            : 'This concept is not available for practice yet'}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          // Display active practice or completion screen
          <div>
            <div className="mb-4">
              <Button 
                variant="outline" 
                onClick={handleBackToConceptList}
                size="sm"
              >
                ← Back to Concepts
              </Button>
            </div>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {completed ? (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
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
                    Concept Completed!
                  </h2>
                  <p className="text-neutral-600 mb-6">
                    Great job! You've completed all the questions for this concept.
                  </p>
                  <Button
                    variant="primary"
                    onClick={handleBackToConceptList}
                  >
                    Practice Another Concept
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
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
                  <p className="text-neutral-600">Loading next question...</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
};