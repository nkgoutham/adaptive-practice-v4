/**
 * Authentication store using Zustand
 * Manages user authentication state and methods
 */
import { create } from 'zustand';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  
  checkSession: async () => {
    try {
      // Check if there's an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw sessionError;
      }
      
      if (session) {
        // Get user profile from Supabase
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profileError) {
          throw profileError;
        }
        
        // Set authenticated user
        set({ 
          user: {
            id: session.user.id,
            email: session.user.email || '',
            name: profile.name,
            role: profile.role as UserRole,
            avatar: profile.avatar,
          },
          isAuthenticated: true,
          error: null
        });
      } else {
        // Explicitly reset authentication state when no session is found
        set({ 
          user: null,
          isAuthenticated: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Session check error:', error);
      // Reset authentication state on error
      set({ 
        user: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Session check failed'
      });
    }
  },
  
  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Sign in with Supabase
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        throw signInError;
      }
      
      if (!session) {
        throw new Error('No session returned after login');
      }
      
      // Get user profile from Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profileError) {
        throw profileError;
      }
      
      // Set authenticated user
      set({ 
        user: {
          id: session.user.id,
          email: session.user.email || '',
          name: profile.name,
          role: profile.role as UserRole,
          avatar: profile.avatar,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Login failed', 
        isLoading: false,
        user: null,
        isAuthenticated: false
      });
      throw error;
    }
  },
  
  logout: async () => {
    await supabase.auth.signOut();
    
    set({ 
      user: null, 
      isAuthenticated: false,
      error: null
    });
  }
}));