export interface StageContent {
  id: string;
  title: string;
  content: string;
  content_type: 'video' | 'text' | 'activity' | 'advisory_session';
  stage_id: string;
  order_num?: number;
  created_at?: string;
  updated_at?: string;
  activity_data?: ActivityData | string;
  metadata?: any;
  content_metadata?: any;
  dependencies?: string[];
  stage_name?: string;
  prompt_section?: string;
  system_instructions?: string;
  provider?: string; // Proveedor de video (youtube, vimeo, etc.)
  url?: string; // URL del video para contenidos de tipo video
}

export interface Stage {
  id: string;
  name: string;
  order_num: number;
  program_id: string | null;
  required_content?: string;
  prompt_template?: string;
  created_at?: string;
}

export interface Program {
  id: string;
  name: string;
}

export interface ActivityData {
  prompt: string;
  initial_message: string;
  system_instructions: string;
  max_exchanges: number;
  step: number;
  prompt_section: string;
}
