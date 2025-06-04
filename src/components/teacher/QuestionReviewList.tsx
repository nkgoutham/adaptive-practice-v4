/**
 * Question Review List component for teachers
 */
import React, { useState } from 'react';
import { Filter, CheckCircle, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Question, BloomLevel, DifficultyLevel } from '../../types';
import { QuestionEditModal } from './QuestionEditModal';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';

interface QuestionReviewListProps {
  questions: Question[];
  onPublish: () => void;
  onDelete: (questionId: string) => void;
  chapterId: string;
  conceptId?: string;
  className?: string;
}

export const QuestionReviewList: React.FC<QuestionReviewListProps> = ({
  questions,
  onPublish,
  onDelete,
  chapterId,
  conceptId,
  className = '',
}) => {
  const [bloomFilter, setBloomFilter] = useState<BloomLevel | 'All'>('All');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyLevel | 'All'>('All');
  const [published, setPublished] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { updateQuestion, deleteQuestion } = useContentStore();
  const { user } = useAuthStore();
  
  // Filter questions based on selected filters
  const filteredQuestions = questions.filter(question => 
    (bloomFilter === 'All' || question.bloomLevel === bloomFilter) &&
    (difficultyFilter === 'All' || question.difficulty === difficultyFilter)
  );
  
  const handlePublish = async () => {
    try {
      await onPublish();
      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish questions');
    }
  };
  
  const handleUpdateQuestion = async (updatedQuestion: Question) => {
    if (!user) return;
    
    try {
      setError(null);
      await updateQuestion(
        updatedQuestion.id,
        updatedQuestion,
        user.id
      );
      setEditingQuestion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question');
    }
  };
  
  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    try {
      setError(null);
      await deleteQuestion(questionToDelete.id);
      onDelete(questionToDelete.id);
      setQuestionToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete question');
    }
  };
  
  return (
    <Card 
      className={`${className}`} 
      title="Review Generated Questions"
      subtitle={`${questions.length} questions generated`}
    >
      {error && (
        <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg flex items-center">
          <AlertTriangle className="w-5 h-5 text-error-500 mr-2" />
          <p className="text-sm text-error-700">{error}</p>
        </div>
      )}
      
      {!published ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="flex items-center bg-neutral-100 p-1 rounded-lg">
              <Filter className="w-4 h-4 text-neutral-500 ml-2 mr-1" />
              <select
                className="bg-transparent text-sm text-neutral-700 py-1 pr-2 focus:outline-none"
                value={bloomFilter}
                onChange={(e) => setBloomFilter(e.target.value as BloomLevel | 'All')}
              >
                <option value="All">All Bloom Levels</option>
                <option value="Recall">Recall</option>
                <option value="Conceptual">Conceptual</option>
                <option value="Application">Application</option>
                <option value="Analysis">Analysis</option>
              </select>
            </div>
            
            <div className="flex items-center bg-neutral-100 p-1 rounded-lg">
              <Filter className="w-4 h-4 text-neutral-500 ml-2 mr-1" />
              <select
                className="bg-transparent text-sm text-neutral-700 py-1 pr-2 focus:outline-none"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value as DifficultyLevel | 'All')}
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
          
          <div className="mb-6 space-y-4 max-h-96 overflow-y-auto pr-2">
            {filteredQuestions.map((question) => (
              <div 
                key={question.id}
                className="border border-neutral-200 rounded-lg p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 rounded mr-2">
                      {question.bloomLevel}
                    </span>
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-secondary-100 text-secondary-800 rounded">
                      {question.difficulty}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      className="p-1.5 text-neutral-500 hover:text-primary-500 rounded-full hover:bg-primary-50 transition-colors"
                      onClick={() => setEditingQuestion(question)}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      className="p-1.5 text-neutral-500 hover:text-error-500 rounded-full hover:bg-error-50 transition-colors"
                      onClick={() => setQuestionToDelete(question)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <p className="text-neutral-800 mb-3">{question.stem}</p>
                
                <div className="space-y-2">
                  {question.options.map((option, index) => (
                    <div 
                      key={option.id}
                      className={`p-2 rounded-md text-sm ${
                        option.isCorrect 
                          ? 'bg-success-50 border border-success-200'
                          : 'bg-neutral-50 border border-neutral-200'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded-full mr-2 flex items-center justify-center ${
                          option.isCorrect 
                            ? 'bg-success-500 text-white'
                            : 'bg-neutral-300 text-neutral-700'
                        }`}>
                          <span className="text-xs font-medium">
                            {String.fromCharCode(65 + index)}
                          </span>
                        </div>
                        <span className={option.isCorrect ? 'text-success-700' : 'text-neutral-700'}>
                          {option.text}
                        </span>
                      </div>
                      
                      {option.misconceptionTag && !option.isCorrect && (
                        <div className="mt-1 ml-7 text-xs text-neutral-500">
                          Misconception: {option.misconceptionTag}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <Button
            variant="primary"
            fullWidth
            onClick={handlePublish}
          >
            Publish {conceptId ? 'Concept' : 'Chapter'} Questions
          </Button>
        </>
      ) : (
        <div className="text-center py-6">
          <div className="bg-success-100 rounded-full p-4 inline-block mb-4">
            <CheckCircle className="w-8 h-8 text-success-500" />
          </div>
          <h3 className="text-xl font-semibold text-neutral-800 mb-2">
            Questions Published!
          </h3>
          <p className="text-neutral-600 mb-6">
            Your questions are now available for students to practice.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = '/teacher/analytics';
            }}
          >
            View Analytics
          </Button>
        </div>
      )}
      
      {/* Question Edit Modal */}
      {editingQuestion && (
        <QuestionEditModal
          question={editingQuestion}
          onSave={handleUpdateQuestion}
          onCancel={() => setEditingQuestion(null)}
        />
      )}
      
      {/* Confirmation Modal for Question Deletion */}
      {questionToDelete && (
        <ConfirmationModal
          title="Delete Question"
          message="Are you sure you want to delete this question? This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          confirmVariant="error"
          onConfirm={handleDeleteQuestion}
          onCancel={() => setQuestionToDelete(null)}
        />
      )}
    </Card>
  );
};