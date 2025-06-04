/**
 * Login page for user authentication
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, LogIn } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/authStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      
      // Redirect based on role
      const user = useAuthStore.getState().user;
      
      if (user?.role === 'teacher') {
        navigate('/teacher/upload');
      } else {
        navigate('/student/chapters');
      }
    } catch (err) {
      setError('Invalid credentials');
    }
  };
  
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <BookOpen className="text-primary-500" size={36} />
          </div>
          <h1 className="text-2xl font-bold text-neutral-800 mb-2">
            Adaptive Practice
          </h1>
          <p className="text-neutral-600">
            Personalized learning adapted to your needs
          </p>
        </div>
        
        <Card elevation="high">
          <h2 className="text-xl font-semibold text-neutral-800 mb-6">
            Log in to your account
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your email"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter your password"
              />
            </div>
            
            <Button
              variant="primary"
              fullWidth
              isLoading={isLoading}
              icon={<LogIn size={18} />}
              type="submit"
            >
              Log In
            </Button>
          </form>
        </Card>
        
        <p className="text-center text-sm text-neutral-500 mt-6">
          This is a demo application for educational purposes.
        </p>
      </motion.div>
    </div>
  );
};