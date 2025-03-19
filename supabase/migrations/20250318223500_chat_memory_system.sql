-- Implementación del Sistema de Memoria Conversacional y Dependencias entre Actividades
--
-- Este script implementa los cambios necesarios para:
-- 1. Añadir la columna stage_name a la tabla strategy_stages
-- 2. Añadir la columna dependencies (JSONB) a la tabla stage_content
-- 3. Crear la tabla chat_summaries para almacenar resúmenes de conversaciones
-- 4. Crear la tabla user_insights para almacenar insights valiosos
-- 5. Modificar la estructura para permitir dependencias entre actividades

-- Modificar la tabla strategy_stages para añadir stage_name
DO $$ 
BEGIN
  -- Añadir campo stage_name si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'strategy_stages' AND column_name = 'stage_name'
  ) THEN
    ALTER TABLE strategy_stages ADD COLUMN stage_name TEXT;
    
    -- Actualizar los valores existentes para que stage_name sea igual a name
    UPDATE strategy_stages SET stage_name = name WHERE stage_name IS NULL;
  END IF;
END $$;

-- Modificar la tabla stage_content para añadir dependencies y eliminar step
DO $$ 
BEGIN
  -- Añadir campo dependencies si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stage_content' AND column_name = 'dependencies'
  ) THEN
    ALTER TABLE stage_content ADD COLUMN dependencies JSONB;
  END IF;
  
  -- No eliminamos la columna step para mantener compatibilidad con el código existente
  -- En su lugar, la mantendremos pero la nueva funcionalidad no la utilizará
END $$;

-- Crear tabla chat_summaries para almacenar resúmenes de conversaciones
CREATE TABLE IF NOT EXISTS chat_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES stage_content(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS chat_summaries_user_id_idx ON chat_summaries(user_id);
CREATE INDEX IF NOT EXISTS chat_summaries_activity_id_idx ON chat_summaries(activity_id);
CREATE INDEX IF NOT EXISTS chat_summaries_created_at_idx ON chat_summaries(created_at);

-- Habilitar RLS para la tabla chat_summaries
ALTER TABLE chat_summaries ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para chat_summaries
DO $$
BEGIN
  -- Verificar si la política ya existe antes de crearla
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_summaries' AND policyname = 'Users can view their own chat summaries'
  ) THEN
    CREATE POLICY "Users can view their own chat summaries" 
      ON chat_summaries 
      FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_summaries' AND policyname = 'Users can insert their own chat summaries'
  ) THEN
    CREATE POLICY "Users can insert their own chat summaries" 
      ON chat_summaries 
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_summaries' AND policyname = 'Users can update their own chat summaries'
  ) THEN
    CREATE POLICY "Users can update their own chat summaries" 
      ON chat_summaries 
      FOR UPDATE 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_summaries' AND policyname = 'Users can delete their own chat summaries'
  ) THEN
    CREATE POLICY "Users can delete their own chat summaries" 
      ON chat_summaries 
      FOR DELETE 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Comentario para documentar la tabla
COMMENT ON TABLE chat_summaries IS E'Almacena resúmenes de conversaciones para optimizar la memoria de largo plazo';

-- Modificar la tabla activity_responses para añadir stage_name
DO $$ 
BEGIN
  -- Añadir campo stage_name si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_responses' AND column_name = 'stage_name'
  ) THEN
    ALTER TABLE activity_responses ADD COLUMN stage_name TEXT;
  END IF;
END $$;

-- Crear tabla user_insights para almacenar insights de los usuarios
CREATE TABLE IF NOT EXISTS user_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES stage_content(id) ON DELETE CASCADE,
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
DO $$
BEGIN
  -- Verificar si la política ya existe antes de crearla
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_insights' AND policyname = 'Users can view their own insights'
  ) THEN
    CREATE POLICY "Users can view their own insights" 
      ON user_insights 
      FOR SELECT 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_insights' AND policyname = 'Users can insert their own insights'
  ) THEN
    CREATE POLICY "Users can insert their own insights" 
      ON user_insights 
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_insights' AND policyname = 'Users can update their own insights'
  ) THEN
    CREATE POLICY "Users can update their own insights" 
      ON user_insights 
      FOR UPDATE 
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_insights' AND policyname = 'Users can delete their own insights'
  ) THEN
    CREATE POLICY "Users can delete their own insights" 
      ON user_insights 
      FOR DELETE 
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Comentario para documentar la tabla
COMMENT ON TABLE user_insights IS E'Almacena insights valiosos identificados por los usuarios durante las actividades';
