/**
 * Teacher Chapters Page component
 * Displays all teacher's chapters and allows selection of existing chapters
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';
import { BookOpen, ChevronRight, Plus, Upload, Sparkles, Check, Edit } from 'lucide-react';

export const TeacherChaptersPage: React.FC = () => {
  const { user } = useAuthStore();
  const { chapters, fetchChapters, isLoading } = useContentStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    
    const loadChapters = async () => {
      setLoading(true);
      try {
        await fetchChapters();
      } catch (error) {
        console.error('Error loading chapters:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadChapters();
  }, [user, fetchChapters]);
  
  if (!user || user.role !== 'teacher') {
    return <div>Access denied</div>;
  }
  
  // Filter chapters that belong to this teacher
  const teacherChapters = chapters.filter(chapter => true); // In a real app, would filter by teacher_id
  
  const handleViewConcepts = (chapterId: string) => {
    navigate(`/teacher/generate/${chapterId}`);
  };
  
  const handleUploadNew = () => {
    navigate('/teacher/upload');
  };
  
  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-neutral-800">
          My Chapters
        </h1>
        
        <Button
          variant="primary"
          onClick={handleUploadNew}
          icon={<Upload size={16} />}
        >
          Upload New Chapter
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      ) : teacherChapters.length === 0 ? (
        <Card elevation="medium" className="p-8 text-center">
          <div className="bg-neutral-100 rounded-full p-4 inline-flex mb-4">
            <BookOpen size={32} className="text-neutral-400" />
          </div>
          <h2 className="text-xl font-semibold text-neutral-800 mb-2">
            No Chapters Yet
          </h2>
          <p className="text-neutral-600 mb-6">
            You haven't uploaded any chapters yet. Upload a PDF to get started.
          </p>
          <Button
            variant="primary"
            onClick={handleUploadNew}
            icon={<Upload size={16} />}
          >
            Upload Your First Chapter
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teacherChapters.map(chapter => (
            <Card 
              key={chapter.id}
              className={`hover:shadow-medium transition-shadow duration-200 ${
                chapter.isPublished ? 'border-2 border-success-200' : ''
              }`}
              elevation="low"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-start mb-4">
                  <div className={`p-3 rounded-lg mr-3 ${
                    chapter.isPublished ? 'bg-success-100' : 'bg-primary-100'
                  }`}>
                    <BookOpen className={`w-5 h-5 ${
                      chapter.isPublished ? 'text-success-600' : 'text-primary-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center">
                      <h3 className="font-semibold text-neutral-800 mr-2">{chapter.title}</h3>
                      {chapter.isPublished && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                          <Check size={10} className="mr-0.5" />
                          Published
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-500">
                      Grade {chapter.grade} • {chapter.subject}
                    </p>
                  </div>
                </div>
                
                <div className="mt-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600">Concepts:</span>
                    <div>
                      <span className="font-medium text-neutral-800">{chapter.concepts.length}</span>
                      {chapter.concepts.some(c => c.isPublished) && (
                        <span className="ml-1 text-xs text-success-600">
                          ({chapter.concepts.filter(c => c.isPublished).length} published)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-neutral-600">Questions:</span>
                    <span className="font-medium text-neutral-800">
                      {chapter.concepts.reduce((total, concept) => total + concept.questions.length, 0)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-neutral-600">Status:</span>
                    <span className={`font-medium ${
                      chapter.isPublished 
                        ? 'text-success-600' 
                        : chapter.concepts.some(c => c.questions.length > 0) 
                          ? 'text-primary-600' 
                          : 'text-warning-600'
                    }`}>
                      {chapter.isPublished 
                        ? 'Published' 
                        : chapter.concepts.some(c => c.questions.length > 0) 
                          ? 'Questions Generated' 
                          : 'Concepts Extracted'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-neutral-200">
                  <Button
                    variant={chapter.isPublished ? "outline" : "primary"}
                    fullWidth
                    onClick={() => handleViewConcepts(chapter.id)}
                    className="flex justify-between items-center"
                    icon={chapter.isPublished ? <Edit size={16} /> : (
                      chapter.concepts.some(c => c.questions.length > 0) ? <Check size={16} /> : <Sparkles size={16} />
                    )}
                  >
                    <span>
                      {chapter.isPublished 
                        ? 'View Questions' 
                        : chapter.concepts.some(c => c.questions.length > 0) 
                          ? 'Review & Publish' 
                          : 'Generate Questions'}
                    </span>
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Add new chapter card */}
          <Card 
            className="border-2 border-dashed border-neutral-300 hover:border-primary-400 bg-neutral-50 transition-colors duration-200 flex items-center justify-center cursor-pointer"
            elevation="none"
            onClick={handleUploadNew}
          >
            <div className="text-center py-12">
              <div className="bg-neutral-100 rounded-full p-4 inline-flex mb-4 mx-auto">
                <Plus size={24} className="text-neutral-500" />
              </div>
              <h3 className="font-medium text-neutral-700 mb-2">Upload New Chapter</h3>
              <p className="text-sm text-neutral-500">
                Add another chapter to your collection
              </p>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  );
};