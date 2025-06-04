/**
 * Teacher Generate Questions Page component
 * Displays extracted concepts and provides interfaces for generating questions
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, BookOpen, Sparkles, AlertCircle, Check, Loader } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';

interface ConceptWithDescription {
  id: string;
  name: string;
  description?: string;
  pageRange?: string;
  isExpanded: boolean;
  isGenerating: boolean;
  isGenerated: boolean;
  hasError: boolean;
}

export const TeacherGeneratePage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const { user } = useAuthStore();
  const { 
    getChapterById, 
    generateQuestionsForChapter, 
    generateQuestionsForConcept,
    isLoading 
  } = useContentStore();
  const navigate = useNavigate();
  
  const [error, setError] = useState<string | null>(null);
  const [conceptsWithMeta, setConceptsWithMeta] = useState<ConceptWithDescription[]>([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [publishReady, setPublishReady] = useState(false);
  
  useEffect(() => {
    if (!chapterId || !user) return;
    
    const chapter = getChapterById(chapterId);
    if (!chapter) {
      navigate('/teacher/upload');
      return;
    }
    
    // Initialize concepts with descriptions
    if (chapter.concepts.length > 0) {
      const conceptsWithDescriptions = chapter.concepts.map((concept, index) => {
        // Generate a description and page range for each concept
        const pageStart = Math.floor(Math.random() * 5) + 1;
        const pageEnd = pageStart + Math.floor(Math.random() * 5) + 1;
        
        return {
          id: concept.id,
          name: concept.name,
          description: `This concept covers key educational principles related to ${concept.name.toLowerCase()}. Students should understand the fundamental aspects and practical applications.`,
          pageRange: `Pages ${pageStart}-${pageEnd}`,
          isExpanded: false,
          isGenerating: false,
          isGenerated: concept.questions.length > 0,
          hasError: false
        };
      });
      
      setConceptsWithMeta(conceptsWithDescriptions);
      
      // Check if all concepts have questions
      const allGenerated = chapter.concepts.every(c => c.questions.length > 0);
      setPublishReady(allGenerated && chapter.concepts.length > 0);
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
      
      setPublishReady(true);
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
      
      // Check if all concepts have questions now
      const chapter = getChapterById(chapterId!);
      const allGenerated = chapter?.concepts.every(c => c.questions.length > 0) || false;
      setPublishReady(allGenerated);
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
  
  const handlePublish = () => {
    // In a real app, would make an API call to publish
    // For demo, just navigate to analytics
    navigate('/teacher/analytics');
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
              
              <Button
                variant="primary"
                isLoading={isGeneratingAll}
                onClick={handleGenerateAllQuestions}
                icon={<Sparkles size={16} />}
                disabled={isGeneratingAll || isLoading}
              >
                Generate All Questions
              </Button>
            </div>
            
            <div className="space-y-4">
              {conceptsWithMeta.map(concept => {
                // Get questions for this concept
                const conceptQuestions = chapter.concepts
                  .find(c => c.id === concept.id)?.questions || [];
                
                return (
                  <div 
                    key={concept.id}
                    className="border border-neutral-200 rounded-lg overflow-hidden"
                  >
                    <div 
                      className="p-4 bg-white cursor-pointer hover:bg-neutral-50 flex justify-between items-start"
                      onClick={() => toggleConceptExpansion(concept.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h3 className="font-semibold text-neutral-800 mr-2">
                            {concept.name}
                          </h3>
                          {concept.isGenerated && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
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
                          <span>{concept.pageRange}</span>
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
                              <div 
                                key={question.id}
                                className="p-3 bg-white border border-neutral-200 rounded-lg"
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
            
            {publishReady && (
              <div className="mt-6 pt-4 border-t border-neutral-200">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={handlePublish}
                >
                  Publish Questions
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
                <h3 className="font-semibold text-neutral-700 mb-1">Concepts Identified</h3>
                <p className="text-sm text-neutral-600">
                  {chapter.concepts.length} concepts
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Question Generation</h3>
                <p className="text-sm text-neutral-600">
                  Each concept will have questions generated across all difficulty levels and Bloom's taxonomy levels.
                </p>
              </div>
            </div>
          </Card>
          
          <Card title="Generation Settings" elevation="medium">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Bloom's Taxonomy</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="p-2 bg-neutral-100 rounded text-xs text-center">Recall</div>
                  <div className="p-2 bg-neutral-100 rounded text-xs text-center">Conceptual</div>
                  <div className="p-2 bg-neutral-100 rounded text-xs text-center">Application</div>
                  <div className="p-2 bg-neutral-100 rounded text-xs text-center">Analysis</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Difficulty Levels</h3>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="p-2 bg-success-100 text-success-800 rounded text-xs text-center">Easy</div>
                  <div className="p-2 bg-warning-100 text-warning-800 rounded text-xs text-center">Medium</div>
                  <div className="p-2 bg-error-100 text-error-800 rounded text-xs text-center">Hard</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">Questions Per Concept</h3>
                <p className="text-sm text-neutral-600">
                  12 questions per concept (one for each combination of Bloom's level and difficulty)
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};