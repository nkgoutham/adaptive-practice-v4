/**
 * Teaching Buddy Card component for showing explanations for misconceptions
 * Implemented as a modal overlay for better UX
 */
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { Button } from './Button';

interface TeachingBuddyCardProps {
  explanation: string;
  isOpen: boolean;
  onUnderstand: () => void;
  className?: string;
  isLoading?: boolean;
}

export const TeachingBuddyCard: React.FC<TeachingBuddyCardProps> = ({
  explanation,
  isOpen,
  onUnderstand,
  className = '',
  isLoading = false,
}) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  
  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.3 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };
  
  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        type: 'spring',
        stiffness: 300,
        damping: 30,
        delay: 0.1
      }
    },
    exit: {
      opacity: 0,
      y: 10,
      scale: 0.95,
      transition: {
        duration: 0.2
      }
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div 
            className="fixed inset-0 bg-neutral-900 bg-opacity-75 backdrop-blur-sm"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ willChange: 'opacity' }}
          />
          
          <motion.div 
            className={`relative bg-white rounded-xl max-w-md w-full mx-auto shadow-strong overflow-hidden ${className}`}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="p-6">
              <div className="flex items-start space-x-4 mb-4">
                <div className="bg-accent-500 rounded-full p-3 flex-shrink-0">
                  <Lightbulb className="text-white w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <h4 className="font-semibold text-accent-800 text-lg">
                    Let's understand this better!
                  </h4>
                </div>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  <div className="w-full bg-accent-100 h-2 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-accent-500"
                      initial={{ width: "0%" }}
                      animate={{ 
                        width: "100%",
                        transition: { duration: 2, ease: "linear" }
                      }}
                    />
                  </div>
                  <p className="text-center text-accent-600 py-4">Analyzing your response...</p>
                </div>
              ) : (
                <>
                  <div className="text-left text-accent-700 text-base leading-relaxed mb-6">
                    {explanation}
                  </div>
                  
                  <div className="mt-4 text-left text-sm text-accent-600 italic mb-6">
                    Take a moment to think about this explanation before moving on.
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      onClick={onUnderstand}
                    >
                      I understand - continue
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};