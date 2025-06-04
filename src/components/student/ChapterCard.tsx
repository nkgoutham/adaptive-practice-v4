/**
 * Chapter Card component for student dashboard
 * Shows chapter information and publication status
 */
import React from 'react';
import { Book, Lock, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { Chapter, ConceptMastery } from '../../types';

interface ChapterCardProps {
  chapter: Chapter;
  conceptMasteries?: ConceptMastery[];
  onStartPractice: (chapterId: string) => void;
  className?: string;
}

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapter,
  conceptMasteries = [],
  onStartPractice,
  className = '',
}) => {
  // Calculate overall progress
  const totalConcepts = chapter.concepts.length;
  const masteredConcepts = conceptMasteries
    .filter(mastery => mastery.proficiencyScore >= 75)
    .length;
  
  // Check if chapter has any published concepts, even if the chapter itself isn't published
  const hasPublishedConcepts = chapter.concepts.some(concept => concept.isPublished);
  
  // Count published concepts
  const publishedConceptsCount = chapter.concepts.filter(concept => concept.isPublished).length;
  
  console.log(`Chapter ${chapter.title} hasPublishedConcepts:`, hasPublishedConcepts); 
  console.log(`Chapter ${chapter.title} publishedConceptsCount:`, publishedConceptsCount);
  
  return (
    <Card 
      className={`${className}`}
      elevation="medium"
      hoverEffect
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-4">
          <div className={`p-3 rounded-lg mr-3 ${
            hasPublishedConcepts ? 'bg-primary-100' : 'bg-neutral-100'
          }`}>
            <Book className={`w-5 h-5 ${
              hasPublishedConcepts ? 'text-primary-600' : 'text-neutral-500'
            }`} />
          </div>
          <div>
            <div className="flex items-center">
              <h3 className="font-semibold text-neutral-800">{chapter.title}</h3>
              {hasPublishedConcepts ? (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                  <CheckCircle size={12} className="mr-1" />
                  Ready
                </span>
              ) : (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600">
                  <Lock size={12} className="mr-1" />
                  Coming Soon
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500">
              Grade {chapter.grade} • {chapter.subject}
            </p>
          </div>
        </div>
        
        <div className="mb-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-neutral-600">Total Concepts:</span>
            <span className="font-medium text-neutral-800">{totalConcepts}</span>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <span className="text-neutral-600">Available for Practice:</span>
            <span className="font-medium text-neutral-800">
              {publishedConceptsCount}
            </span>
          </div>
          
          {conceptMasteries.length > 0 && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-neutral-600">Mastered:</span>
              <span className="font-medium text-neutral-800">{masteredConcepts}</span>
            </div>
          )}
        </div>
        
        <div className="mt-2 mb-4">
          <ProgressBar
            value={masteredConcepts}
            max={totalConcepts}
            color={hasPublishedConcepts ? "primary" : "neutral"}
            size="sm"
          />
        </div>
        
        <div className="mt-auto">
          <Button
            variant={hasPublishedConcepts ? "primary" : "outline"}
            fullWidth
            onClick={() => hasPublishedConcepts && onStartPractice(chapter.id)}
            disabled={!hasPublishedConcepts}
          >
            {hasPublishedConcepts
              ? (masteredConcepts > 0 ? 'Continue Practice' : 'Start Practice')
              : 'Coming Soon'}
          </Button>
        </div>
      </div>
    </Card>
  );
};