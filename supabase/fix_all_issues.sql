-- Script para resolver todos los problemas de una vez
-- Ejecutar este script directamente en la consola SQL de Supabase

-- 1. Añadir la columna stage_name a la tabla stage_content si no existe
DO $$ 
BEGIN
  -- Verificar si la columna ya existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'stage_content' AND column_name = 'stage_name'
  ) THEN
    -- Añadir la columna stage_name
    ALTER TABLE stage_content ADD COLUMN stage_name TEXT;
    
    -- Actualizar los valores existentes para que stage_name sea igual al nombre de la etapa correspondiente
    UPDATE stage_content sc
    SET stage_name = ss.name
    FROM strategy_stages ss
    WHERE sc.stage_id = ss.id AND sc.stage_name IS NULL;
    
    RAISE NOTICE 'Se ha añadido la columna stage_name a la tabla stage_content';
  ELSE
    RAISE NOTICE 'La columna stage_name ya existe en la tabla stage_content';
  END IF;
END $$;

-- 2. Activar un programa existente o crear uno nuevo con estado 'active'
DO $$
DECLARE
  program_count INTEGER;
  first_program_id UUID;
BEGIN
  -- Contar programas existentes
  SELECT COUNT(*) INTO program_count FROM programs;
  
  -- Si no hay programas, crear uno nuevo
  IF program_count = 0 THEN
    INSERT INTO programs (name, description, status)
    VALUES ('Programa de Estrategia Empresarial', 'Programa diseñado para ayudar a las empresas a desarrollar estrategias efectivas', 'active');
    
    RAISE NOTICE 'Se ha creado un nuevo programa con estado active';
  ELSE
    -- Si hay programas pero ninguno está activo, activar el primero
    SELECT COUNT(*) INTO program_count FROM programs WHERE status = 'active';
    
    IF program_count = 0 THEN
      -- Obtener el ID del primer programa
      SELECT id INTO first_program_id FROM programs ORDER BY created_at ASC LIMIT 1;
      
      -- Actualizar su estado a 'active'
      UPDATE programs SET status = 'active' WHERE id = first_program_id;
      
      RAISE NOTICE 'Se ha activado el programa con ID: %', first_program_id;
    ELSE
      RAISE NOTICE 'Ya existe al menos un programa con estado active';
    END IF;
  END IF;
END $$;

-- 3. Actualizar el esquema en caché de Supabase
-- Esto ayudará a refrescar el esquema en caché para que reconozca la nueva columna
SELECT pg_reload_conf();

-- 4. Verificar que todo esté correcto
SELECT 'Columna stage_name en stage_content' AS verificacion, 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stage_content' AND column_name = 'stage_name'
    ) THEN 'Existe' 
    ELSE 'No existe' 
  END AS estado
UNION ALL
SELECT 'Programa activo' AS verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM programs WHERE status = 'active'
    ) THEN 'Existe'
    ELSE 'No existe'
  END AS estado;
