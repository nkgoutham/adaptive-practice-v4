/**
 * Concept Mastery Indicator component for displaying student progress
 */
import React from 'react';
import { motion } from 'framer-motion';
import { ConceptMastery } from '../../types';
import { Star } from './Star';

interface ConceptMasteryIndicatorProps {
  mastery: ConceptMastery;
  className?: string;
  showDetails?: boolean;
}

export const ConceptMasteryIndicator: React.FC<ConceptMasteryIndicatorProps> = ({
  mastery,
  className = '',
  showDetails = true,
}) => {
  // Progress variants
  const progressVariants = {
    initial: { width: 0 },
    animate: { 
      width: `${mastery.proficiencyScore}%`,
      transition: { duration: 0.8, ease: "easeOut" }
    }
  };
  
  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-1">
        <div className="font-medium text-neutral-800">{mastery.conceptName}</div>
        {showDetails && (
          <div className="flex items-center">
            <div className="text-sm font-medium text-neutral-600 mr-2">
              {mastery.proficiencyScore}%
            </div>
            <div className="flex items-center">
              <Star type="white" size="sm" className="mr-1" />
              <span className="text-xs text-neutral-500">{mastery.totalStars}</span>
            </div>
          </div>
        )}
      </div>
      
      <div className="h-2.5 w-full bg-neutral-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            mastery.proficiencyScore >= 75
              ? 'bg-success-500'
              : mastery.proficiencyScore >= 50
              ? 'bg-primary-500'
              : mastery.proficiencyScore >= 25
              ? 'bg-warning-500'
              : 'bg-error-500'
          }`}
          variants={progressVariants}
          initial="initial"
          animate="animate"
        />
      </div>
      
      {showDetails && (
        <div className="flex mt-2 space-x-1">
          {mastery.coloredStars > 0 && (
            <>
              <div className="flex items-center mr-2">
                <Star type="bronze\" size="sm\" className="mr-1" />
                <span className="text-xs text-neutral-500">
                  {Math.floor(mastery.coloredStars / 3)}
                </span>
              </div>
              <div className="flex items-center mr-2">
                <Star type="silver" size="sm" className="mr-1" />
                <span className="text-xs text-neutral-500">
                  {Math.floor(mastery.coloredStars / 2)}
                </span>
              </div>
              <div className="flex items-center">
                <Star type="gold" size="sm" className="mr-1" />
                <span className="text-xs text-neutral-500">
                  {Math.floor(mastery.coloredStars / 1)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};