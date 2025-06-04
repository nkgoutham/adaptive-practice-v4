/**
 * Card component for displaying content with various styles
 */
import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  className?: string;
  elevation?: 'none' | 'low' | 'medium' | 'high';
  animate?: boolean;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  footer,
  className = '',
  elevation = 'medium',
  animate = true,
  hoverEffect = true,
}) => {
  // Shadow classes based on elevation
  const shadowClasses = {
    none: '',
    low: 'shadow-soft',
    medium: 'shadow-medium',
    high: 'shadow-3d',
  };
  
  // Base classes for the card
  const baseClasses = 'bg-white rounded-xl overflow-hidden';
  
  // Combine all classes
  const cardClasses = `
    ${baseClasses}
    ${shadowClasses[elevation]}
    ${className}
  `;
  
  // Animation variants
  const cardVariants = {
    initial: { 
      opacity: animate ? 0 : 1, 
      y: animate ? 10 : 0 
    },
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.3,
        ease: 'easeOut'
      }
    },
    hover: {
      y: hoverEffect ? -5 : 0,
      scale: hoverEffect ? 1.01 : 1,
      boxShadow: hoverEffect ? '0 20px 60px -10px rgba(0, 0, 0, 0.15), 0 10px 20px -10px rgba(0, 0, 0, 0.08)' : '',
      transition: { 
        duration: 0.2,
        ease: 'easeOut'
      }
    }
  };
  
  return (
    <motion.div
      className={cardClasses}
      initial="initial"
      animate="animate"
      whileHover="hover"
      variants={cardVariants}
    >
      {(title || subtitle) && (
        <div className="p-5 border-b border-neutral-100">
          {title && <h3 className="text-lg font-semibold text-neutral-800">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
        </div>
      )}
      
      <div className="p-5">
        {children}
      </div>
      
      {footer && (
        <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-100">
          {footer}
        </div>
      )}
    </motion.div>
  );
};