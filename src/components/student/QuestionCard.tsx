/**
 * Question Card component for student practice
 * Implemented with improved Teaching Buddy modal flow
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TeachingBuddyCard } from '../ui/TeachingBuddyCard';
import { Star } from '../ui/Star';
import { Question, QuestionOption, StarType } from '../../types';
import { supabase } from '../../lib/supabase';

interface QuestionCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, selectedOptionId: string) => void;
  className?: string;
}

// Fisher-Yates shuffle algorithm for randomizing options
const shuffleArray = <T,>(array: T[]): T[] => {
  if (!Array.isArray(array)) return [];
  
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onAnswer,
  className = '',
}) => {
  const [selectedOption, setSelectedOption] = useState<QuestionOption | null>(null);
  const [showTeachingBuddy, setShowTeachingBuddy] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [earnedStar, setEarnedStar] = useState<StarType | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<QuestionOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [dynamicExplanation, setDynamicExplanation] = useState<string | null>(null);
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);
  
  // Shuffle options when the question changes
  useEffect(() => {
    // Ensure question.options is an array before shuffling
    const options = Array.isArray(question?.options) ? question.options : [];
    setShuffledOptions(shuffleArray(options));
    
    setSelectedOption(null);
    setShowTeachingBuddy(false);
    setShowExplanation(false);
    setEarnedStar(null);
    setIsSubmitting(false);
    setCanProceed(false);
    setDynamicExplanation(null);
    setIsGeneratingExplanation(false);
  }, [question]);
  
  const handleOptionSelect = (option: QuestionOption) => {
    // Allow changing selection until submission
    if (!showExplanation) {
      setSelectedOption(option);
    }
  };
  
  const handleSubmitAnswer = async () => {
    if (!selectedOption) return;
    setIsSubmitting(true);
    
    // Determine star type based on correctness and difficulty
    let starType: StarType = 'white'; // Default for attempt
    
    if (selectedOption.isCorrect) {
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
      
      // For correct answers, show explanation and allow proceeding immediately
      setEarnedStar(starType);
      setShowExplanation(true);
      setCanProceed(true);
      setIsSubmitting(false);
      
      // Record the attempt immediately for correct answers
      onAnswer(true, selectedOption.id);
    } else {
      // For incorrect answers with a misconception tag
      setEarnedStar(starType);
      setShowExplanation(true);
      
      if (selectedOption.misconceptionTag) {
        setIsGeneratingExplanation(true);
        setShowTeachingBuddy(true);
        
        try {
          // Call the Supabase Edge Function to generate an explanation
          const { data, error } = await supabase.functions.invoke('generate-misconception-explanation', {
            body: JSON.stringify({
              questionId: question.id,
              selectedOptionId: selectedOption.id,
              misconceptionTag: selectedOption.misconceptionTag
            })
          });
          
          if (error) {
            console.error('Error generating explanation:', error);
            setDynamicExplanation(
              "Let's review this concept together. Understanding the fundamental principles will help you identify the correct answer."
            );
          } else {
            // Set the dynamically generated explanation
            setDynamicExplanation(data.explanation);
          }
        } catch (err) {
          console.error('Failed to generate explanation:', err);
          setDynamicExplanation(
            "Let's review this concept together. Understanding the fundamental principles will help you identify the correct answer."
          );
        } finally {
          setIsGeneratingExplanation(false);
          setIsSubmitting(false);
        }
      } else {
        // No misconception tag, can proceed immediately
        setCanProceed(true);
        setIsSubmitting(false);
        
        // Record attempt immediately if no misconception to address
        onAnswer(false, selectedOption.id);
      }
    }
  };
  
  const handleNext = () => {
    if (!selectedOption) return;
    
    // Record the attempt and proceed to next question
    if (!selectedOption.isCorrect) {
      onAnswer(false, selectedOption.id);
    }
  };
  
  const handleUnderstandClick = () => {
    // Close the teaching buddy modal and allow proceeding
    setShowTeachingBuddy(false);
    setCanProceed(true);
    
    // Important: Only now record the attempt after the student has seen the explanation
    if (selectedOption && !selectedOption.isCorrect) {
      onAnswer(false, selectedOption.id);
    }
  };
  
  // Option animation variants
  const optionVariants = {
    initial: { opacity: 0, y: 20 },
    animate: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3
      }
    }),
    hover: {
      scale: 1.02,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
      transition: {
        duration: 0.2
      }
    }
  };
  
  return (
    <>
      <Card 
        className={`max-w-xl mx-auto ${className}`}
        elevation="high"
      >
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-800 rounded text-xs font-medium">
                  {question.bloomLevel}
                </span>
                <span className="ml-2 inline-block px-2 py-0.5 bg-secondary-100 text-secondary-800 rounded text-xs font-medium">
                  {question.difficulty}
                </span>
              </div>
              
              {earnedStar && (
                <div className="mt-1">
                  <Star type={earnedStar} size="md" />
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-medium text-neutral-800 mb-4">
              {question.stem}
            </h3>
          </div>
          
          <div className="space-y-3">
            {shuffledOptions.map((option, index) => {
              const isSelected = selectedOption?.id === option.id;
              let optionClass = 'border border-neutral-200 bg-white';
              
              if (showExplanation) {
                if (option.isCorrect) {
                  optionClass = 'border-2 border-success-500 bg-success-50';
                } else if (isSelected) {
                  optionClass = 'border-2 border-error-500 bg-error-50';
                }
              } else if (isSelected) {
                optionClass = 'border-2 border-primary-500 bg-primary-50';
              }
              
              return (
                <motion.div
                  key={option.id}
                  className={`p-3 rounded-lg cursor-pointer ${optionClass}`}
                  onClick={() => handleOptionSelect(option)}
                  custom={index}
                  variants={optionVariants}
                  initial="initial"
                  animate="animate"
                  whileHover={!showExplanation ? "hover" : undefined}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full mr-2 flex items-center justify-center border ${
                      isSelected 
                        ? 'border-2 border-primary-500 bg-primary-50' 
                        : 'border-neutral-300'
                    }`}>
                      <span className="text-sm font-medium">
                        {String.fromCharCode(65 + index)}
                      </span>
                    </div>
                    <span className="text-neutral-700">{option.text}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
          
          <div className="pt-4 border-t border-neutral-200 mt-4">
            {!showExplanation ? (
              <Button 
                variant={selectedOption ? "primary" : "outline"}
                fullWidth
                onClick={handleSubmitAnswer}
                disabled={!selectedOption || isSubmitting}
                isLoading={isSubmitting}
              >
                Submit Answer
              </Button>
            ) : (
              <Button
                variant={selectedOption?.isCorrect ? 'success' : 'primary'}
                fullWidth
                onClick={handleNext}
                disabled={!canProceed || showTeachingBuddy}
              >
                Next Question
              </Button>
            )}
          </div>
        </div>
      </Card>
      
      {/* Teaching Buddy Modal - Positioned outside the QuestionCard to render as a true modal */}
      <TeachingBuddyCard 
        explanation={dynamicExplanation || ""}
        isOpen={showTeachingBuddy}
        onUnderstand={handleUnderstandClick}
        isLoading={isGeneratingExplanation}
      />
    </>
  );
};