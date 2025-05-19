-- Agregar columnas necesarias para el gestor de reportes de sesiones
DO $$
BEGIN
    -- Agregar columna status si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'advisory_reports' AND column_name = 'status'
    ) THEN
        ALTER TABLE advisory_reports ADD COLUMN status text DEFAULT 'draft';
    END IF;

    -- Agregar columna feedback si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'advisory_reports' AND column_name = 'feedback'
    ) THEN
        ALTER TABLE advisory_reports ADD COLUMN feedback text;
    END IF;

    -- Actualizar status basado en submitted para registros existentes
    UPDATE advisory_reports 
    SET status = CASE 
                    WHEN submitted = true THEN 'submitted' 
                    ELSE 'draft' 
                 END
    WHERE status IS NULL OR status = '';
END $$;
