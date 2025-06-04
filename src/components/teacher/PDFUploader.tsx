/**
 * PDF Uploader component for teachers
 * Handles client-side PDF parsing and page-by-page storage in Supabase
 */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import * as pdfjs from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import { supabase } from '../../lib/supabase';

// Import worker as URL - this is the key fix for Vite projects
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set the worker source to the URL
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PDFUploaderProps {
  onUpload: (file: File) => Promise<string>;
  className?: string;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({
  onUpload,
  className = '',
}) => {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    
    const files = e.dataTransfer.files;
    handleFiles(files);
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      handleFiles(files);
    }
  };
  
  const handleFiles = (files: FileList) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      
      // Check if it's a PDF
      if (selectedFile.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      
      // Check file size (max 20MB)
      if (selectedFile.size > 20 * 1024 * 1024) {
        setError('File size exceeds 20MB limit');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };
  
  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setProcessingStage('Parsing PDF...');
    setError(null);
    setProgress({ current: 0, total: 0 });
    
    try {
      console.log('Starting PDF upload process...');
      
      // 1. Create a chapter record in the database
      console.log('Getting current user session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new Error(`No active session: ${sessionError.message}`);
      }
      if (!session) {
        console.error('No active session');
        throw new Error('No active session');
      }
      
      const teacherId = session.user.id;
      console.log('Teacher ID:', teacherId);
      
      console.log('Creating chapter record in database...');
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .insert({
          title: file.name.replace('.pdf', ''),
          grade: 5, // Default
          subject: 'General', // Default
          teacher_id: teacherId,
          processing_status: 'uploading'
        })
        .select()
        .single();
      
      if (chapterError) {
        console.error('Chapter creation error:', chapterError);
        throw new Error(`Failed to create chapter: ${chapterError.message}`);
      }
      
      console.log('Chapter created successfully:', chapter);
      
      // 2. Parse PDF pages
      try {
        console.log('Beginning PDF parsing...');
        // Read the file
        const arrayBuffer = await file.arrayBuffer();
        console.log('File converted to ArrayBuffer');
        
        console.log('Loading PDF document...');
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        console.log('PDF loaded, pages:', pdf.numPages);
        
        // Update progress total
        setProgress({ current: 0, total: pdf.numPages });
        
        // Process each page
        for (let i = 1; i <= pdf.numPages; i++) {
          console.log(`Processing page ${i} of ${pdf.numPages}...`);
          // Update progress
          setProgress(prev => ({ ...prev, current: i }));
          
          // Extract text
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: TextItem) => item.str)
            .join(' ');
          
          console.log(`Page ${i} text extracted, length: ${pageText.length} characters`);
          
          // Save page to database
          console.log(`Saving page ${i} to database...`);
          const { error: pageError } = await supabase
            .from('pdf_pages')
            .insert({
              chapter_id: chapter.id,
              page_number: i,
              content: pageText
            });
          
          if (pageError) {
            console.error(`Error saving page ${i}:`, pageError);
          } else {
            console.log(`Page ${i} saved successfully`);
          }
        }
        
        console.log('All pages processed and saved');
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        throw new Error(`PDF parsing failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
      }
      
      // 3. Update chapter status to extracting
      console.log('Updating chapter status to "extracting"...');
      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          processing_status: 'extracting'
        })
        .eq('id', chapter.id);
        
      if (updateError) {
        console.error('Error updating chapter status:', updateError);
      } else {
        console.log('Chapter status updated successfully');
      }
      
      // 4. Start concept extraction
      setProcessingStage('Extracting concepts...');
      console.log('Starting concept extraction via Edge Function...');
      console.log('Invoking extract-concepts with chapterId:', chapter.id);
      
      const { data: conceptData, error: conceptError } = await supabase
        .functions
        .invoke('extract-concepts', {
          body: JSON.stringify({
            chapterId: chapter.id
          })
        });
      
      if (conceptError) {
        console.error('Concept extraction error:', conceptError);
        throw new Error(`Concept extraction failed: ${conceptError.message}`);
      }
      
      console.log('Concept extraction completed successfully:', conceptData);
      
      // Success!
      setChapterId(chapter.id);
      setUploaded(true);
      console.log('Upload process completed successfully');
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const handleGenerateQuestions = () => {
    if (chapterId) {
      navigate(`/teacher/generate/${chapterId}`);
    }
  };
  
  return (
    <Card className={`${className}`} elevation="medium">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-neutral-800 mb-4">
          Upload Chapter PDF
        </h2>
        <p className="text-neutral-600 mb-6">
          Upload a PDF chapter (20 pages or less) to generate adaptive practice questions
        </p>
        
        {!uploaded && (
          <motion.div
            className={`border-2 border-dashed rounded-lg p-8 mb-6 transition-colors ${
              dragging 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-neutral-300 hover:border-primary-400'
            }`}
            whileHover={{ scale: 1.01 }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              id="pdf-upload"
              onChange={handleFileInput}
              ref={fileInputRef}
            />
            
            {file ? (
              <div className="flex flex-col items-center">
                <div className="bg-primary-100 rounded-full p-3 mb-3">
                  <FileText className="w-6 h-6 text-primary-600" />
                </div>
                <p className="font-medium text-neutral-700 mb-1">{file.name}</p>
                <p className="text-sm text-neutral-500 mb-4">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="primary"
                  onClick={handleUpload}
                  isLoading={uploading}
                >
                  {uploading ? 'Processing...' : 'Process PDF'}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="bg-neutral-100 rounded-full p-3 mb-3">
                  <Upload className="w-6 h-6 text-primary-500" />
                </div>
                <p className="font-medium text-neutral-700 mb-1">
                  Drag & drop your PDF here
                </p>
                <p className="text-sm text-neutral-500 mb-4 hover:text-primary-500 transition-colors">
                  or click to browse
                </p>
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select PDF
                </Button>
              </div>
            )}
          </motion.div>
        )}
        
        {processingStage && !error && !uploaded && (
          <motion.div
            className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-center mb-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            </div>
            <p className="text-center font-medium text-primary-700">
              {processingStage}
            </p>
            <p className="text-center text-sm text-primary-600 mt-2">
              {processingStage === 'Parsing PDF...' && progress.total > 0 && 
                `Extracting text from page ${progress.current} of ${progress.total}...`
              }
              {processingStage === 'Extracting concepts...' && 'Using AI to identify key concepts from your chapter...'}
            </p>
            {processingStage === 'Parsing PDF...' && progress.total > 0 && (
              <div className="w-full bg-primary-200 rounded-full h-2.5 mt-3">
                <div 
                  className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            )}
          </motion.div>
        )}
        
        {error && (
          <div className="mb-6 p-3 bg-error-50 border border-error-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-error-500 mr-2" />
            <p className="text-sm text-error-700">{error}</p>
          </div>
        )}
        
        {uploaded && chapterId && (
          <motion.div
            className="mb-6 p-4 bg-success-50 border border-success-200 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center mb-3">
              <CheckCircle className="w-5 h-5 text-success-500 mr-2" />
              <p className="font-medium text-success-700">
                PDF processed successfully!
              </p>
            </div>
            <p className="text-sm text-success-600 mb-4">
              Your PDF has been processed and concepts have been extracted. You can now generate questions.
            </p>
            <Button
              variant="success"
              onClick={handleGenerateQuestions}
            >
              View Concepts & Generate Questions
            </Button>
          </motion.div>
        )}
      </div>
    </Card>
  );
};