/**
 * Teaching Buddy Card component for showing explanations for misconceptions
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';

interface TeachingBuddyCardProps {
  explanation: string;
  className?: string;
}

export const TeachingBuddyCard: React.FC<TeachingBuddyCardProps> = ({
  explanation,
  className = '',
}) => {
  // Animation variants
  const cardVariants = {
    initial: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    animate: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      y: 10,
      scale: 0.9,
      transition: {
        duration: 0.2
      }
    }
  };
  
  return (
    <motion.div
      className={`bg-accent-50 border border-accent-200 rounded-xl p-4 ${className}`}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={cardVariants}
    >
      <div className="flex items-start">
        <div className="bg-accent-500 rounded-full p-2 mr-3">
          <Lightbulb className="text-white w-5 h-5" />
        </div>
        <div>
          <h4 className="font-semibold text-accent-800 mb-1">Learning Tip</h4>
          <p className="text-accent-700 text-sm">{explanation}</p>
        </div>
      </div>
    </motion.div>
  );
};