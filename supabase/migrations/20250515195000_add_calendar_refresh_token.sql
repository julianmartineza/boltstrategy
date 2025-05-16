-- Añadir columna calendar_refresh_token a la tabla advisors si no existe
ALTER TABLE advisors ADD COLUMN IF NOT EXISTS calendar_refresh_token TEXT;

-- Actualizar las políticas de seguridad para la nueva columna
DO $$
BEGIN
    -- Verificar si la política ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'advisors' 
        AND policyname = 'Advisors can update their own calendar_refresh_token'
    ) THEN
        -- Crear política para permitir a los asesores actualizar su propio token de refresco
        CREATE POLICY "Advisors can update their own calendar_refresh_token" 
        ON advisors
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;
