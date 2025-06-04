/**
 * Star Streak component for showing earned stars
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
  maxStars = 10,
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
  
  // Milestone indicators
  const milestones = [3, 5, 7];
  
  return (
    <motion.div
      className={`${className}`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-neutral-700">Your Progress</h3>
        <div className="text-xs text-neutral-500">{stars.length} stars earned</div>
      </div>
      
      <div className="relative bg-neutral-100 rounded-lg p-2">
        {/* Milestone markers */}
        {milestones.map(milestone => (
          <div 
            key={milestone}
            className="absolute top-0 bottom-0 border-l-2 border-dashed border-primary-300"
            style={{ 
              left: `${(milestone / maxStars) * 100}%`,
              opacity: stars.length >= milestone ? 1 : 0.5
            }}
          />
        ))}
        
        {/* Star display */}
        <div className="flex justify-start space-x-1 relative z-10">
          {displayStars.map((starType, index) => (
            <Star 
              key={index}
              type={starType}
              size="md"
              animate={animate}
            />
          ))}
          
          {/* Empty star placeholders */}
          {Array.from({ length: Math.max(0, maxStars - displayStars.length) }).map((_, index) => (
            <div 
              key={`empty-${index}`} 
              className="w-6 h-6 rounded-full border-2 border-dashed border-neutral-300"
            />
          ))}
        </div>
        
        {/* Milestone labels */}
        <div className="flex justify-between mt-1">
          {milestones.map(milestone => (
            <div 
              key={milestone}
              className={`text-xs font-medium ${
                stars.length >= milestone 
                  ? 'text-primary-600' 
                  : 'text-neutral-400'
              }`}
              style={{ 
                marginLeft: `${(milestone / maxStars) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              {milestone}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};