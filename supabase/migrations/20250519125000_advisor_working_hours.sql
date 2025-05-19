-- Agregar campos para la configuración de horarios de trabajo de los asesores
ALTER TABLE advisors 
  ADD COLUMN IF NOT EXISTS working_hours_start TEXT DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS working_hours_end TEXT DEFAULT '17:00',
  ADD COLUMN IF NOT EXISTS slot_duration INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS working_days INTEGER[] DEFAULT '{1,2,3,4,5}'::INTEGER[];

-- Actualizar las políticas de seguridad para los nuevos campos
DO $$
BEGIN
    -- Verificar si la política ya existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'advisors' 
        AND policyname = 'Advisors can update their own working hours'
    ) THEN
        -- Crear política para permitir a los asesores actualizar sus propios horarios de trabajo
        CREATE POLICY "Advisors can update their own working hours" 
        ON advisors
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END
$$;

-- Comentario para el seguimiento de cambios
COMMENT ON COLUMN advisors.working_hours_start IS 'Hora de inicio del horario laboral del asesor (formato HH:MM)';
COMMENT ON COLUMN advisors.working_hours_end IS 'Hora de fin del horario laboral del asesor (formato HH:MM)';
COMMENT ON COLUMN advisors.slot_duration IS 'Duración de los slots de disponibilidad en minutos';
COMMENT ON COLUMN advisors.working_days IS 'Días de la semana en los que trabaja el asesor (0=domingo, 6=sábado)';
