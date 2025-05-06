// Aquí se mantienen solo los tipos modernos y relevantes
// Eliminar StageContent y cualquier export relacionado legacy

export interface Program {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  program_id: string;
  name: string;
  order_num: number;
  created_at: string;
  updated_at: string;
}

export interface ActivityData {
  prompt?: string;
  initial_message?: string;
  system_instructions?: string;
  max_exchanges?: number;
  step?: number;
  prompt_section?: string;
  dependencies?: string[];
}
