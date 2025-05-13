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
  dependencies?: string[];
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
    min_interactions?: number;
    max_interactions?: number;
    required_topics?: string[];
    required_keywords?: string[];
    custom_evaluation?: string;
  };
  completion_message?: string;
  generate_custom_completion_message?: boolean;
  step?: number;
  prompt_section?: string;
  dependencies?: string[];
  title?: string;
}

export interface ActivityContent {
  id: string;
  title: string;
  content?: string;
  stage_id?: string;
  content_type: 'text' | 'video' | 'activity' | 'advisory_session';
  order?: number;
  user_id?: string;
  stage_name?: string;
  prompt_section?: string;
  activity_data?: ActivityData | string | any;
  system_instructions?: string;
  prompt?: string;
  initial_message?: string;
  dependencies?: string[];
  content_metadata?: any;
  created_at?: string;
  updated_at?: string;
  url?: string;
  provider?: string;
  duration?: number;
  session_type?: string;
  step?: number;
  order_num?: number;
}

export interface ActivityResponse {
  id: string;
  content: any;
  created_at: string;
  user_id: string;
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatSummary {
  id: string;
  user_id: string;
  activity_id: string;
  summary: string;
  created_at: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  metadata?: {
    activity?: string;
    type?: 'question' | 'response' | 'guidance' | 'summary' | 'error' | 'system';
    progress?: number;
    isQuotaError?: boolean;
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
  content: string;
  created_at: string;
}