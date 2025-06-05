/**
 * Question Edit Modal component for teachers to edit questions
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/Button';
import { AlertTriangle, Info } from 'lucide-react';
import { Question, BloomLevel, DifficultyLevel } from '../../types';
import { useContentStore } from '../../store/contentStore';

interface QuestionEditModalProps {
  question: Question;
  onSave: (updatedQuestion: Question) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

export const QuestionEditModal: React.FC<QuestionEditModalProps> = ({
  question,
  onSave,
  onCancel,
  isSaving = false,
}) => {
  const [editedQuestion, setEditedQuestion] = useState<Question>({...question});
  const [error, setError] = useState<string | null>(null);
  const { misconceptions } = useContentStore();
  
  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { duration: 0.2 }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.2 }
    }
  };
  
  const modalVariants = {
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
        delay: 0.1,
        duration: 0.3,
        ease: 'easeOut'
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2
      }
    }
  };
  
  const handleStemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedQuestion(prev => ({...prev, stem: e.target.value}));
  };
  
  const handleBloomLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedQuestion(prev => ({...prev, bloomLevel: e.target.value as BloomLevel}));
  };
  
  const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditedQuestion(prev => ({...prev, difficulty: e.target.value as DifficultyLevel}));
  };
  
  const handleOptionTextChange = (id: string, text: string) => {
    setEditedQuestion(prev => ({
      ...prev,
      options: prev.options.map(opt => 
        opt.id === id ? {...opt, text} : opt
      )
    }));
  };
  
  const handleOptionCorrectChange = (id: string) => {
    setEditedQuestion(prev => ({
      ...prev,
      options: prev.options.map(opt => ({
        ...opt, 
        isCorrect: opt.id === id,
        // Clear misconception tag if marked as correct
        misconceptionTag: opt.id === id ? undefined : opt.misconceptionTag
      }))
    }));
  };
  
  const handleMisconceptionChange = (id: string, misconceptionTag: string) => {
    setEditedQuestion(prev => ({
      ...prev,
      options: prev.options.map(opt => 
        opt.id === id ? {...opt, misconceptionTag} : opt
      )
    }));
  };
  
  const handleSubmit = () => {
    // Validate question
    if (editedQuestion.stem.trim() === '') {
      setError('Question stem cannot be empty');
      return;
    }
    
    // Validate at least one correct option
    const hasCorrectOption = editedQuestion.options.some(opt => opt.isCorrect);
    if (!hasCorrectOption) {
      setError('At least one option must be marked as correct');
      return;
    }
    
    // Validate all options have text
    const emptyOption = editedQuestion.options.find(opt => opt.text.trim() === '');
    if (emptyOption) {
      setError('All options must have text');
      return;
    }
    
    // All validations passed
    onSave(editedQuestion);
  };
  
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-neutral-900 bg-opacity-50 z-50 flex items-center justify-center"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onCancel}
        style={{ overflowY: 'auto', padding: '2rem 0' }}
      >
        {/* Modal */}
        <motion.div
          className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 shadow-strong relative"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          style={{ maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}
        >
          <h3 className="text-xl font-semibold text-neutral-800 mb-4">
            Edit Question
          </h3>
          
          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg flex items-center">
              <AlertTriangle className="text-error-500 mr-2" size={18} />
              <span className="text-sm text-error-700">{error}</span>
            </div>
          )}
          
          <div className="space-y-4 mb-6">
            {/* Question Stem */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Question
              </label>
              <textarea
                value={editedQuestion.stem}
                onChange={handleStemChange}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                rows={4}
              />
            </div>
            
            {/* Bloom Level and Difficulty */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Bloom's Taxonomy Level
                </label>
                <select
                  value={editedQuestion.bloomLevel}
                  onChange={handleBloomLevelChange}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Recall">Recall</option>
                  <option value="Conceptual">Conceptual</option>
                  <option value="Application">Application</option>
                  <option value="Analysis">Analysis</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  value={editedQuestion.difficulty}
                  onChange={handleDifficultyChange}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
            
            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Answer Options
              </label>
              
              <div className="space-y-3">
                {editedQuestion.options.map((option, index) => (
                  <div 
                    key={option.id}
                    className={`p-3 rounded-lg border ${
                      option.isCorrect 
                        ? 'border-success-300 bg-success-50' 
                        : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <div className="flex items-center">
                        <input
                          type="radio"
                          id={`correct-${option.id}`}
                          name="correctOption"
                          checked={option.isCorrect}
                          onChange={() => handleOptionCorrectChange(option.id)}
                          className="w-4 h-4 text-primary-600 border-neutral-300 focus:ring-primary-500"
                        />
                        <label htmlFor={`correct-${option.id}`} className="ml-2 text-sm font-medium text-neutral-700">
                          Correct Answer
                        </label>
                      </div>
                      
                      <div className="ml-3 w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center">
                        <span className="text-xs font-medium text-neutral-700">
                          {String.fromCharCode(65 + index)}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionTextChange(option.id, e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    
                    {!option.isCorrect && (
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-neutral-700 mb-1">
                          Misconception Tag
                        </label>
                        <select
                          value={option.misconceptionTag || ''}
                          onChange={(e) => handleMisconceptionChange(option.id, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select a misconception tag</option>
                          {misconceptions.map(m => (
                            <option key={m.tag} value={m.tag}>{m.tag}</option>
                          ))}
                        </select>
                        
                        {option.misconceptionTag && (
                          <div className="mt-1 bg-neutral-50 p-2 rounded-lg text-xs">
                            <div className="flex items-start">
                              <Info size={12} className="text-neutral-500 mt-0.5 mr-1 flex-shrink-0" />
                              <span className="text-neutral-600">
                                {misconceptions.find(m => m.tag === option.misconceptionTag)?.explanation || 
                                'No explanation available for this misconception.'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 sticky bottom-0 pt-4 bg-white border-t border-neutral-100 mt-6">
            <Button 
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button 
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSaving}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};