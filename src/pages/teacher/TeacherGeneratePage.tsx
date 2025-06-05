/**
 * Teacher Generate Questions Page component
 * Displays extracted concepts and provides interfaces for generating questions
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, BookOpen, Sparkles, AlertCircle, Check, Loader, Edit, Trash2 } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { QuestionReviewList } from '../../components/teacher/QuestionReviewList';
import { QuestionEditModal } from '../../components/teacher/QuestionEditModal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Question } from '../../types';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';
import { QuestionCard } from '../../components/teacher/QuestionCard';

interface ConceptWithDescription {
  id: string;
  name: string;
  description?: string;
  startPageNumber?: number;
  endPageNumber?: number;
  isExpanded: boolean;
  isGenerating: boolean;
  isGenerated: boolean;
  isPublished: boolean;
  hasError: boolean;
}

export const TeacherGeneratePage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { user } = useAuthStore();
  const { 
    getChapterById, 
    generateQuestionsForChapter, 
    generateQuestionsForConcept,
    publishChapter,
    publishConcept,
    deleteQuestion,
    isLoading,
    fetchChapters
  } = useContentStore();
  const navigate = useNavigate();
  
  const [error, setError] = useState<string | null>(null);
  const [conceptsWithMeta, setConceptsWithMeta] = useState<ConceptWithDescription[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [isSavingQuestion, setIsSavingQuestion] = useState(false);
  
  // Ensure we have the latest data
  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchChapters();
      } catch (err) {
        console.error("Error fetching chapters:", err);
      }
    };
    
    loadData();
  }, [fetchChapters]);
  
  useEffect(() => {
    if (!chapterId || !user) return;
    
    const chapter = getChapterById(chapterId);
    if (!chapter) {
      navigate('/teacher/chapters');
      return;
    }
    
    // Initialize concepts with descriptions and page ranges
    if (chapter.concepts.length > 0) {
      const conceptsWithMetadata = chapter.concepts.map((concept) => {
        // Generate a generic description for each concept
        const description = `This concept covers key educational principles related to ${concept.name.toLowerCase()}. Students should understand the fundamental aspects and practical applications.`;
        
        return {
          id: concept.id,
          name: concept.name,
          description: description,
          startPageNumber: concept.startPageNumber,
          endPageNumber: concept.endPageNumber,
          isExpanded: false,
          isGenerating: false,
          isGenerated: concept.questions.length > 0,
          isPublished: concept.isPublished,
          hasError: false
        };
      });
      
      setConceptsWithMeta(conceptsWithMetadata);
    }
  }, [chapterId, user, navigate, getChapterById]);
  
  const handleGenerateAllQuestions = async () => {
    if (!chapterId) return;
    
    setIsGeneratingAll(true);
    setError(null);
    
    try {
      // Update all concepts to show generating state
      setConceptsWithMeta(prevConcepts => 
        prevConcepts.map(concept => ({
          ...concept,
          isGenerating: true,
          hasError: false
        }))
      );
      
      await generateQuestionsForChapter(chapterId);
      
      // Update all concepts to show generated state
      setConceptsWithMeta(prevConcepts => 
        prevConcepts.map(concept => ({
          ...concept,
          isGenerating: false,
          isGenerated: true,
          hasError: false
        }))
      );
    } catch (err) {
      setError('Failed to generate questions. Please try again.');
      
      // Update concepts to show error state
      setConceptsWithMeta(prevConcepts => 
        prevConcepts.map(concept => ({
          ...concept,
          isGenerating: false,
          hasError: true
        }))
      );
    } finally {
      setIsGeneratingAll(false);
    }
  };
  
  const handleGenerateConceptQuestions = async (conceptId: string) => {
    setError(null);
    
    // Update the specific concept's generating state
    setConceptsWithMeta(prevConcepts => 
      prevConcepts.map(concept => 
        concept.id === conceptId 
          ? { ...concept, isGenerating: true, hasError: false }
          : concept
      )
    );
    
    try {
      await generateQuestionsForConcept(conceptId);
      
      // Update the specific concept's generated state
      setConceptsWithMeta(prevConcepts => 
        prevConcepts.map(concept => 
          concept.id === conceptId 
            ? { ...concept, isGenerating: false, isGenerated: true, hasError: false }
            : concept
        )
      );
    } catch (err) {
      // Update the specific concept's error state
      setConceptsWithMeta(prevConcepts => 
        prevConcepts.map(concept => 
          concept.id === conceptId 
            ? { ...concept, isGenerating: false, hasError: true }
            : concept
        )
      );
    }
  };
  
  const toggleConceptExpansion = (conceptId: string) => {
    setConceptsWithMeta(prevConcepts => 
      prevConcepts.map(concept => 
        concept.id === conceptId 
          ? { ...concept, isExpanded: !concept.isExpanded }
          : concept
      )
    );
  };
  
  const handleReviewConcept = (conceptId: string) => {
    setSelectedConceptId(conceptId);
    setShowReviewModal(true);
  };
  
  const handlePublishChapter = async () => {
    if (!chapterId) return;
    
    try {
      setError(null);
      await publishChapter(chapterId);
      
      // Update local state
      setConceptsWithMeta(prevConcepts =>
        prevConcepts.map(concept => ({
          ...concept,
          isPublished: true
        }))
      );
      
      // Navigate to analytics
      navigate('/teacher/analytics');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish chapter');
    }
  };
  
  const handlePublishConcept = async () => {
    if (!selectedConceptId) return;
    
    try {
      setError(null);
      await publishConcept(selectedConceptId);
      
      // Update local state
      setConceptsWithMeta(prevConcepts =>
        prevConcepts.map(concept => 
          concept.id === selectedConceptId
            ? { ...concept, isPublished: true }
            : concept
        )
      );
      
      setShowReviewModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish concept');
    }
  };
  
  const handleQuestionDeleted = (questionId: string) => {
    const chapter = getChapterById(chapterId!);
    if (!chapter) return;
    
    // Find the concept this question belongs to
    let conceptId: string | null = null;
    for (const concept of chapter.concepts) {
      if (concept.questions.some(q => q.id === questionId)) {
        conceptId = concept.id;
        break;
      }
    }
    
    if (conceptId) {
      // Check if the concept still has questions
      const conceptQuestions = chapter.concepts
        .find(c => c.id === conceptId)?.questions || [];
      
      if (conceptQuestions.length <= 1) {
        // If this was the last question, update concept state
        setConceptsWithMeta(prevConcepts =>
          prevConcepts.map(concept => 
            concept.id === conceptId
              ? { ...concept, isGenerated: false }
              : concept
          )
        );
      }
    }
  };
  
  const handleEditQuestion = async (updatedQuestion: Question) => {
    if (!user) return;
    
    setIsSavingQuestion(true);
    setError(null);
    
    try {
      await useContentStore.getState().updateQuestion(
        updatedQuestion.id,
        updatedQuestion,
        user.id
      );
      
      // Refresh chapters to get updated data
      await fetchChapters();
      
      setEditingQuestion(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update question');
    } finally {
      setIsSavingQuestion(false);
    }
  };
  
  const handleDeleteQuestion = (questionId: string) => {
    const chapter = getChapterById(chapterId!);
    if (!chapter) return;
    
    // Find the question to delete
    let questionToDelete: Question | null = null;
    
    for (const concept of chapter.concepts) {
      const question = concept.questions.find(q => q.id === questionId);
      if (question) {
        questionToDelete = question;
        break;
      }
    }
    
    if (questionToDelete) {
      setQuestionToDelete(questionToDelete);
    }
  };
  
  if (!user || user.role !== 'teacher') {
    return <div>Access denied</div>;
  }
  
  const chapter = getChapterById(chapterId!);
  if (!chapter) {
    return (
      <Layout>
        <p>Chapter not found</p>
      </Layout>
    );
  }
  
  // Get selected concept data for review modal
  const selectedConcept = selectedConceptId 
    ? chapter.concepts.find(c => c.id === selectedConceptId)
    : null;
  
  const selectedConceptQuestions = selectedConcept?.questions || [];
  
  const allQuestionsGenerated = chapter.concepts.every(
    concept => concept.questions.length > 0
  );
  
  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-800">
          Generate Questions: {chapter.title}
        </h1>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/teacher/chapters')}
          >
            View All Chapters
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/teacher/upload')}
          >
            Upload New Chapter
          </Button>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-center">
          <AlertCircle className="text-error-500 mr-2" size={20} />
          <span className="text-error-700">{error}</span>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card elevation="medium" className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-neutral-800">Extracted Concepts</h2>
              
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  isLoading={isGeneratingAll}
                  onClick={handleGenerateAllQuestions}
                  icon={<Sparkles size={16} />}
                  disabled={isGeneratingAll || isLoading || allQuestionsGenerated}
                >
                  Generate All Questions
                </Button>
                
                {allQuestionsGenerated && !chapter.isPublished && (
                  <Button
                    variant="success"
                    onClick={handlePublishChapter}
                    icon={<Check size={16} />}
                  >
                    Publish Chapter
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              {conceptsWithMeta.map(concept => {
                // Get questions for this concept
                const conceptQuestions = chapter.concepts
                  .find(c => c.id === concept.id)?.questions || [];
                
                // Format page range display
                const pageRangeText = concept.startPageNumber && concept.endPageNumber 
                  ? `Pages ${concept.startPageNumber}-${concept.endPageNumber}`
                  : "Pages not specified";
                
                return (
                  <div 
                    key={concept.id}
                    className={`border rounded-lg overflow-hidden ${
                      concept.isPublished 
                        ? 'border-success-300 bg-success-50'
                        : 'border-neutral-200'
                    }`}
                  >
                    <div 
                      className={`p-4 cursor-pointer hover:bg-neutral-50 flex justify-between items-start ${
                        concept.isPublished ? 'bg-success-50' : 'bg-white'
                      }`}
                      onClick={() => toggleConceptExpansion(concept.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h3 className="font-semibold text-neutral-800 mr-2">
                            {concept.name}
                          </h3>
                          
                          {concept.isPublished && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                              <Check size={12} className="mr-1" />
                              Published
                            </span>
                          )}
                          
                          {concept.isGenerated && !concept.isPublished && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              <Check size={12} className="mr-1" />
                              Questions Generated
                            </span>
                          )}
                          
                          {concept.hasError && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
                              <AlertCircle size={12} className="mr-1" />
                              Generation Failed
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-neutral-600 mb-2">
                          {concept.description}
                        </p>
                        
                        <div className="flex items-center text-xs text-neutral-500">
                          <BookOpen size={12} className="mr-1" />
                          <span>{pageRangeText}</span>
                          
                          {concept.isGenerated && (
                            <span className="ml-3">
                              {conceptQuestions.length} questions
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center ml-4">
                        {!concept.isGenerating && !concept.isGenerated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateConceptQuestions(concept.id);
                            }}
                            icon={<Sparkles size={14} />}
                            className="mr-3"
                          >
                            Generate
                          </Button>
                        )}
                        
                        {concept.isGenerating && (
                          <div className="flex items-center mr-3 text-primary-500">
                            <Loader size={16} className="animate-spin mr-1" />
                            <span className="text-sm">Generating...</span>
                          </div>
                        )}
                        
                        {concept.isGenerated && !concept.isPublished && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReviewConcept(concept.id);
                            }}
                            icon={<Check size={14} />}
                            className="mr-3"
                          >
                            Review & Publish
                          </Button>
                        )}
                        
                        {concept.isPublished && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReviewConcept(concept.id);
                            }}
                            icon={<Edit size={14} />}
                            className="mr-3"
                          >
                            View Questions
                          </Button>
                        )}
                        
                        {concept.isExpanded ? (
                          <ChevronUp size={20} className="text-neutral-400" />
                        ) : (
                          <ChevronDown size={20} className="text-neutral-400" />
                        )}
                      </div>
                    </div>
                    
                    {concept.isExpanded && (
                      <div className="p-4 border-t border-neutral-200 bg-neutral-50">
                        {conceptQuestions.length > 0 ? (
                          <div className="space-y-4">
                            {conceptQuestions.map(question => (
                              <QuestionCard
                                key={question.id}
                                question={question}
                                onEdit={() => setEditingQuestion(question)}
                                onDelete={handleDeleteQuestion}
                                isPublished={concept.isPublished}
                              />
                            ))}
                          </div>
                        ) : concept.isGenerating ? (
                          <div className="text-center py-6">
                            <Loader size={24} className="animate-spin mx-auto mb-2 text-primary-500" />
                            <p className="text-neutral-600">Generating questions...</p>
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <p className="text-neutral-500 mb-4">No questions generated yet.</p>
                            <Button
                              variant="primary"
                              onClick={() => handleGenerateConceptQuestions(concept.id)}
                              icon={<Sparkles size={16} />}
                            >
                              Generate Questions
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {allQuestionsGenerated && !chapter.isPublished && (
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handlePublishChapter}
                  icon={<Check size={18} />}
                >
                  Publish All Chapter Questions
                </Button>
              </div>
            )}
          </Card>
        </div>
        
        <div>
          <Card title="Chapter Information" elevation="medium" className="mb-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Chapter</h3>
                <p className="text-sm text-neutral-600">
                  {chapter.title}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Subject</h3>
                <p className="text-sm text-neutral-600">
                  {chapter.subject}, Grade {chapter.grade}
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Publishing Status</h3>
                <p className={`text-sm ${chapter.isPublished ? 'text-success-600' : 'text-neutral-600'}`}>
                  {chapter.isPublished ? 'Published' : 'Not Published'}
                </p>
                
                {chapter.isPublished && (
                  <div className="mt-1 bg-success-50 text-success-700 text-xs p-2 rounded">
                    This chapter is published and available to students.
                  </div>
                )}
                
                {!chapter.isPublished && allQuestionsGenerated && (
                  <div className="mt-1 bg-primary-50 text-primary-700 text-xs p-2 rounded">
                    All questions have been generated. You can now publish this chapter.
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Concepts</h3>
                <ul className="list-disc pl-5 text-sm text-neutral-600">
                  {chapter.concepts.map(concept => (
                    <li key={concept.id} className="mb-1">
                      {concept.name}
                      {concept.isPublished && (
                        <span className="ml-2 text-xs text-success-600">
                          (Published)
                        </span>
                      )}
                      <span className="ml-2 text-xs text-neutral-500">
                        ({concept.questions.length} questions)
                      </span>
                      {concept.startPageNumber && concept.endPageNumber && (
                        <span className="ml-2 text-xs text-neutral-500">
                          (Pages {concept.startPageNumber}-{concept.endPageNumber})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
          
          <Card title="Publishing Information" elevation="medium">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Publishing Rules</h3>
                <ul className="list-disc pl-5 text-sm text-neutral-600 space-y-1">
                  <li>Questions can be published at the concept or chapter level</li>
                  <li>All questions within a concept are published together</li>
                  <li>Once published, questions become visible to students</li>
                  <li>You can edit questions before publishing them</li>
                </ul>
              </div>
              
              <div className="bg-primary-50 p-3 rounded-lg">
                <h3 className="font-semibold text-primary-700 mb-1">Tip</h3>
                <p className="text-sm text-primary-600">
                  Review questions carefully before publishing. While you can edit published questions, 
                  students may have already seen and practiced with the original versions.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      
      {/* Question Review Modal for publishing concept */}
      {showReviewModal && selectedConceptId && selectedConcept && (
        <div className="fixed inset-0 bg-neutral-900 bg-opacity-50 z-40 flex items-center justify-center overflow-y-auto py-10">
          <div className="bg-white rounded-xl w-full max-w-4xl mx-4 shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-neutral-800">
                Review Questions: {selectedConcept.name}
              </h2>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReviewModal(false)}
              >
                Close
              </Button>
            </div>
            
            <div className="p-4 flex-grow overflow-y-auto">
              <QuestionReviewList
                questions={selectedConceptQuestions}
                onPublish={handlePublishConcept}
                onDelete={handleQuestionDeleted}
                chapterId={chapterId!}
                conceptId={selectedConceptId}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Question Edit Modal */}
      {editingQuestion && (
        <QuestionEditModal
          question={editingQuestion}
          onSave={handleEditQuestion}
          onCancel={() => setEditingQuestion(null)}
          isSaving={isSavingQuestion}
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
          onConfirm={async () => {
            try {
              await deleteQuestion(questionToDelete.id);
              handleQuestionDeleted(questionToDelete.id);
              setQuestionToDelete(null);
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to delete question');
            }
          }}
          onCancel={() => setQuestionToDelete(null)}
        />
      )}
    </Layout>
  );
};