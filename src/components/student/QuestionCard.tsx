/**
 * Question Card component for student practice
 * Fixed the issue where question.options might not be an array, causing TypeError
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { TeachingBuddyCard } from '../ui/TeachingBuddyCard';
import { Star } from '../ui/Star';
import { Question, QuestionOption, StarType, Misconception } from '../../types';

interface QuestionCardProps {
  question: Question;
  onAnswer: (isCorrect: boolean, selectedOptionId: string) => void;
  misconceptions: Misconception[];
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
  misconceptions,
  className = '',
}) => {
  const [selectedOption, setSelectedOption] = useState<QuestionOption | null>(null);
  const [showTeachingBuddy, setShowTeachingBuddy] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [earnedStar, setEarnedStar] = useState<StarType | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<QuestionOption[]>([]);
  
  // Shuffle options when the question changes
  useEffect(() => {
    // Ensure question.options is an array before shuffling
    const options = Array.isArray(question?.options) ? question.options : [];
    setShuffledOptions(shuffleArray(options));
    
    setSelectedOption(null);
    setShowTeachingBuddy(false);
    setShowExplanation(false);
    setEarnedStar(null);
  }, [question]);
  
  const handleOptionSelect = (option: QuestionOption) => {
    if (selectedOption) return; // Prevent changing answer
    
    setSelectedOption(option);
    
    // Determine star type based on correctness and difficulty
    let starType: StarType = 'white'; // Default for attempt
    
    if (option.isCorrect) {
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
    } else {
      // Show teaching buddy for incorrect answers
      if (option.misconceptionTag) {
        setShowTeachingBuddy(true);
      }
    }
    
    setEarnedStar(starType);
    setShowExplanation(true);
    onAnswer(option.isCorrect, option.id);
  };
  
  // Get misconception explanation if available
  const misconceptionExplanation = selectedOption?.misconceptionTag
    ? misconceptions.find(m => m.tag === selectedOption.misconceptionTag)?.explanation
    : null;
  
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
                whileHover={!selectedOption ? "hover" : undefined}
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
        
        <AnimatePresence>
          {showTeachingBuddy && misconceptionExplanation && (
            <TeachingBuddyCard 
              explanation={misconceptionExplanation}
              className="mt-4"
            />
          )}
        </AnimatePresence>
        
        {showExplanation && (
          <div className="pt-4 border-t border-neutral-200 mt-4">
            <Button 
              variant={selectedOption?.isCorrect ? 'success' : 'primary'}
              fullWidth
            >
              {selectedOption?.isCorrect 
                ? 'Great job! Continue to next question' 
                : 'Try another question'}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};