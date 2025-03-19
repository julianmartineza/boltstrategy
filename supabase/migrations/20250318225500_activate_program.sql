-- Script para activar un programa existente o crear uno nuevo con estado 'active'

-- Primero, verificamos si hay algún programa existente
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
