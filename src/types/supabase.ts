/**
 * Supabase generated types
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'teacher' | 'student'
          name: string
          avatar: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'teacher' | 'student'
          name: string
          avatar?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'teacher' | 'student'
          name?: string
          avatar?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      },
      chapters: {
        Row: {
          id: string
          title: string
          grade: number
          subject: string
          teacher_id: string
          created_at: string
          updated_at: string
          is_published: boolean
        }
        Insert: {
          id?: string
          title: string
          grade: number
          subject: string
          teacher_id: string
          created_at?: string
          updated_at?: string
          is_published?: boolean
        }
        Update: {
          id?: string
          title?: string
          grade?: number
          subject?: string
          teacher_id?: string
          created_at?: string
          updated_at?: string
          is_published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chapters_teacher_id_fkey"
            columns: ["teacher_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      },
      concepts: {
        Row: {
          id: string
          chapter_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          chapter_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          chapter_id?: string
          name?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "concepts_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          }
        ]
      },
      misconceptions: {
        Row: {
          tag: string
          explanation: string
          created_at: string
        }
        Insert: {
          tag: string
          explanation: string
          created_at?: string
        }
        Update: {
          tag?: string
          explanation?: string
          created_at?: string
        }
        Relationships: []
      },
      questions: {
        Row: {
          id: string
          concept_id: string
          bloom_level: 'Recall' | 'Conceptual' | 'Application' | 'Analysis'
          difficulty: 'Easy' | 'Medium' | 'Hard'
          stem: string
          created_at: string
        }
        Insert: {
          id?: string
          concept_id: string
          bloom_level: 'Recall' | 'Conceptual' | 'Application' | 'Analysis'
          difficulty: 'Easy' | 'Medium' | 'Hard'
          stem: string
          created_at?: string
        }
        Update: {
          id?: string
          concept_id?: string
          bloom_level?: 'Recall' | 'Conceptual' | 'Application' | 'Analysis'
          difficulty?: 'Easy' | 'Medium' | 'Hard'
          stem?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_concept_id_fkey"
            columns: ["concept_id"]
            referencedRelation: "concepts"
            referencedColumns: ["id"]
          }
        ]
      },
      options: {
        Row: {
          id: string
          question_id: string
          text: string
          is_correct: boolean
          misconception_tag: string | null
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          text: string
          is_correct: boolean
          misconception_tag?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          text?: string
          is_correct?: boolean
          misconception_tag?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "options_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "options_misconception_tag_fkey"
            columns: ["misconception_tag"]
            referencedRelation: "misconceptions"
            referencedColumns: ["tag"]
          }
        ]
      },
      student_sessions: {
        Row: {
          id: string
          student_id: string
          chapter_id: string
          started_at: string
          finished_at: string | null
        }
        Insert: {
          id?: string
          student_id: string
          chapter_id: string
          started_at?: string
          finished_at?: string | null
        }
        Update: {
          id?: string
          student_id?: string
          chapter_id?: string
          started_at?: string
          finished_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_sessions_student_id_fkey"
            columns: ["student_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_sessions_chapter_id_fkey"
            columns: ["chapter_id"]
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          }
        ]
      },
      attempts: {
        Row: {
          id: string
          session_id: string
          question_id: string
          is_correct: boolean
          selected_option_id: string | null
          answered_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question_id: string
          is_correct: boolean
          selected_option_id?: string | null
          answered_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          question_id?: string
          is_correct?: boolean
          selected_option_id?: string | null
          answered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_session_id_fkey"
            columns: ["session_id"]
            referencedRelation: "student_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attempts_selected_option_id_fkey"
            columns: ["selected_option_id"]
            referencedRelation: "options"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}