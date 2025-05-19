-- Agregar asignaciones de horas de asesoría para módulos
-- Esta migración inserta datos de ejemplo en la tabla advisory_allocations

-- Primero, obtener IDs de programas y módulos existentes para referencia
DO $$
DECLARE
  v_program_id UUID;
  v_company_id UUID;
  v_module_ids UUID[];
  v_module_id UUID;
  v_i INTEGER;
BEGIN
  -- Obtener el primer programa (asumiendo que existe al menos uno)
  SELECT id INTO v_program_id FROM programs LIMIT 1;
  
  -- Obtener la primera empresa (asumiendo que existe al menos una)
  SELECT id INTO v_company_id FROM companies LIMIT 1;
  
  IF v_program_id IS NOT NULL AND v_company_id IS NOT NULL THEN
    -- Obtener los módulos del programa
    SELECT array_agg(id) INTO v_module_ids 
    FROM strategy_stages 
    WHERE program_id = v_program_id;
    
    -- Si hay módulos, crear asignaciones para cada uno
    IF v_module_ids IS NOT NULL THEN
      FOR v_i IN 1..array_length(v_module_ids, 1) LOOP
        v_module_id := v_module_ids[v_i];
        
        -- Insertar asignación de horas para este módulo y empresa
        INSERT INTO advisory_allocations (
          id,
          program_module_id,
          company_id,
          total_minutes,
          used_minutes,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          v_module_id,
          v_company_id,
          -- Asignar entre 60 y 180 minutos (1-3 horas) según el número de módulo
          60 + (v_i * 30),
          -- Inicialmente no se han usado minutos
          0,
          NOW(),
          NOW()
        );
      END LOOP;
    END IF;
  END IF;
END
$$;

-- Agregar comentarios para documentación
COMMENT ON TABLE advisory_allocations IS 'Asignaciones de tiempo de asesoría para módulos de programa por empresa';
COMMENT ON COLUMN advisory_allocations.total_minutes IS 'Total de minutos asignados para este módulo y empresa';
COMMENT ON COLUMN advisory_allocations.used_minutes IS 'Minutos ya utilizados en sesiones de asesoría';
