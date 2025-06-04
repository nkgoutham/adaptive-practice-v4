/**
 * Chapter Card component for student dashboard
 */
import React from 'react';
import { Book } from 'lucide-react';
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
  
  return (
    <Card 
      className={`${className}`}
      elevation="medium"
      hoverEffect
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start mb-4">
          <div className="bg-primary-100 p-3 rounded-lg mr-3">
            <Book className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-800">{chapter.title}</h3>
            <p className="text-sm text-neutral-500">
              Grade {chapter.grade} • {chapter.subject}
            </p>
          </div>
        </div>
        
        <div className="mt-2 mb-4">
          <ProgressBar
            value={masteredConcepts}
            max={totalConcepts}
            color="primary"
            size="sm"
          />
        </div>
        
        <div className="mt-auto">
          <Button
            variant="primary"
            fullWidth
            onClick={() => onStartPractice(chapter.id)}
          >
            {masteredConcepts > 0 ? 'Continue Practice' : 'Start Practice'}
          </Button>
        </div>
      </div>
    </Card>
  );
};