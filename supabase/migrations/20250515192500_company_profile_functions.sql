-- Función para obtener la información de empresa de un usuario
CREATE OR REPLACE FUNCTION get_company_by_user_id(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  industry TEXT,
  size TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  annual_revenue TEXT,
  website TEXT
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.industry,
    c.size,
    c.created_at,
    c.user_id,
    c.annual_revenue::TEXT,
    c.website
  FROM companies c
  WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Comentario para documentar la función
COMMENT ON FUNCTION get_company_by_user_id IS 'Función para obtener la información de empresa de un usuario específico';

-- Asegurar que las políticas de seguridad para la tabla companies permitan acceso adecuado
DO $$ 
BEGIN
  -- Verificar si la política admin_all_access ya existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' AND policyname = 'admin_all_access'
  ) THEN
    -- Crear política para administradores (pueden ver y modificar todas las empresas)
    CREATE POLICY admin_all_access ON companies
      FOR ALL
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND is_admin = true
      ));
  END IF;
  
  -- Verificar si la política user_view_own ya existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' AND policyname = 'user_view_own'
  ) THEN
    -- Crear política para usuarios (solo pueden ver y modificar su propia empresa)
    CREATE POLICY user_view_own ON companies
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Asegurar que RLS está habilitado para la tabla companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
