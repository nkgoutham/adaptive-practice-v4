/**
 * Student Chapters Page component
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { ChapterCard } from '../../components/student/ChapterCard';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';
import { useStudentProgressStore } from '../../store/studentProgressStore';

export const StudentChaptersPage: React.FC = () => {
  const { user } = useAuthStore();
  const { chapters } = useContentStore();
  const { getConceptMasteriesByStudentId, startSession } = useStudentProgressStore();
  const navigate = useNavigate();
  
  if (!user || user.role !== 'student') {
    return <div>Access denied</div>;
  }
  
  const conceptMasteries = getConceptMasteriesByStudentId(user.id);
  
  const handleStartPractice = (chapterId: string) => {
    // Start a new session
    const session = startSession(user.id, chapterId);
    // Navigate to practice page
    navigate(`/student/practice/${chapterId}`);
  };
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">
        Available Chapters
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            conceptMasteries={conceptMasteries.filter(
              (mastery) => chapter.concepts.some((concept) => concept.id === mastery.conceptId)
            )}
            onStartPractice={handleStartPractice}
          />
        ))}
      </div>
    </Layout>
  );
};