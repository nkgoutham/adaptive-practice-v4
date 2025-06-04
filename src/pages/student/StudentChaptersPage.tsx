/**
 * Student Chapters Page component
 * Display all chapters with status indicators
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { ChapterCard } from '../../components/student/ChapterCard';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';
import { useStudentProgressStore } from '../../store/studentProgressStore';

export const StudentChaptersPage: React.FC = () => {
  const { user } = useAuthStore();
  const { chapters, fetchChapters, isLoading } = useContentStore();
  const { getConceptMasteriesByStudentId, startSession } = useStudentProgressStore();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Fetch chapters when component mounts
    fetchChapters();
  }, [fetchChapters]);
  
  if (!user || user.role !== 'student') {
    return <div>Access denied</div>;
  }
  
  const conceptMasteries = getConceptMasteriesByStudentId(user.id);
  
  console.log("All chapters:", chapters); // Debugging log
  
  // Display all chapters to students - don't filter by is_published
  // This ensures chapters with published concepts are visible even if
  // the chapter itself is not marked as published
  const chaptersToDisplay = chapters;
  
  // Only allow starting practice on chapters with at least one published concept
  const handleStartPractice = async (chapterId: string) => {
    // Start a new session
    const session = await startSession(user.id, chapterId);
    // Navigate to practice page
    navigate(`/student/practice/${chapterId}`);
  };
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">
        Available Chapters
      </h1>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chaptersToDisplay.length > 0 ? (
            chaptersToDisplay.map((chapter) => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                conceptMasteries={conceptMasteries.filter(
                  (mastery) => chapter.concepts.some((concept) => concept.id === mastery.conceptId)
                )}
                onStartPractice={handleStartPractice}
              />
            ))
          ) : (
            <div className="md:col-span-3 text-center py-12">
              <div className="bg-neutral-100 rounded-full p-4 inline-flex mb-4">
                <BookOpen size={32} className="text-neutral-400" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-800 mb-2">
                No Chapters Available Yet
              </h2>
              <p className="text-neutral-600">
                Your teacher hasn't published any chapters yet. Check back soon!
              </p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};