-- Crear tabla para perfiles de empresas
CREATE TABLE IF NOT EXISTS company_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  contact_name TEXT,
  position TEXT,
  industry TEXT,
  employees_count INTEGER,
  website TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON company_profiles(user_id);

-- Políticas de seguridad para la tabla company_profiles
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si ya existen
DO $$ 
BEGIN
  -- Eliminar política admin_all_access si existe
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'company_profiles' AND policyname = 'admin_all_access'
  ) THEN
    DROP POLICY admin_all_access ON company_profiles;
  END IF;
  
  -- Eliminar política user_view_own si existe
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'company_profiles' AND policyname = 'user_view_own'
  ) THEN
    DROP POLICY user_view_own ON company_profiles;
  END IF;
END $$;

-- Política para administradores (pueden ver y modificar todos los perfiles)
CREATE POLICY admin_all_access ON company_profiles
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Política para usuarios (solo pueden ver y modificar su propio perfil)
CREATE POLICY user_view_own ON company_profiles
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Comentarios para documentar la tabla
COMMENT ON TABLE company_profiles IS 'Tabla que almacena información de las empresas de los usuarios';

-- Modificar la función get_users_with_emails para incluir información de la empresa
DROP FUNCTION IF EXISTS get_users_with_emails();

CREATE OR REPLACE FUNCTION get_users_with_emails()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  is_admin BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  company_name TEXT,
  contact_name TEXT,
  position TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    au.email::VARCHAR,
    up.is_admin,
    up.created_at,
    cp.company_name,
    cp.contact_name,
    cp.position
  FROM user_profiles up
  JOIN auth.users au ON up.id = au.id
  LEFT JOIN company_profiles cp ON up.id = cp.user_id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario para documentar la función
COMMENT ON FUNCTION get_users_with_emails IS 'Función para obtener todos los usuarios con sus emails e información de empresa, ordenados por fecha de creación';

-- Permisos para la función
GRANT EXECUTE ON FUNCTION get_users_with_emails TO authenticated;
