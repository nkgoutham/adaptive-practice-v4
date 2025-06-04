/**
 * Layout component for the application
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  BarChart3, 
  Upload, 
  LogOut, 
  User, 
  GraduationCap,
  Layers
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  
  if (!user) {
    return <>{children}</>;
  }
  
  const navItems = user.role === 'teacher' 
    ? [
        { icon: <Upload size={20} />, label: 'Upload', path: '/teacher/upload' },
        { icon: <Layers size={20} />, label: 'Chapters', path: '/teacher/chapters' },
        { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/teacher/analytics' },
      ]
    : [
        { icon: <BookOpen size={20} />, label: 'Chapters', path: '/student/chapters' },
        { icon: <GraduationCap size={20} />, label: 'Progress', path: '/student/progress' },
      ];
  
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-primary-500 mr-2">
              {user.role === 'teacher' 
                ? <GraduationCap size={28} />
                : <BookOpen size={28} />
              }
            </div>
            <h1 className="text-xl font-bold text-neutral-800">
              Adaptive Practice
            </h1>
          </div>
          
          <div className="flex items-center">
            <div className="flex items-center mr-4">
              {user.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User size={16} className="text-primary-600" />
                </div>
              )}
              <span className="ml-2 text-sm font-medium text-neutral-700 hidden sm:block">
                {user.name}
              </span>
            </div>
            
            <button
              className="p-1.5 text-neutral-500 hover:text-neutral-700 rounded-full hover:bg-neutral-100"
              onClick={logout}
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-16 md:w-60 bg-white border-r border-neutral-200 fixed left-0 top-16 bottom-0 z-10">
          <nav className="p-3">
            <ul className="space-y-1">
              {navItems.map((item, index) => (
                <li key={index}>
                  <button
                    className="w-full flex items-center p-2 rounded-lg hover:bg-neutral-100 text-left"
                    onClick={() => navigate(item.path)}
                  >
                    <span className="text-neutral-500">{item.icon}</span>
                    <span className="ml-3 text-neutral-700 font-medium hidden md:block">
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        
        {/* Page content */}
        <motion.main 
          className="flex-1 ml-16 md:ml-60 pt-6 px-4 pb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </motion.main>
      </div>
    </div>
  );
};