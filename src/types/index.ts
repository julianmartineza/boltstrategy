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
  currentChallenges?: string;
  marketPosition?: string;
  keyStrengths?: string;
  growthAspiration?: string;
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
  activity_data?: ActivityData;
  step?: number;
  prompt_section?: string;
  system_instructions?: string;
}

// Activity Types
export interface Activity {
  id: string;
  name: string;
  description: string;
  type: string;
  prompt_template?: string;
  required_steps?: string[];
  completion_criteria?: {
    min_responses?: number;
    required_topics?: string[];
  };
  step?: number;
  totalSteps?: number;
}

export interface ActivityData {
  prompt?: string;
  system_instructions?: string;
  initial_message?: string;
  max_exchanges?: number;
  type?: string;
  description?: string;
  prompt_template?: string;
  required_steps?: string[];
  completion_criteria?: {
    min_responses?: number;
    required_topics?: string[];
  };
}

export interface ActivityContent {
  id: string;
  title: string;
  content: string;
  content_type: string;
  activity_data: ActivityData;
  metadata?: any;
  stage_id?: string;
  order_num?: number;
  created_at?: string;
  step?: number;
  prompt_section?: string;
  system_instructions?: string;
}

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
    activity?: string;
    type?: 'question' | 'response' | 'guidance' | 'summary' | 'error' | 'system';
    progress?: number;
  };
  activity?: {
    step: number;
    totalSteps: number;
  };
}

// User Insights
export interface UserInsight {
  id: string;
  user_id: string;
  activity_id: string;
  step?: number;
  content: string;
  created_at: string;
}