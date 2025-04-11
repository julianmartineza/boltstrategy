/*
  # Implementación de estructura modular para contenidos
  
  1. Nuevas Tablas
    - `content_registry`: Registro central de todos los contenidos
    - `program_module_contents`: Relación entre módulos y contenidos
    - Tablas especializadas para diferentes tipos de contenido
  
  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Añadir políticas para usuarios autenticados
*/

-- Eliminar la función si ya existe para evitar errores de parámetros
DROP FUNCTION IF EXISTS policy_exists(text, text);

-- Función para verificar si una política existe
CREATE OR REPLACE FUNCTION policy_exists(policy_name text, table_name text) 
RETURNS boolean AS $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE policyname = policy_name
  AND tablename = table_name;
  
  RETURN policy_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Tabla content_registry
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_registry') THEN
    CREATE TABLE content_registry (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      content_type VARCHAR(50) NOT NULL,
      content_table VARCHAR(50) NOT NULL,
      content_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(20) DEFAULT 'active'
    );

    ALTER TABLE content_registry ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read content registry', 'content_registry') THEN
      CREATE POLICY "Anyone can read content registry"
        ON content_registry
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Admins can insert content registry', 'content_registry') THEN
      CREATE POLICY "Admins can insert content registry"
        ON content_registry
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can update content registry', 'content_registry') THEN
      CREATE POLICY "Admins can update content registry"
        ON content_registry
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can delete content registry', 'content_registry') THEN
      CREATE POLICY "Admins can delete content registry"
        ON content_registry
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    RAISE NOTICE 'Tabla content_registry creada';
  ELSE
    RAISE NOTICE 'La tabla content_registry ya existe';
  END IF;
END $$;

-- Tabla program_module_contents (relación entre módulos y contenidos)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'program_module_contents') THEN
    CREATE TABLE program_module_contents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_module_id UUID REFERENCES strategy_stages(id) ON DELETE CASCADE,
      content_registry_id UUID REFERENCES content_registry(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE program_module_contents ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read program module contents', 'program_module_contents') THEN
      CREATE POLICY "Anyone can read program module contents"
        ON program_module_contents
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Admins can insert program module contents', 'program_module_contents') THEN
      CREATE POLICY "Admins can insert program module contents"
        ON program_module_contents
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can update program module contents', 'program_module_contents') THEN
      CREATE POLICY "Admins can update program module contents"
        ON program_module_contents
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can delete program module contents', 'program_module_contents') THEN
      CREATE POLICY "Admins can delete program module contents"
        ON program_module_contents
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    RAISE NOTICE 'Tabla program_module_contents creada';
  ELSE
    RAISE NOTICE 'La tabla program_module_contents ya existe';
  END IF;
END $$;

-- Tabla text_contents (para contenido tipo texto)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'text_contents') THEN
    CREATE TABLE text_contents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255),
      content TEXT NOT NULL,
      format VARCHAR(50) DEFAULT 'markdown',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE text_contents ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read text contents', 'text_contents') THEN
      CREATE POLICY "Anyone can read text contents"
        ON text_contents
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Admins can insert text contents', 'text_contents') THEN
      CREATE POLICY "Admins can insert text contents"
        ON text_contents
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can update text contents', 'text_contents') THEN
      CREATE POLICY "Admins can update text contents"
        ON text_contents
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can delete text contents', 'text_contents') THEN
      CREATE POLICY "Admins can delete text contents"
        ON text_contents
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    RAISE NOTICE 'Tabla text_contents creada';
  ELSE
    RAISE NOTICE 'La tabla text_contents ya existe';
  END IF;
END $$;

-- Tabla video_contents (para contenido tipo video)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'video_contents') THEN
    CREATE TABLE video_contents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255),
      video_url TEXT NOT NULL,
      source VARCHAR(50) DEFAULT 'youtube',
      duration INTEGER,
      thumbnail_url TEXT,
      transcript TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE video_contents ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read video contents', 'video_contents') THEN
      CREATE POLICY "Anyone can read video contents"
        ON video_contents
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Authenticated users can insert video contents', 'video_contents') THEN
      CREATE POLICY "Authenticated users can insert video contents"
        ON video_contents
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;

    IF NOT policy_exists('Authenticated users can update video contents', 'video_contents') THEN
      CREATE POLICY "Authenticated users can update video contents"
        ON video_contents
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT policy_exists('Authenticated users can delete video contents', 'video_contents') THEN
      CREATE POLICY "Authenticated users can delete video contents"
        ON video_contents
        FOR DELETE
        TO authenticated
        USING (true);
    END IF;

    RAISE NOTICE 'Tabla video_contents creada';
  ELSE
    RAISE NOTICE 'La tabla video_contents ya existe';
  END IF;
END $$;

-- Función para migrar contenido existente
CREATE OR REPLACE FUNCTION migrate_existing_content() RETURNS void AS $$
DECLARE
  content_record RECORD;
  new_registry_id UUID;
  new_content_id UUID;
BEGIN
  -- Migrar contenido de texto
  FOR content_record IN 
    SELECT * FROM stage_content 
    WHERE content_type = 'text'
  LOOP
    -- Insertar en text_contents
    INSERT INTO text_contents (title, content)
    VALUES (content_record.title, content_record.content)
    RETURNING id INTO new_content_id;
    
    -- Insertar en content_registry
    INSERT INTO content_registry (title, content_type, content_table, content_id)
    VALUES (content_record.title, 'text', 'text_contents', new_content_id)
    RETURNING id INTO new_registry_id;
    
    -- Insertar en program_module_contents
    INSERT INTO program_module_contents (program_module_id, content_registry_id, position)
    VALUES (content_record.stage_id, new_registry_id, content_record.order_num);
  END LOOP;
  
  -- Migrar contenido de video
  FOR content_record IN 
    SELECT * FROM stage_content 
    WHERE content_type = 'video'
  LOOP
    -- Insertar en video_contents
    INSERT INTO video_contents (title, video_url, source)
    VALUES (content_record.title, content_record.content, 'youtube')
    RETURNING id INTO new_content_id;
    
    -- Insertar en content_registry
    INSERT INTO content_registry (title, content_type, content_table, content_id)
    VALUES (content_record.title, 'video', 'video_contents', new_content_id)
    RETURNING id INTO new_registry_id;
    
    -- Insertar en program_module_contents
    INSERT INTO program_module_contents (program_module_id, content_registry_id, position)
    VALUES (content_record.stage_id, new_registry_id, content_record.order_num);
  END LOOP;
  
  -- Para actividades, registramos stage_content como tabla especializada
  FOR content_record IN 
    SELECT * FROM stage_content 
    WHERE content_type = 'activity'
  LOOP
    -- Insertar en content_registry
    INSERT INTO content_registry (title, content_type, content_table, content_id)
    VALUES (content_record.title, 'activity', 'stage_content', content_record.id)
    RETURNING id INTO new_registry_id;
    
    -- Insertar en program_module_contents
    INSERT INTO program_module_contents (program_module_id, content_registry_id, position)
    VALUES (content_record.stage_id, new_registry_id, content_record.order_num);
  END LOOP;
  
  RAISE NOTICE 'Migración de contenido existente completada';
END;
$$ LANGUAGE plpgsql;

-- Ejecutar la migración solo si las tablas están vacías
DO $$ 
BEGIN
  IF (SELECT COUNT(*) FROM content_registry) = 0 AND 
     (SELECT COUNT(*) FROM program_module_contents) = 0 THEN
    PERFORM migrate_existing_content();
  ELSE
    RAISE NOTICE 'Las tablas ya contienen datos, se omite la migración automática';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Tablas aún no creadas, se omite la verificación de migración';
END $$;
