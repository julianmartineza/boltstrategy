-- Crear tabla para almacenar las interacciones de las actividades
CREATE TABLE IF NOT EXISTS activity_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES stage_content(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS activity_interactions_user_id_idx ON activity_interactions(user_id);
CREATE INDEX IF NOT EXISTS activity_interactions_activity_id_idx ON activity_interactions(activity_id);
CREATE INDEX IF NOT EXISTS activity_interactions_timestamp_idx ON activity_interactions(timestamp);

-- Añadir políticas RLS para la tabla activity_interactions
ALTER TABLE activity_interactions ENABLE ROW LEVEL SECURITY;

-- Política para permitir a los usuarios ver solo sus propias interacciones
CREATE POLICY "Users can view their own interactions" 
  ON activity_interactions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para permitir a los usuarios insertar sus propias interacciones
CREATE POLICY "Users can insert their own interactions" 
  ON activity_interactions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Política para permitir a los usuarios actualizar sus propias interacciones
CREATE POLICY "Users can update their own interactions" 
  ON activity_interactions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Comentario para documentar la tabla
COMMENT ON TABLE activity_interactions IS 'Almacena las interacciones entre usuarios y la IA durante las actividades';
