/**
 * Concept Card component for displaying concept information
 * and practice availability
 */
import React from 'react';
import { Book, Lock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Concept } from '../../types';

interface ConceptCardProps {
  concept: Concept;
  isMastered: boolean;
  isSelected: boolean;
  isPublished?: boolean;
  onClick: () => void;
  className?: string;
}

export const ConceptCard: React.FC<ConceptCardProps> = ({
  concept,
  isMastered,
  isSelected,
  isPublished = true,
  onClick,
  className = '',
}) => {
  // Use provided isPublished prop or concept.isPublished
  const isConceptPublished = isPublished && concept.isPublished;
  const questionCount = concept.questions.length;
  
  return (
    <div 
      className={`
        ${className}
        p-4 rounded-lg border ${isConceptPublished ? 'border-neutral-200 bg-white' : 'border-neutral-200 bg-neutral-50'}
        ${isSelected ? 'border-2 border-primary-400 bg-primary-50' : ''}
        ${!isConceptPublished ? 'opacity-70' : ''}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start">
          <div className={`p-2.5 rounded-lg mr-3 ${
            isConceptPublished 
              ? isMastered 
                ? 'bg-success-100' 
                : 'bg-primary-100'
              : 'bg-neutral-100'
          }`}>
            <Book className={`w-4 h-4 ${
              isConceptPublished 
                ? isMastered 
                  ? 'text-success-600'
                  : 'text-primary-600'
                : 'text-neutral-500'
            }`} />
          </div>
          
          <div>
            <div className="flex items-center">
              <h3 className="font-medium text-neutral-800">{concept.name}</h3>
              {isConceptPublished ? (
                isMastered ? (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                    <CheckCircle size={10} className="mr-1" />
                    Mastered
                  </span>
                ) : null
              ) : (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                  <Lock size={10} className="mr-1" />
                  Coming Soon
                </span>
              )}
            </div>
            
            <p className="text-sm text-neutral-600 mt-1">
              {isConceptPublished 
                ? `${questionCount} questions available`
                : 'Not available for practice yet'}
            </p>
          </div>
        </div>
        
        {isConceptPublished && (
          <div>
            <Button
              variant={isSelected ? "outline" : "primary"}
              size="sm"
              onClick={onClick}
            >
              {isSelected ? 'Selected' : isMastered ? 'Review' : 'Start'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};