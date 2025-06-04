/**
 * Button component with various styles and animations
 */
import React from 'react';
import { motion } from 'framer-motion';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'error';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  className?: string;
  animate?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
  onClick,
  className = '',
  animate = true,
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-opacity-50';
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500',
    secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white focus:ring-secondary-500',
    outline: 'border border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
    ghost: 'text-primary-500 hover:bg-primary-50 focus:ring-primary-500',
    success: 'bg-success-500 hover:bg-success-700 text-white focus:ring-success-500',
    warning: 'bg-warning-500 hover:bg-warning-700 text-white focus:ring-warning-500',
    error: 'bg-error-500 hover:bg-error-700 text-white focus:ring-error-500',
  };
  
  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';
  
  // Disabled & loading classes
  const stateClasses = isDisabled || isLoading
    ? 'opacity-70 cursor-not-allowed'
    : 'cursor-pointer';
  
  // Combine all classes
  const classes = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${widthClasses}
    ${stateClasses}
    ${className}
  `;
  
  // Animation variants
  const buttonVariants = {
    hover: {
      scale: animate ? 1.03 : 1,
      transition: { duration: 0.2 }
    },
    tap: {
      scale: animate ? 0.97 : 1,
      transition: { duration: 0.1 }
    }
  };
  
  return (
    <motion.button
      className={classes}
      onClick={onClick}
      disabled={isDisabled || isLoading}
      whileHover="hover"
      whileTap="tap"
      variants={buttonVariants}
    >
      {isLoading ? (
        <div className="mr-2">
          <svg className="animate-spin h-4 w-4 text-current\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
            <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : icon ? (
        <span className="mr-2">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
};