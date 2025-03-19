// Tipos para el componente Chat

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  metadata?: {
    type?: 'error' | 'system';
    [key: string]: any;
  };
}

export interface UserInsight {
  id: string;
  content: string;
  timestamp: Date;
  user_id: string;
  activity_id: string;
}

export interface ActivityContent {
  id: string;
  title: string;
  content?: string;
  prompt_section?: string;
  stage_name?: string;
  user_id?: string;
  activity_data?: {
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
  };
  [key: string]: any;
}

export interface ChatMemory {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  size: string;
  description?: string;
  [key: string]: any;
}

export interface CommandResult {
  type: 'normal_message' | 'save_insight' | 'clear_chat';
  content?: string;
}
