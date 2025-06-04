/**
 * Teacher Analytics Page component
 */
import React, { useEffect, useState } from 'react';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/ui/Card';
import { ConceptHeatmap } from '../../components/teacher/ConceptHeatmap';
import { ConceptMasteryIndicator } from '../../components/ui/ConceptMasteryIndicator';
import { useAuthStore } from '../../store/authStore';
import { useAnalyticsStore } from '../../store/analyticsStore';
import { useContentStore } from '../../store/contentStore';

export const TeacherAnalyticsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { chapters } = useContentStore();
  const { 
    generateClassAnalytics, 
    getClassAnalytics,
    generateStudentAnalytics,
    getStudentAnalytics
  } = useAnalyticsStore();
  
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!chapters.length) return;
    
    // Default to first chapter if none selected
    if (!selectedChapterId) {
      setSelectedChapterId(chapters[0].id);
    }
    
    // Generate analytics for selected chapter
    if (selectedChapterId) {
      generateClassAnalytics(selectedChapterId);
    }
  }, [chapters, selectedChapterId, generateClassAnalytics]);
  
  useEffect(() => {
    // Generate analytics for selected student
    if (selectedStudentId) {
      generateStudentAnalytics(selectedStudentId);
    }
  }, [selectedStudentId, generateStudentAnalytics]);
  
  if (!user || user.role !== 'teacher') {
    return <div>Access denied</div>;
  }
  
  const classAnalytics = selectedChapterId 
    ? getClassAnalytics(selectedChapterId)
    : null;
  
  const studentAnalytics = selectedStudentId
    ? getStudentAnalytics(selectedStudentId)
    : null;
  
  // Mock student list
  const students = [
    { id: 'student-1', name: 'Alex Garcia' },
    { id: 'student-2', name: 'Jamie Smith' },
    { id: 'student-3', name: 'Taylor Wong' }
  ];
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">
        Analytics Dashboard
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="md:col-span-3">
          <Card elevation="medium">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800">
                Class Performance
              </h2>
              
              <div className="flex items-center">
                <label htmlFor="chapterSelect" className="text-sm text-neutral-600 mr-2">
                  Chapter:
                </label>
                <select
                  id="chapterSelect"
                  className="border border-neutral-300 rounded-md text-sm py-1 px-2"
                  value={selectedChapterId || ''}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                >
                  {chapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {classAnalytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ConceptHeatmap data={classAnalytics.conceptHeatmap} />
                
                <div>
                  <h3 className="font-semibold text-neutral-800 mb-3">
                    Hardest Concepts
                  </h3>
                  <div className="space-y-3">
                    {classAnalytics.hardestConcepts.map(concept => (
                      <div 
                        key={concept.conceptId}
                        className="p-3 border border-neutral-200 rounded-lg"
                      >
                        <div className="flex justify-between items-center">
                          <h4 className="font-medium text-neutral-800">
                            {concept.conceptName}
                          </h4>
                          <span className="text-sm text-neutral-600">
                            {concept.averageAttempts} attempts
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <h3 className="font-semibold text-neutral-800 mt-6 mb-3">
                    Suggested Interventions
                  </h3>
                  <div className="space-y-3">
                    {classAnalytics.suggestedInterventions.map((intervention, i) => (
                      <div 
                        key={i}
                        className="p-3 bg-warning-50 border border-warning-200 rounded-lg"
                      >
                        <h4 className="font-medium text-warning-800 mb-1">
                          {intervention.conceptName}
                        </h4>
                        <p className="text-sm text-warning-700">
                          {intervention.reason}
                        </p>
                      </div>
                    ))}
                    
                    {classAnalytics.suggestedInterventions.length === 0 && (
                      <p className="text-sm text-neutral-500">
                        No interventions needed at this time.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
                <p>Loading class analytics...</p>
              </div>
            )}
          </Card>
        </div>
        
        <div>
          <Card title="Students" elevation="medium">
            <div className="space-y-2">
              {students.map(student => (
                <button
                  key={student.id}
                  className={`w-full text-left p-2 rounded-lg ${
                    selectedStudentId === student.id
                      ? 'bg-primary-50 border border-primary-200'
                      : 'hover:bg-neutral-50'
                  }`}
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <span className="font-medium text-neutral-800">
                    {student.name}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
      
      {selectedStudentId && studentAnalytics && (
        <Card title={`Student Analysis: ${students.find(s => s.id === selectedStudentId)?.name}`} elevation="medium">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <h3 className="font-semibold text-neutral-800 mb-3">
                Concept Mastery
              </h3>
              <div className="space-y-4">
                {studentAnalytics.conceptMasteries.map(mastery => (
                  <ConceptMasteryIndicator
                    key={mastery.conceptId}
                    mastery={mastery}
                  />
                ))}
                
                {studentAnalytics.conceptMasteries.length === 0 && (
                  <p className="text-sm text-neutral-500">
                    No concept data available for this student.
                  </p>
                )}
              </div>
              
              <h3 className="font-semibold text-neutral-800 mt-6 mb-3">
                Misconceptions
              </h3>
              <div className="space-y-2">
                {studentAnalytics.misconceptionsEncountered.map((misconception, i) => (
                  <div 
                    key={i}
                    className="p-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm"
                  >
                    {misconception}
                  </div>
                ))}
                
                {studentAnalytics.misconceptionsEncountered.length === 0 && (
                  <p className="text-sm text-neutral-500">
                    No misconceptions identified.
                  </p>
                )}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-neutral-800 mb-3">
                Performance Summary
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500 mb-1">Questions Attempted</div>
                  <div className="text-xl font-semibold text-neutral-800">
                    {studentAnalytics.totalAttempts}
                  </div>
                </div>
                
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500 mb-1">Correct Answers</div>
                  <div className="text-xl font-semibold text-neutral-800">
                    {studentAnalytics.correctAttempts}
                    {studentAnalytics.totalAttempts > 0 && (
                      <span className="text-sm text-neutral-500 ml-2">
                        ({Math.round((studentAnalytics.correctAttempts / studentAnalytics.totalAttempts) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500 mb-1">Time Spent</div>
                  <div className="text-xl font-semibold text-neutral-800">
                    {Math.floor(studentAnalytics.timeSpent / 60)} min {Math.round(studentAnalytics.timeSpent % 60)} sec
                  </div>
                </div>
                
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <div className="text-sm text-neutral-500 mb-1">Learning Pace</div>
                  <div className="text-xl font-semibold text-neutral-800">
                    {studentAnalytics.timeSpent > 0 && studentAnalytics.totalAttempts > 0
                      ? `${Math.round((studentAnalytics.timeSpent / studentAnalytics.totalAttempts) * 10) / 10} sec/question`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </Layout>
  );
};