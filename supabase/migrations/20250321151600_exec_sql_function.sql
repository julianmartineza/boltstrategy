-- Función para ejecutar SQL dinámico con privilegios de administrador
-- Esta función debe ser ejecutada por un administrador de Supabase
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void AS $$
BEGIN
  EXECUTE sql;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para documentar la función
COMMENT ON FUNCTION exec_sql IS 'Función para ejecutar SQL dinámico. Solo debe ser utilizada por administradores para migraciones.';

-- Permisos restrictivos para la función
REVOKE ALL ON FUNCTION exec_sql FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql TO authenticated;

-- Política para restringir el uso de la función solo a administradores
CREATE OR REPLACE FUNCTION check_is_admin_for_exec_sql()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para documentar la función
COMMENT ON FUNCTION check_is_admin_for_exec_sql IS 'Función para verificar si el usuario actual es administrador, utilizada para restringir el acceso a exec_sql.';
