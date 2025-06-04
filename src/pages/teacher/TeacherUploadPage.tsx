/**
 * Teacher Upload Page component
 */
import React from 'react';
import { Layout } from '../../components/Layout';
import { PDFUploader } from '../../components/teacher/PDFUploader';
import { Card } from '../../components/ui/Card';
import { useContentStore } from '../../store/contentStore';
import { useAuthStore } from '../../store/authStore';

export const TeacherUploadPage: React.FC = () => {
  const { user } = useAuthStore();
  const { uploadChapterPDF } = useContentStore();
  
  if (!user || user.role !== 'teacher') {
    return <div>Access denied</div>;
  }
  
  return (
    <Layout>
      <h1 className="text-2xl font-bold text-neutral-800 mb-6">
        Upload Chapter
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <PDFUploader onUpload={uploadChapterPDF} />
        </div>
        
        <div>
          <Card title="How It Works" elevation="medium">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">1. Upload PDF</h3>
                <p className="text-sm text-neutral-600">
                  Upload a chapter PDF (up to 20 pages) to begin the process.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">2. AI Processing</h3>
                <p className="text-sm text-neutral-600">
                  Our AI extracts concepts and generates questions at different levels.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">3. Review Questions</h3>
                <p className="text-sm text-neutral-600">
                  Review the generated questions and make any necessary adjustments.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">4. Publish</h3>
                <p className="text-sm text-neutral-600">
                  Make the chapter available to students for adaptive practice.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold text-neutral-700 mb-1">5. Analytics</h3>
                <p className="text-sm text-neutral-600">
                  View student progress and identify areas for intervention.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};