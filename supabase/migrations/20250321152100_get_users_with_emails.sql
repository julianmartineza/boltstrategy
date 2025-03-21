-- Función para obtener usuarios con sus emails
DROP FUNCTION IF EXISTS get_users_with_emails();

CREATE OR REPLACE FUNCTION get_users_with_emails()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  is_admin BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    au.email::VARCHAR,
    up.is_admin,
    up.created_at
  FROM user_profiles up
  JOIN auth.users au ON up.id = au.id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para documentar la función
COMMENT ON FUNCTION get_users_with_emails IS 'Función para obtener todos los usuarios con sus emails, ordenados por fecha de creación';

-- Permisos para la función
GRANT EXECUTE ON FUNCTION get_users_with_emails TO authenticated;
