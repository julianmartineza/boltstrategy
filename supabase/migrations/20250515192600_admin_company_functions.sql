-- Función para administradores para obtener información de empresa de cualquier usuario
CREATE OR REPLACE FUNCTION admin_get_company_info(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  industry TEXT,
  size TEXT,
  user_id UUID
) SECURITY DEFINER AS $$
BEGIN
  -- Verificar si el usuario que llama es administrador
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Solo los administradores pueden acceder a esta función';
  END IF;

  -- Devolver la información de la empresa del usuario solicitado
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.industry,
    c.size,
    c.user_id
  FROM companies c
  WHERE c.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Comentario para documentar la función
COMMENT ON FUNCTION admin_get_company_info IS 'Función para que los administradores obtengan información de empresa de cualquier usuario';
