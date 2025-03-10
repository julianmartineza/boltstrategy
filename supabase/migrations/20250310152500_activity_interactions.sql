-- Habilitar la extensión vector para embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Crear tabla para almacenar las interacciones de las actividades con soporte vectorial
CREATE TABLE IF NOT EXISTS activity_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES stage_content(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  user_embedding vector(1536),  -- Vector embedding para el mensaje del usuario
  ai_embedding vector(1536),    -- Vector embedding para la respuesta de la IA
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS activity_interactions_user_id_idx ON activity_interactions(user_id);
CREATE INDEX IF NOT EXISTS activity_interactions_activity_id_idx ON activity_interactions(activity_id);
CREATE INDEX IF NOT EXISTS activity_interactions_timestamp_idx ON activity_interactions(timestamp);

-- Crear índices vectoriales para búsquedas semánticas rápidas
CREATE INDEX IF NOT EXISTS activity_interactions_user_embedding_idx ON activity_interactions USING ivfflat (user_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS activity_interactions_ai_embedding_idx ON activity_interactions USING ivfflat (ai_embedding vector_cosine_ops);

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
COMMENT ON TABLE activity_interactions IS 'Almacena las interacciones entre usuarios y la IA durante las actividades con embeddings vectoriales para búsquedas semánticas';

-- Función para buscar mensajes semánticamente similares
CREATE OR REPLACE FUNCTION search_similar_interactions(search_embedding vector(1536), activity_id_param UUID, user_id_param UUID, match_threshold float DEFAULT 0.7, match_count int DEFAULT 5)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  activity_id UUID,
  user_message TEXT,
  ai_response TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ai.id,
    ai.user_id,
    ai.activity_id,
    ai.user_message,
    ai.ai_response,
    1 - (ai.user_embedding <=> search_embedding) AS similarity
  FROM
    activity_interactions ai
  WHERE
    ai.user_id = user_id_param AND
    ai.activity_id = activity_id_param AND
    1 - (ai.user_embedding <=> search_embedding) > match_threshold
  ORDER BY
    ai.user_embedding <=> search_embedding
  LIMIT match_count;
END;
$$;
