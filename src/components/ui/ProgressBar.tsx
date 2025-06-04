/**
 * Progress Bar component for displaying completion
 */
import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  showValue = true,
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  // Calculate percentage
  const percentage = Math.min(100, Math.round((value / max) * 100)) || 0;
  
  // Size classes
  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };
  
  // Color classes
  const colorClasses = {
    primary: 'bg-primary-500',
    secondary: 'bg-secondary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500',
    neutral: 'bg-neutral-400',
  };
  
  return (
    <div className={`${className}`}>
      <div className="flex justify-between items-center mb-1">
        {showValue && (
          <div className="text-xs font-medium text-neutral-700">
            {value} / {max}
          </div>
        )}
        <div className="text-xs font-medium text-neutral-700">{percentage}%</div>
      </div>
      <div className={`w-full bg-neutral-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <motion.div
          className={`${colorClasses[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};