/**
 * Student Progress Page component
 */
import React, { useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { Card } from '../../components/ui/Card';
import { ConceptMasteryIndicator } from '../../components/ui/ConceptMasteryIndicator';
import { Star } from '../../components/ui/Star';
import { useAuthStore } from '../../store/authStore';
import { useStudentProgressStore } from '../../store/studentProgressStore';
import { useAnalyticsStore } from '../../store/analyticsStore';

export const StudentProgressPage: React.FC = () => {
  const { user } = useAuthStore();
  const { getConceptMasteriesByStudentId, getStarsByStudentId } = useStudentProgressStore();
  const { getStudentAnalytics, generateStudentAnalytics } = useAnalyticsStore();
  
  useEffect(() => {
    if (user) {
      // Generate analytics if not already available
      const analytics = getStudentAnalytics(user.id);
      if (!analytics) {
        generateStudentAnalytics(user.id);
      }
    }
  }, [user, getStudentAnalytics, generateStudentAnalytics]);
  
  if (!user || user.role !== 'student') {
    return <div>Access denied</div>;
  }
  
  const conceptMasteries = getConceptMasteriesByStudentId(user.id);
  const stars = getStarsByStudentId(user.id);
  const analytics = getStudentAnalytics(user.id);
  
  // Calculate total progress
  const totalStars = stars.length;
  const totalColoredStars = stars.filter(star => star !== 'white').length;
  const proficiencyPercentage = totalStars > 0 
    ? Math.round((totalColoredStars / totalStars) * 100) 
    : 0;
  
  // Count stars by type
  const starCounts = {
    white: stars.filter(star => star === 'white').length,
    bronze: stars.filter(star => star === 'bronze').length,
    silver: stars.filter(star => star === 'silver').length,
    gold: stars.filter(star => star === 'gold').length,
  };
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">
        My Progress
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card title="Total Stars" elevation="medium">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Star type="bronze" size="md" />
              <Star type="silver" size="md" />
              <Star type="gold" size="md" />
            </div>
            <div className="text-3xl font-bold text-neutral-800">{totalStars}</div>
          </div>
          
          <div className="mt-4 grid grid-cols-4 gap-3">
            <div className="text-center">
              <Star type="white" size="sm" className="mx-auto" />
              <div className="text-sm font-medium mt-1">{starCounts.white}</div>
            </div>
            <div className="text-center">
              <Star type="bronze" size="sm" className="mx-auto" />
              <div className="text-sm font-medium mt-1">{starCounts.bronze}</div>
            </div>
            <div className="text-center">
              <Star type="silver" size="sm" className="mx-auto" />
              <div className="text-sm font-medium mt-1">{starCounts.silver}</div>
            </div>
            <div className="text-center">
              <Star type="gold" size="sm" className="mx-auto" />
              <div className="text-sm font-medium mt-1">{starCounts.gold}</div>
            </div>
          </div>
        </Card>
        
        <Card title="Overall Proficiency" elevation="medium">
          <div className="text-center">
            <div className="inline-block w-24 h-24 rounded-full border-8 border-primary-500 flex items-center justify-center mb-2">
              <span className="text-3xl font-bold text-primary-600">{proficiencyPercentage}%</span>
            </div>
            <p className="text-neutral-600">
              {proficiencyPercentage >= 75 
                ? 'Excellent work!' 
                : proficiencyPercentage >= 50 
                  ? 'Good progress!' 
                  : 'Keep practicing!'}
            </p>
          </div>
        </Card>
        
        <Card title="Learning Stats" elevation="medium">
          <div className="space-y-4">
            <div>
              <div className="text-sm text-neutral-500 mb-1">Questions Attempted</div>
              <div className="text-xl font-semibold text-neutral-800">
                {analytics?.totalAttempts || 0}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-neutral-500 mb-1">Correct Answers</div>
              <div className="text-xl font-semibold text-neutral-800">
                {analytics?.correctAttempts || 0}
                {analytics && analytics.totalAttempts > 0 && (
                  <span className="text-sm text-neutral-500 ml-2">
                    ({Math.round((analytics.correctAttempts / analytics.totalAttempts) * 100)}%)
                  </span>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-neutral-500 mb-1">Time Spent</div>
              <div className="text-xl font-semibold text-neutral-800">
                {analytics 
                  ? `${Math.floor(analytics.timeSpent / 60)} min ${Math.round(analytics.timeSpent % 60)} sec`
                  : '0 min'}
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      <Card title="Concept Mastery" elevation="medium" className="mb-8">
        <div className="space-y-6">
          {conceptMasteries.length > 0 ? (
            conceptMasteries.map(mastery => (
              <ConceptMasteryIndicator
                key={mastery.conceptId}
                mastery={mastery}
              />
            ))
          ) : (
            <p className="text-neutral-500 text-center py-4">
              No concepts mastered yet. Start practicing!
            </p>
          )}
        </div>
      </Card>
      
      <Card title="Areas to Improve" elevation="medium">
        <div className="space-y-4">
          {analytics && analytics.misconceptionsEncountered.length > 0 ? (
            analytics.misconceptionsEncountered.map((misconception, index) => (
              <div key={index} className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                <h4 className="font-medium text-warning-800 mb-1">Misconception: {misconception}</h4>
                <p className="text-sm text-warning-700">
                  Focus on this area to improve your understanding.
                </p>
              </div>
            ))
          ) : (
            <p className="text-neutral-500 text-center py-4">
              No specific areas of improvement identified yet.
            </p>
          )}
        </div>
      </Card>
    </Layout>
  );
};