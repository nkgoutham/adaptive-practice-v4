/**
 * Student Practice Page component
 * Shows all concepts in a chapter with practice available for published concepts
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../../components/Layout';
import { QuestionCard } from '../../components/student/QuestionCard';
import { StarStreak } from '../../components/student/StarStreak';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConceptCard } from '../../components/student/ConceptCard';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';
import { useStudentProgressStore } from '../../store/studentProgressStore';
import { ArrowLeft, CheckCircle, ChevronRight } from 'lucide-react';
import { Question, StarType, Concept } from '../../types';

export const StudentPracticePage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { user } = useAuthStore();
  const { 
    getChapterById,
    isLoading: contentLoading
  } = useContentStore();
  const { 
    getCurrentSession,
    getNextQuestion,
    recordAttempt,
    isConceptMastered,
    getStarsByStudentId,
    startSession,
    isLoading: progressLoading
  } = useStudentProgressStore();
  const navigate = useNavigate();
  
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [activePractice, setActivePractice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState<StarType[]>([]);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingNextQuestion, setLoadingNextQuestion] = useState(false);
  const [pendingNextQuestion, setPendingNextQuestion] = useState(false);

  // Load chapter data and stars
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
  
  // Load question when a concept is selected and practice is active
  useEffect(() => {
    if (!selectedConceptId || !user || !activePractice || pendingNextQuestion) return;
    
    const loadQuestion = async () => {
      setError(null);
      setLoadingNextQuestion(true);
      try {
        // Get next question for current concept
        const nextQuestion = await getNextQuestion(user.id, selectedConceptId);
        
        if (nextQuestion) {
          setCurrentQuestion(nextQuestion);
        } else {
          // If no more questions for this concept, complete practice
          setCompleted(true);
          setActivePractice(false);
        }
      } catch (err) {
        console.error("Error loading question:", err);
        setError("Failed to load the next question. Please try again.");
        setActivePractice(false);
      } finally {
        setLoadingNextQuestion(false);
      }
    };
    
    loadQuestion();
  }, [selectedConceptId, user, getNextQuestion, activePractice, pendingNextQuestion]);
  
  const loadNextQuestion = async () => {
    if (!user || !selectedConceptId) return;
    
    setLoadingNextQuestion(true);
    setPendingNextQuestion(true);
    
    try {
      // Clear current question first to prevent showing the same one again
      setCurrentQuestion(null);
      
      // Get next question
      const nextQuestion = await getNextQuestion(user.id, selectedConceptId);
      
      if (nextQuestion) {
        setCurrentQuestion(nextQuestion);
      } else {
        // No more questions for this concept
        setCompleted(true);
        setActivePractice(false);
      }
    } catch (err) {
      console.error("Error loading next question:", err);
      setError("Failed to load the next question. Please try again.");
    } finally {
      setLoadingNextQuestion(false);
      setPendingNextQuestion(false);
    }
  };
  
  const handleAnswer = async (isCorrect: boolean, selectedOptionId: string) => {
    if (!currentQuestion || !user || !selectedConceptId) return;
    
    try {
      // Record the attempt
      await recordAttempt(currentQuestion.id, isCorrect, selectedOptionId);
      
      // Update stars display
      const updatedStars = getStarsByStudentId(user.id);
      setStars(updatedStars.map(star => star.type));
      
      // Load next question
      await loadNextQuestion();
      
    } catch (err) {
      console.error("Error recording answer:", err);
      setError("Failed to save your answer. Please try again.");
    }
  };
  
  const handleStartConceptPractice = async (conceptId: string) => {
    if (!user || !chapterId) return;
    
    setError(null);
    try {
      // Ensure we have a session
      const currentSession = getCurrentSession();
      if (!currentSession) {
        await startSession(user.id, chapterId);
      }
      
      setSelectedConceptId(conceptId);
      setCurrentQuestion(null);
      setCompleted(false);
      setActivePractice(true);
      setPendingNextQuestion(false);
    } catch (err) {
      console.error("Error starting practice:", err);
      setError("Failed to start practice session. Please try again.");
    }
  };
  
  const handleStartChapterPractice = async () => {
    if (!user || !chapterId || !chapter) return;
    
    setError(null);
    try {
      // Ensure we have a session
      const currentSession = getCurrentSession();
      if (!currentSession) {
        await startSession(user.id, chapterId);
      }
      
      // Find first published concept that's not mastered
      const firstUnmasteredConcept = publishedConcepts.find(
        concept => !isConceptMastered(user.id, concept.id)
      );
      
      // If all are mastered, just use the first published concept
      const conceptToStart = firstUnmasteredConcept || publishedConcepts[0];
      
      if (conceptToStart) {
        setSelectedConceptId(conceptToStart.id);
        setCurrentQuestion(null);
        setCompleted(false);
        setActivePractice(true);
        setPendingNextQuestion(false);
      } else {
        setError("No published concepts available for practice");
      }
    } catch (err) {
      console.error("Error starting practice:", err);
      setError("Failed to start practice session. Please try again.");
    }
  };
  
  const handleExitPractice = () => {
    navigate('/student/chapters');
  };
  
  const handleBackToConceptList = () => {
    setActivePractice(false);
    setSelectedConceptId(null);
    setCurrentQuestion(null);
    setCompleted(false);
    setError(null);
  };
  
  if (loading || contentLoading || progressLoading) {
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
  
  // Get published concepts
  const publishedConcepts = chapter.concepts.filter(c => c.isPublished);
  const unpublishedConcepts = chapter.concepts.filter(c => !c.isPublished);
  
  // Check if at least one concept is published
  const hasPublishedConcepts = publishedConcepts.length > 0;
  
  // Check if all concepts are published
  const allConceptsPublished = chapter.concepts.length > 0 && 
                              chapter.concepts.every(c => c.isPublished);
  
  // Get selected concept
  const selectedConcept = chapter.concepts.find(c => c.id === selectedConceptId);
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-neutral-800">
              {chapter?.title}
            </h1>
            {activePractice && selectedConcept && (
              <span className="ml-3 text-neutral-500">
                • {selectedConcept.name}
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={handleExitPractice}
          >
            Exit Practice
          </Button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700">
            {error}
          </div>
        )}
        
        <StarStreak
          stars={stars}
          className="mb-6"
        />
        
        <AnimatePresence mode="wait">
          {!activePractice ? (
            <motion.div
              key="concept-selection"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{ willChange: 'transform, opacity' }}
            >
              <Card className="mb-6" elevation="medium">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-neutral-700 mb-2">
                    Select a Concept to Practice
                  </h2>
                  <p className="text-neutral-600">
                    Choose a concept below to start practicing. {!hasPublishedConcepts && "No concepts are available for practice yet."}
                  </p>
                </div>
                
                {hasPublishedConcepts && (
                  <div className="mb-4">
                    {allConceptsPublished && (
                      <Button 
                        variant="primary"
                        onClick={handleStartChapterPractice}
                        className="w-full mb-4"
                      >
                        Practice All Concepts
                      </Button>
                    )}
                  </div>
                )}
                
                {hasPublishedConcepts ? (
                  <div className="space-y-3">
                    <h3 className="font-medium text-neutral-700 text-sm">Available Concepts</h3>
                    {publishedConcepts.map(concept => (
                      <ConceptCard
                        key={concept.id}
                        concept={concept}
                        isMastered={user ? isConceptMastered(user.id, concept.id) : false}
                        isSelected={selectedConceptId === concept.id}
                        onClick={() => handleStartConceptPractice(concept.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-neutral-500">
                      No concepts are available for practice yet. Check back later!
                    </p>
                  </div>
                )}
                
                {unpublishedConcepts.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-neutral-200">
                    <h3 className="font-medium text-neutral-700 text-sm mb-3">Coming Soon</h3>
                    <div className="space-y-3">
                      {unpublishedConcepts.map(concept => (
                        <ConceptCard
                          key={concept.id}
                          concept={concept}
                          isMastered={false}
                          isSelected={false}
                          isPublished={false}
                          onClick={() => {}} // Empty function since these can't be selected
                        />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="active-practice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{ willChange: 'transform, opacity' }}
            >
              <div className="mb-4">
                <Button 
                  variant="outline" 
                  onClick={handleBackToConceptList}
                  size="sm"
                  icon={<ArrowLeft size={16} />}
                >
                  Back to Concepts
                </Button>
              </div>
              
              <AnimatePresence mode="wait">
                {completed ? (
                  <motion.div
                    key="completed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                    className="text-center py-12"
                    style={{ willChange: 'transform, opacity' }}
                  >
                    <div className="bg-success-100 rounded-full p-6 inline-block mb-6">
                      <CheckCircle className="h-12 w-12 text-success-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-neutral-800 mb-3">
                      Concept Completed!
                    </h2>
                    <p className="text-neutral-600 mb-6">
                      Great job! You've completed all the questions for this concept.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <Button
                        variant="outline"
                        onClick={handleBackToConceptList}
                      >
                        Practice Another Concept
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleExitPractice}
                      >
                        Return to Chapters
                      </Button>
                    </div>
                  </motion.div>
                ) : currentQuestion ? (
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    style={{ willChange: 'transform, opacity' }}
                  >
                    <QuestionCard
                      question={currentQuestion}
                      onAnswer={handleAnswer}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-12"
                  >
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
                    <p className="text-neutral-600">Loading next question...</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
};