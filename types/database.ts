/**
 * Database Type Definitions
 * 
 * TypeScript interfaces for all database tables and API responses
 */

export interface Journal {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    mirror_id: string | null;
  }
  
  export interface Mirror {
    id: string;
    user_id: string;
    screen_1_themes: any; // JSON object with themes data
    screen_2_biblical: any; // JSON object with biblical content
    screen_3_observations: any; // JSON object with observations
    screen_4_suggestions: any; // JSON object with suggestions
    created_at: string;
    journal_count: number;
  }
  
  export interface MirrorReflection {
    id: string;
    mirror_id: string;
    screen_number: number;
    question: string;
    response: string;
    created_at: string;
  }
  
  export interface DatabaseResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    count?: number;
  }
  
  export interface User {
    id: string;
    email?: string;
    created_at: string;
  }