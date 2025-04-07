-- Script simplificado para eliminar tablas y columnas no utilizadas
-- IMPORTANTE: Ejecutar primero en un entorno de prueba antes de aplicar en producción

-- 1. Eliminar tablas no utilizadas
DO $$ 
BEGIN
    -- Eliminar tabla chat_activities si existe (con CASCADE para eliminar dependencias)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_activities'
    ) THEN
        RAISE NOTICE 'Eliminando tabla chat_activities y sus dependencias...';
        
        -- Primero eliminar las restricciones de clave externa que dependen de chat_activities
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'activity_interactions_chat_activity_id_fkey'
        ) THEN
            ALTER TABLE activity_interactions DROP CONSTRAINT IF EXISTS activity_interactions_chat_activity_id_fkey;
            RAISE NOTICE 'Eliminada restricción activity_interactions_chat_activity_id_fkey';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'chat_summaries_chat_activity_id_fkey'
        ) THEN
            ALTER TABLE chat_summaries DROP CONSTRAINT IF EXISTS chat_summaries_chat_activity_id_fkey;
            RAISE NOTICE 'Eliminada restricción chat_summaries_chat_activity_id_fkey';
        END IF;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'user_insights_chat_activity_id_fkey'
        ) THEN
            ALTER TABLE user_insights DROP CONSTRAINT IF EXISTS user_insights_chat_activity_id_fkey;
            RAISE NOTICE 'Eliminada restricción user_insights_chat_activity_id_fkey';
        END IF;
        
        -- Ahora podemos eliminar la tabla
        DROP TABLE chat_activities;
        RAISE NOTICE 'Tabla chat_activities eliminada.';
    ELSE
        RAISE NOTICE 'La tabla chat_activities no existe.';
    END IF;

    -- Eliminar tabla content_registry si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'content_registry'
    ) THEN
        RAISE NOTICE 'Eliminando tabla content_registry...';
        -- Usar CASCADE para eliminar cualquier dependencia
        DROP TABLE content_registry CASCADE;
        RAISE NOTICE 'Tabla content_registry eliminada.';
    ELSE
        RAISE NOTICE 'La tabla content_registry no existe.';
    END IF;
    
    -- Eliminar tabla activity_responses si existe (ya que está vacía y no se usa)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_responses'
    ) THEN
        RAISE NOTICE 'Eliminando tabla activity_responses...';
        -- Usar CASCADE para eliminar cualquier dependencia
        DROP TABLE activity_responses CASCADE;
        RAISE NOTICE 'Tabla activity_responses eliminada.';
    ELSE
        RAISE NOTICE 'La tabla activity_responses no existe.';
    END IF;
END $$;

-- 2. Eliminar columnas no utilizadas
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

-- 3. Verificar que las tablas se hayan eliminado correctamente
SELECT 'Verificación de eliminación de tablas' AS operacion;

SELECT 'chat_activities' AS tabla, 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'chat_activities'
    ) THEN 'Todavía existe' ELSE 'Eliminada correctamente' END AS estado
UNION ALL
SELECT 'content_registry' AS tabla, 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'content_registry'
    ) THEN 'Todavía existe' ELSE 'Eliminada correctamente' END AS estado
UNION ALL
SELECT 'activity_responses' AS tabla, 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_responses'
    ) THEN 'Todavía existe' ELSE 'Eliminada correctamente' END AS estado;
