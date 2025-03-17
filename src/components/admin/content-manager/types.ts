export interface StageContent {
  id: string;
  stage_id: string;
  content_type: 'video' | 'text' | 'activity';
  title: string;
  content: string;
  order_num: number;
  created_at: string;
  metadata: any;
  activity_data: any;
  step?: number;
  prompt_section?: string;
  system_instructions?: string;
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
