-- Crear función que se ejecutará cuando se cree un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insertar en user_profiles
  INSERT INTO public.user_profiles (id, is_admin, created_at, updated_at)
  VALUES (NEW.id, FALSE, NOW(), NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar el trigger si ya existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear trigger para ejecutar la función cuando se cree un nuevo usuario
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar usuarios existentes que no tengan perfil
INSERT INTO public.user_profiles (id, is_admin, created_at, updated_at)
SELECT id, FALSE, NOW(), NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles);

-- Comentario para documentar
COMMENT ON FUNCTION public.handle_new_user IS 'Función que crea automáticamente un registro en user_profiles cuando se crea un usuario en auth.users';
