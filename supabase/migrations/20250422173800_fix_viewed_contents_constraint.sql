/*
  # Corrección de restricción de clave foránea en viewed_contents
  
  Este script modifica la tabla viewed_contents para permitir que se registren visualizaciones
  de contenidos que están en la nueva estructura (content_registry) y no solo en stage_content.
  
  La solución consiste en:
  1. Eliminar la restricción de clave foránea existente
  2. Crear una función de validación personalizada que verifique si el contenido existe
     en cualquiera de las dos estructuras (stage_content o content_registry)
  3. Agregar un trigger que use esta función para validar las inserciones y actualizaciones
*/

-- Primero verificamos si la restricción existe y la eliminamos
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'viewed_contents_content_id_fkey' 
    AND table_name = 'viewed_contents'
  ) THEN
    ALTER TABLE viewed_contents DROP CONSTRAINT viewed_contents_content_id_fkey;
  END IF;
END $$;

-- Crear función para validar si un contenido existe en cualquiera de las estructuras
CREATE OR REPLACE FUNCTION validate_content_exists() RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si el contenido existe en stage_content
  IF EXISTS (SELECT 1 FROM stage_content WHERE id = NEW.content_id) THEN
    RETURN NEW;
  END IF;
  
  -- Verificar si el contenido existe en content_registry
  IF EXISTS (SELECT 1 FROM content_registry WHERE id = NEW.content_id) THEN
    RETURN NEW;
  END IF;
  
  -- Si no existe en ninguna de las dos estructuras, rechazar
  RAISE EXCEPTION 'El contenido con ID % no existe en ninguna estructura', NEW.content_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Eliminar el trigger si ya existe
DROP TRIGGER IF EXISTS validate_content_trigger ON viewed_contents;

-- Crear trigger para validar contenidos antes de insertar o actualizar
CREATE TRIGGER validate_content_trigger
BEFORE INSERT OR UPDATE ON viewed_contents
FOR EACH ROW
EXECUTE FUNCTION validate_content_exists();

-- Actualizar las políticas RLS para viewed_contents
DO $$ 
BEGIN
  -- Política para select
  IF NOT policy_exists('Enable read access for authenticated users', 'viewed_contents') THEN
    CREATE POLICY "Enable read access for authenticated users" 
    ON viewed_contents FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
  
  -- Política para insert
  IF NOT policy_exists('Enable insert for authenticated users', 'viewed_contents') THEN
    CREATE POLICY "Enable insert for authenticated users" 
    ON viewed_contents FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
