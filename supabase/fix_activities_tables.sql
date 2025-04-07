-- Script para corregir inconsistencias en las tablas de actividades
-- Ejecutar este script directamente en la consola SQL de Supabase

-- Función para verificar si una tabla existe
CREATE OR REPLACE FUNCTION table_exists(p_table_name text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name
    );
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si una columna existe
CREATE OR REPLACE FUNCTION column_exists(p_table_name text, p_column_name text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = p_table_name 
        AND column_name = p_column_name
    );
END;
$$ LANGUAGE plpgsql;

-- 1. Migrar datos de activity_responses a activity_interactions (si hay alguno)
DO $$ 
BEGIN
  IF table_exists('activity_responses') THEN
    RAISE NOTICE 'Migrando datos de activity_responses a activity_interactions...';
    
    -- Insertar datos de activity_responses en activity_interactions
    INSERT INTO activity_interactions (
      user_id, 
      activity_id, 
      user_message, 
      ai_response, 
      metadata,
      created_at
    )
    SELECT 
      ar.user_id, 
      ar.stage_content_id as activity_id, 
      'Actividad completada' as user_message, 
      ar.content::text as ai_response, 
      jsonb_build_object('type', 'activity_completion', 'source', 'migrated_from_activity_responses') as metadata,
      ar.created_at
    FROM activity_responses ar
    WHERE NOT EXISTS (
      -- Evitar duplicados
      SELECT 1 FROM activity_interactions ai 
      WHERE ai.user_id = ar.user_id 
      AND ai.activity_id = ar.stage_content_id
      AND ai.metadata->>'source' = 'migrated_from_activity_responses'
    );
    
    -- Contar cuántos registros se migraron
    RAISE NOTICE 'Migración completada. Registros migrados: %', 
      (SELECT COUNT(*) FROM activity_interactions WHERE metadata->>'source' = 'migrated_from_activity_responses');
  ELSE
    RAISE NOTICE 'La tabla activity_responses no existe, no es necesario migrar datos.';
  END IF;
END $$;

-- 2. Actualizar la tabla activities para que tenga una relación explícita con stage_content
DO $$ 
BEGIN
  IF table_exists('activities') THEN
    -- Asegurarse de que la columna stage_content_id existe
    IF NOT column_exists('activities', 'stage_content_id') THEN
      RAISE NOTICE 'Añadiendo columna stage_content_id a la tabla activities...';
      ALTER TABLE activities ADD COLUMN stage_content_id UUID REFERENCES stage_content(id);
    END IF;
    
    -- Actualizar la relación entre activities y stage_content
    -- Buscar contenidos de tipo 'activity' en stage_content que correspondan a cada actividad
    UPDATE activities a
    SET stage_content_id = sc.id
    FROM stage_content sc
    WHERE a.stage_id = sc.stage_id
    AND sc.content_type = 'activity'
    AND a.stage_content_id IS NULL
    AND a.name = sc.title; -- Asumiendo que el nombre de la actividad coincide con el título en stage_content
    
    RAISE NOTICE 'Actualización de relaciones completada.';
  ELSE
    RAISE NOTICE 'La tabla activities no existe.';
  END IF;
END $$;

-- 3. Eliminar la tabla activity_responses si existe
DO $$ 
BEGIN
  IF table_exists('activity_responses') THEN
    RAISE NOTICE 'Eliminando tabla activity_responses...';
    DROP TABLE activity_responses;
    RAISE NOTICE 'Tabla activity_responses eliminada.';
  ELSE
    RAISE NOTICE 'La tabla activity_responses no existe.';
  END IF;
END $$;

-- 4. Eliminar tablas no utilizadas: chat_activities y content_registry
DO $$ 
BEGIN
  -- Eliminar tabla chat_activities si existe
  IF table_exists('chat_activities') THEN
    RAISE NOTICE 'Eliminando tabla chat_activities...';
    DROP TABLE chat_activities;
    RAISE NOTICE 'Tabla chat_activities eliminada.';
  ELSE
    RAISE NOTICE 'La tabla chat_activities no existe.';
  END IF;

  -- Eliminar tabla content_registry si existe
  IF table_exists('content_registry') THEN
    RAISE NOTICE 'Eliminando tabla content_registry...';
    DROP TABLE content_registry;
    RAISE NOTICE 'Tabla content_registry eliminada.';
  ELSE
    RAISE NOTICE 'La tabla content_registry no existe.';
  END IF;
END $$;

-- 5. Eliminar columnas no utilizadas
DO $$ 
DECLARE
  tables_with_content_registry_id text[] := ARRAY(
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'content_registry_id' AND table_schema = 'public'
  );
  tables_with_chat_activity_id text[] := ARRAY(
    SELECT table_name FROM information_schema.columns 
    WHERE column_name = 'chat_activity_id' AND table_schema = 'public'
  );
  t text;
BEGIN
  -- Eliminar columna content_registry_id de todas las tablas que la contienen
  FOREACH t IN ARRAY tables_with_content_registry_id
  LOOP
    RAISE NOTICE 'Eliminando columna content_registry_id de la tabla %...', t;
    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS content_registry_id', t);
  END LOOP;

  -- Eliminar columna chat_activity_id de todas las tablas que la contienen
  FOREACH t IN ARRAY tables_with_chat_activity_id
  LOOP
    RAISE NOTICE 'Eliminando columna chat_activity_id de la tabla %...', t;
    EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS chat_activity_id', t);
  END LOOP;
END $$;

-- 6. Verificar que las tablas y columnas se hayan eliminado correctamente
SELECT 'Verificación de eliminación de tablas y columnas' AS operacion;

SELECT 'activity_responses' AS tabla, 
    CASE WHEN table_exists('activity_responses') THEN 'Todavía existe' ELSE 'Eliminada correctamente' END AS estado
UNION ALL
SELECT 'chat_activities' AS tabla, 
    CASE WHEN table_exists('chat_activities') THEN 'Todavía existe' ELSE 'Eliminada correctamente' END AS estado
UNION ALL
SELECT 'content_registry' AS tabla, 
    CASE WHEN table_exists('content_registry') THEN 'Todavía existe' ELSE 'Eliminada correctamente' END AS estado;

-- Limpiar las funciones auxiliares
DROP FUNCTION IF EXISTS table_exists;
DROP FUNCTION IF EXISTS column_exists;
