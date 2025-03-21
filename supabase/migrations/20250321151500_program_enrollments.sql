-- Crear tabla de inscripciones a programas
CREATE TABLE IF NOT EXISTS program_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'inactive')),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, program_id)
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_program_enrollments_user_id ON program_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program_id ON program_enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_status ON program_enrollments(status);

-- Función para obtener los programas de un usuario
CREATE OR REPLACE FUNCTION get_user_programs(p_user_id UUID)
RETURNS TABLE (
  program_id UUID,
  program_name TEXT,
  status TEXT,
  enrolled_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS program_id,
    p.name AS program_name,
    pe.status,
    pe.enrolled_at
  FROM program_enrollments pe
  JOIN programs p ON pe.program_id = p.id
  WHERE pe.user_id = p_user_id
  ORDER BY pe.enrolled_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para inscribir a un usuario en un programa
CREATE OR REPLACE FUNCTION enroll_user_in_program(
  p_user_id UUID,
  p_program_id UUID,
  p_status TEXT DEFAULT 'active'
)
RETURNS UUID AS $$
DECLARE
  v_enrollment_id UUID;
BEGIN
  -- Verificar si ya existe una inscripción
  SELECT id INTO v_enrollment_id
  FROM program_enrollments
  WHERE user_id = p_user_id AND program_id = p_program_id;
  
  -- Si existe, actualizar
  IF v_enrollment_id IS NOT NULL THEN
    UPDATE program_enrollments
    SET status = p_status, updated_at = NOW()
    WHERE id = v_enrollment_id;
    RETURN v_enrollment_id;
  ELSE
    -- Si no existe, crear nueva inscripción
    INSERT INTO program_enrollments (user_id, program_id, status)
    VALUES (p_user_id, p_program_id, p_status)
    RETURNING id INTO v_enrollment_id;
    RETURN v_enrollment_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Función para eliminar la inscripción de un usuario a un programa
CREATE OR REPLACE FUNCTION unenroll_user_from_program(
  p_user_id UUID,
  p_program_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_rows_affected INTEGER;
BEGIN
  DELETE FROM program_enrollments
  WHERE user_id = p_user_id AND program_id = p_program_id
  RETURNING 1 INTO v_rows_affected;
  
  RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Función para eliminar un usuario (para ser utilizada por el administrador)
DROP FUNCTION IF EXISTS delete_user_with_enrollments(UUID);
CREATE OR REPLACE FUNCTION delete_user_with_enrollments(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_success BOOLEAN;
BEGIN
  -- Eliminar inscripciones a programas
  DELETE FROM program_enrollments WHERE user_id = target_user_id;
  
  -- Eliminar perfil de usuario
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  -- Eliminar usuario de auth.users
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Políticas de seguridad para la tabla program_enrollments
ALTER TABLE program_enrollments ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si ya existen
DO $$ 
BEGIN
  -- Eliminar política admin_all_access si existe
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'program_enrollments' AND policyname = 'admin_all_access'
  ) THEN
    DROP POLICY admin_all_access ON program_enrollments;
  END IF;
  
  -- Eliminar política user_view_own si existe
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'program_enrollments' AND policyname = 'user_view_own'
  ) THEN
    DROP POLICY user_view_own ON program_enrollments;
  END IF;
END $$;

-- Política para administradores (pueden ver y modificar todas las inscripciones)
CREATE POLICY admin_all_access ON program_enrollments
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Política para usuarios (solo pueden ver sus propias inscripciones)
CREATE POLICY user_view_own ON program_enrollments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Comentarios para documentar la tabla y sus funciones
COMMENT ON TABLE program_enrollments IS 'Tabla que relaciona usuarios con programas, permitiendo gestionar las inscripciones';
COMMENT ON COLUMN program_enrollments.status IS 'Estado de la inscripción: active (activo), pending (pendiente), completed (completado), inactive (inactivo)';
COMMENT ON FUNCTION get_user_programs IS 'Función para obtener todos los programas en los que está inscrito un usuario';
COMMENT ON FUNCTION enroll_user_in_program IS 'Función para inscribir a un usuario en un programa o actualizar su estado';
COMMENT ON FUNCTION unenroll_user_from_program IS 'Función para eliminar la inscripción de un usuario a un programa';
COMMENT ON FUNCTION delete_user_with_enrollments IS 'Función para eliminar completamente un usuario y sus datos relacionados';
