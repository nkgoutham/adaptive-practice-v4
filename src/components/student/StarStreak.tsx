/**
 * Star Streak component for showing earned stars with improved progress visualization
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Star } from '../ui/Star';
import { StarType } from '../../types';

interface StarStreakProps {
  stars: StarType[];
  className?: string;
  maxStars?: number;
  animate?: boolean;
}

export const StarStreak: React.FC<StarStreakProps> = ({
  stars,
  className = '',
  maxStars = 12,
  animate = true,
}) => {
  // Take only the most recent stars up to maxStars
  const displayStars = stars.slice(-maxStars);
  
  // Animation variants for container
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };
  
  // Calculate current level and progress
  const currentLevel = stars.length <= 3 ? 1 : stars.length <= 7 ? 2 : 3;
  const totalStarsInLevel = currentLevel === 1 ? 3 : currentLevel === 2 ? 4 : 5;
  const currentLevelProgress = stars.length <= 3 ? stars.length : 
                              stars.length <= 7 ? stars.length - 3 : 
                              stars.length - 7;
  const progressPercentage = (currentLevelProgress / totalStarsInLevel) * 100;
  
  // Star counts by type
  const bronzeStars = stars.filter(s => s === 'bronze').length;
  const silverStars = stars.filter(s => s === 'silver').length;
  const goldStars = stars.filter(s => s === 'gold').length;
  
  return (
    <motion.div
      className={`${className}`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-medium text-neutral-700">Your Progress</div>
        <div className="text-xs text-neutral-500">{stars.length} stars earned</div>
      </div>
      
      <div className="relative bg-neutral-100 rounded-lg p-3">
        {/* Progress bar */}
        <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden mb-3">
          <motion.div
            className={`h-full rounded-full ${
              progressPercentage >= 75
                ? 'bg-success-500'
                : progressPercentage >= 50
                ? 'bg-primary-500'
                : progressPercentage >= 25
                ? 'bg-warning-500'
                : 'bg-error-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
            initial="initial"
            animate="animate"
          />
        </div>
        
        {/* Level markers */}
        <div className="flex justify-between items-center mb-3 relative">
          {[1, 2, 3].map(level => (
            <div 
              key={level} 
              className={`flex flex-col items-center ${
                level === currentLevel ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <div className={`w-3 h-3 rounded-full ${
                level <= currentLevel ? 'bg-primary-500' : 'bg-neutral-300'
              }`} />
              <span className={`text-xs font-medium mt-1 ${
                level === currentLevel ? 'text-primary-600' : 'text-neutral-500'
              }`}>
                Level {level}
              </span>
            </div>
          ))}
          
          {/* Connecting line */}
          <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-neutral-200 -z-10"></div>
        </div>
        
        {/* Subtle star type summary */}
        <div className="flex justify-center mt-3 space-x-4">
          <div className="flex items-center">
            <Star type="bronze" size="sm" className="mr-1" />
            <span className="text-xs text-neutral-500">{bronzeStars}</span>
          </div>
          <div className="flex items-center">
            <Star type="silver" size="sm" className="mr-1" />
            <span className="text-xs text-neutral-500">{silverStars}</span>
          </div>
          <div className="flex items-center">
            <Star type="gold" size="sm" className="mr-1" />
            <span className="text-xs text-neutral-500">{goldStars}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};