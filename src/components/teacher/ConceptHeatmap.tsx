/**
 * Concept Heatmap component for teacher analytics
 */
import React from 'react';
import { Card } from '../ui/Card';

interface ConceptHeatmapProps {
  data: {
    conceptId: string;
    conceptName: string;
    averageProficiency: number;
  }[];
  className?: string;
}

export const ConceptHeatmap: React.FC<ConceptHeatmapProps> = ({
  data,
  className = '',
}) => {
  // Helper to get color based on proficiency
  const getColor = (proficiency: number) => {
    if (proficiency >= 75) return 'bg-success-500';
    if (proficiency >= 50) return 'bg-primary-500';
    if (proficiency >= 25) return 'bg-warning-500';
    return 'bg-error-500';
  };
  
  // Helper to get text color based on proficiency
  const getTextColor = (proficiency: number) => {
    if (proficiency >= 75) return 'text-success-50';
    if (proficiency >= 50) return 'text-white';
    if (proficiency >= 25) return 'text-warning-50';
    return 'text-white';
  };
  
  return (
    <Card className={`${className}`} title="Concept Mastery Heatmap" subtitle="Class average proficiency per concept">
      <div className="grid grid-cols-1 gap-3">
        {data.map((item) => (
          <div
            key={item.conceptId}
            className={`p-3 rounded-lg ${getColor(item.averageProficiency)}`}
          >
            <div className="flex justify-between items-center">
              <h4 className={`font-medium ${getTextColor(item.averageProficiency)}`}>
                {item.conceptName}
              </h4>
              <span className={`text-sm font-bold ${getTextColor(item.averageProficiency)}`}>
                {item.averageProficiency}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};