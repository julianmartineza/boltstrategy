-- Script para añadir la columna stage_name a la tabla stage_content

-- Añadir la columna stage_name a la tabla stage_content si no existe
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
