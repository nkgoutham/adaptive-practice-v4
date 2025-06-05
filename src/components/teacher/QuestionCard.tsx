/**
 * Question Card component for teacher review with options display
 */
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Edit, Trash2 } from 'lucide-react';
import { Question, BloomLevel, DifficultyLevel } from '../../types';

interface QuestionCardProps {
  question: Question;
  onEdit: () => void;
  onDelete: (questionId: string) => void;
  isPublished?: boolean;
  className?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  onEdit,
  onDelete,
  isPublished = false,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <Card 
      className={`${className}`}
      elevation="low"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 rounded mr-2">
            {question.bloomLevel}
          </span>
          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-secondary-100 text-secondary-800 rounded">
            {question.difficulty}
          </span>
        </div>
        
        {!isPublished && (
          <div className="flex space-x-2">
            <button 
              className="p-1.5 text-neutral-500 hover:text-primary-500 rounded-full hover:bg-primary-50 transition-colors"
              onClick={onEdit}
            >
              <Edit size={16} />
            </button>
            <button 
              className="p-1.5 text-neutral-500 hover:text-error-500 rounded-full hover:bg-error-50 transition-colors"
              onClick={() => onDelete(question.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
      
      <p className="text-neutral-800 mb-3">{question.stem}</p>
      
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <div 
            key={option.id}
            className={`p-2 rounded-md text-sm ${
              option.isCorrect 
                ? 'bg-success-50 border border-success-200'
                : 'bg-neutral-50 border border-neutral-200'
            }`}
          >
            <div className="flex items-center">
              <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
                option.isCorrect 
                  ? 'bg-success-500 text-white'
                  : 'bg-neutral-300 text-neutral-700'
              }`}>
                <span className="text-xs font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
              </div>
              <span className={option.isCorrect ? 'text-success-700' : 'text-neutral-700'}>
                {option.text}
              </span>
            </div>
            
            {option.misconceptionTag && !option.isCorrect && (
              <div className="mt-1 ml-7 text-xs text-neutral-500">
                Misconception: {option.misconceptionTag}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};