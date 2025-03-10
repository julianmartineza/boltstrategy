// Common Types
export interface Company {
  id: string;
  name: string;
  industry: string;
  size: string;
  website: string;
  annual_revenue: number;
  user_id: string;
}

// Diagnostic Types
export interface Diagnostic {
  id: string;
  company_id: string;
  user_id: string;
  diagnostic_data: {
    currentChallenges: string;
    marketPosition: string;
    keyStrengths: string;
    growthAspiration: string;
  };
  created_at: string;
}

// Program Types
export interface Program {
  id: string;
  name: string;
  description: string;
  stages: Stage[];
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface Stage {
  id: string;
  name: string;
  order_num: number;
  required_content: string;
  prompt_template: string;
  status: 'locked' | 'active' | 'completed';
  content: StageContent[];
}

export interface StageContent {
  id: string;
  stage_id: string;
  content_type: 'video' | 'text' | 'activity';
  title: string;
  content: string;
  order_num: number;
  metadata?: any;
  activity_data?: {
    type: string;
    description: string;
    prompt_template: string;
    required_steps?: string[];
    completion_criteria?: {
      min_responses?: number;
      required_topics?: string[];
    };
  } | null; // Permitimos que activity_data pueda ser null
}

// Activity Types
export interface ActivityResponse {
  id: string;
  stage_content_id: string;
  content: any;
  created_at: string;
  user_id: string;
}

// Chat Types
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  metadata?: {
    stage?: string;
    content_id?: string;
    type?: 'question' | 'response' | 'guidance' | 'summary';
  };
}