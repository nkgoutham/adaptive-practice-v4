/**
 * Star component for the gamification system
 */
import React from 'react';
import { motion } from 'framer-motion';
import { StarType } from '../../types';

interface StarProps {
  type: StarType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export const Star: React.FC<StarProps> = ({
  type,
  size = 'md',
  className = '',
  animate = true,
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };
  
  // Color classes based on star type
  const colorClasses = {
    white: 'text-neutral-200 fill-neutral-200',
    bronze: 'text-secondary-500 fill-secondary-500',
    silver: 'text-neutral-400 fill-neutral-400',
    gold: 'text-primary-500 fill-primary-500',
  };
  
  // Animation variants
  const starVariants = {
    initial: { 
      scale: animate ? 0 : 1, 
      rotate: animate ? -30 : 0,
      opacity: animate ? 0 : 1
    },
    animate: { 
      scale: 1, 
      rotate: 0,
      opacity: 1,
      transition: { 
        type: 'spring',
        stiffness: 260,
        damping: 20
      }
    },
    hover: {
      scale: animate ? 1.1 : 1,
      rotate: animate ? 5 : 0,
      transition: {
        duration: 0.2
      }
    }
  };
  
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={`${sizeClasses[size]} ${colorClasses[type]} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={starVariants}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </motion.svg>
  );
};