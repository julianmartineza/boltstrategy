-- Verificar si la tabla companies existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'companies'
  ) THEN
    -- Habilitar RLS para la tabla companies si aún no está habilitado
    ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
    
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
  END IF;
END $$;
