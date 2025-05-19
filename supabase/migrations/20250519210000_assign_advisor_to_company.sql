-- Script para asignar un asesor a una empresa
-- Reemplaza los valores entre comillas con los IDs reales

-- Parámetros (reemplazar con los valores reales)
DO $$
DECLARE
    v_advisor_id UUID := '44926c91-7d57-45f4-b4a8-2e05f63169f6'; -- ID del asesor
    v_company_id UUID := '3fa85f64-5717-4562-b3fc-2c963f66afa6'; -- ID de la empresa
    v_program_id UUID := '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; -- ID del programa
BEGIN
    -- Verificar si el asesor existe
    IF NOT EXISTS (SELECT 1 FROM advisors WHERE id = v_advisor_id) THEN
        RAISE EXCEPTION 'El asesor con ID % no existe', v_advisor_id;
    END IF;
    
    -- Verificar si la empresa existe
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = v_company_id) THEN
        RAISE EXCEPTION 'La empresa con ID % no existe', v_company_id;
    END IF;
    
    -- Verificar si el programa existe
    IF NOT EXISTS (SELECT 1 FROM strategy_programs WHERE id = v_program_id) THEN
        RAISE EXCEPTION 'El programa con ID % no existe', v_program_id;
    END IF;
    
    -- Verificar si ya existe esta asignación
    IF EXISTS (
        SELECT 1 
        FROM advisor_assignments 
        WHERE advisor_id = v_advisor_id 
        AND company_id = v_company_id 
        AND program_id = v_program_id
    ) THEN
        RAISE NOTICE 'Esta asignación ya existe';
    ELSE
        -- Crear la asignación
        INSERT INTO advisor_assignments (
            advisor_id,
            company_id,
            program_id
        ) VALUES (
            v_advisor_id,
            v_company_id,
            v_program_id
        );
        
        RAISE NOTICE 'Asignación creada exitosamente';
    END IF;
END $$;
