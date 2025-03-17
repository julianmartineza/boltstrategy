/*
  # Implementación de Chat por Pasos y Guardado de Insights

  1. Cambios en la tabla stage_content
    - Añadir campo 'step' para identificar el número de paso en la actividad
    - Añadir campo 'prompt_section' para definir la sección del prompt
    - Añadir campo 'system_instructions' para instrucciones específicas del asistente

  2. Nueva tabla user_insights
    - Almacenar ideas valiosas guardadas por el usuario durante las actividades
    - Relacionada con usuarios y actividades
*/

-- Modificar la tabla stage_content para soportar pasos
DO $$ 
BEGIN
  -- Añadir campo step si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stage_content' AND column_name = 'step'
  ) THEN
    ALTER TABLE stage_content ADD COLUMN step INTEGER;
  END IF;

  -- Añadir campo prompt_section si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stage_content' AND column_name = 'prompt_section'
  ) THEN
    ALTER TABLE stage_content ADD COLUMN prompt_section TEXT;
  END IF;

  -- Añadir campo system_instructions si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stage_content' AND column_name = 'system_instructions'
  ) THEN
    ALTER TABLE stage_content ADD COLUMN system_instructions TEXT;
  END IF;
END $$;

-- Crear tabla user_insights para almacenar ideas valiosas
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES stage_content(id) ON DELETE CASCADE,
  step INTEGER,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS user_insights_user_id_idx ON user_insights(user_id);
CREATE INDEX IF NOT EXISTS user_insights_activity_id_idx ON user_insights(activity_id);
CREATE INDEX IF NOT EXISTS user_insights_created_at_idx ON user_insights(created_at);

-- Habilitar RLS para la tabla user_insights
ALTER TABLE user_insights ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para user_insights
CREATE POLICY "Users can view their own insights" 
  ON user_insights 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" 
  ON user_insights 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" 
  ON user_insights 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insights" 
  ON user_insights 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Comentario para documentar la tabla
COMMENT ON TABLE user_insights IS 'Almacena ideas valiosas guardadas por los usuarios durante las actividades';
