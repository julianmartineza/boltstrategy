/*
  # Implementación del sistema de asesorías
  
  Este script crea las tablas necesarias para el sistema de asesorías:
  - advisory_allocations: Define cuántas horas de asesoría tiene una empresa dentro de un módulo
  - advisory_bookings: Almacena las sesiones agendadas con horario y Google Calendar
  - advisory_reports: Actas de las sesiones, diligenciadas por los asesores
  - advisors: Perfil de los asesores con integración a Google Calendar
  - advisor_assignments: Define qué asesor puede atender a qué empresa y en qué programa
*/

-- Eliminar la función si ya existe para evitar errores de parámetros
DROP FUNCTION IF EXISTS policy_exists(text, text);

-- Función para verificar si una política existe
CREATE OR REPLACE FUNCTION policy_exists(policy_name text, table_name text) 
RETURNS boolean AS $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE policyname = policy_name
  AND tablename = table_name;
  
  RETURN policy_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Tabla advisors
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advisors') THEN
    CREATE TABLE advisors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      bio TEXT,
      specialty VARCHAR(255),
      email VARCHAR(255),
      phone VARCHAR(50),
      photo_url TEXT,
      google_account_email VARCHAR(255),
      calendar_sync_token TEXT,
      available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read advisors', 'advisors') THEN
      CREATE POLICY "Anyone can read advisors"
        ON advisors
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Admins can insert advisors', 'advisors') THEN
      CREATE POLICY "Admins can insert advisors"
        ON advisors
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can update advisors', 'advisors') THEN
      CREATE POLICY "Admins can update advisors"
        ON advisors
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can delete advisors', 'advisors') THEN
      CREATE POLICY "Admins can delete advisors"
        ON advisors
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    RAISE NOTICE 'Tabla advisors creada';
  ELSE
    RAISE NOTICE 'La tabla advisors ya existe';
  END IF;
END $$;

-- Tabla advisor_assignments
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advisor_assignments') THEN
    CREATE TABLE advisor_assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      advisor_id UUID REFERENCES advisors(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE advisor_assignments ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read advisor assignments', 'advisor_assignments') THEN
      CREATE POLICY "Anyone can read advisor assignments"
        ON advisor_assignments
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Admins can insert advisor assignments', 'advisor_assignments') THEN
      CREATE POLICY "Admins can insert advisor assignments"
        ON advisor_assignments
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can update advisor assignments', 'advisor_assignments') THEN
      CREATE POLICY "Admins can update advisor assignments"
        ON advisor_assignments
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can delete advisor assignments', 'advisor_assignments') THEN
      CREATE POLICY "Admins can delete advisor assignments"
        ON advisor_assignments
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    RAISE NOTICE 'Tabla advisor_assignments creada';
  ELSE
    RAISE NOTICE 'La tabla advisor_assignments ya existe';
  END IF;
END $$;

-- Tabla advisory_allocations
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advisory_allocations') THEN
    CREATE TABLE advisory_allocations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      program_module_id UUID REFERENCES strategy_stages(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      total_minutes INTEGER NOT NULL,
      used_minutes INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE advisory_allocations ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read advisory allocations', 'advisory_allocations') THEN
      CREATE POLICY "Anyone can read advisory allocations"
        ON advisory_allocations
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Admins can insert advisory allocations', 'advisory_allocations') THEN
      CREATE POLICY "Admins can insert advisory allocations"
        ON advisory_allocations
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can update advisory allocations', 'advisory_allocations') THEN
      CREATE POLICY "Admins can update advisory allocations"
        ON advisory_allocations
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Admins can delete advisory allocations', 'advisory_allocations') THEN
      CREATE POLICY "Admins can delete advisory allocations"
        ON advisory_allocations
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    RAISE NOTICE 'Tabla advisory_allocations creada';
  ELSE
    RAISE NOTICE 'La tabla advisory_allocations ya existe';
  END IF;
END $$;

-- Tabla advisory_bookings
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advisory_bookings') THEN
    CREATE TABLE advisory_bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      advisor_id UUID REFERENCES advisors(id) ON DELETE CASCADE,
      session_id UUID REFERENCES advisory_sessions(id) ON DELETE CASCADE,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      google_event_id VARCHAR(255),
      status VARCHAR(50) DEFAULT 'scheduled',
      created_by UUID REFERENCES user_profiles(id),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE advisory_bookings ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read advisory bookings', 'advisory_bookings') THEN
      CREATE POLICY "Anyone can read advisory bookings"
        ON advisory_bookings
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Authenticated users can insert advisory bookings', 'advisory_bookings') THEN
      CREATE POLICY "Authenticated users can insert advisory bookings"
        ON advisory_bookings
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;

    IF NOT policy_exists('Authenticated users can update advisory bookings', 'advisory_bookings') THEN
      CREATE POLICY "Authenticated users can update advisory bookings"
        ON advisory_bookings
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT policy_exists('Authenticated users can delete advisory bookings', 'advisory_bookings') THEN
      CREATE POLICY "Authenticated users can delete advisory bookings"
        ON advisory_bookings
        FOR DELETE
        TO authenticated
        USING (true);
    END IF;

    RAISE NOTICE 'Tabla advisory_bookings creada';
  ELSE
    RAISE NOTICE 'La tabla advisory_bookings ya existe';
  END IF;
END $$;

-- Tabla advisory_reports
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'advisory_reports') THEN
    CREATE TABLE advisory_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      booking_id UUID REFERENCES advisory_bookings(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      advisor_id UUID REFERENCES advisors(id) ON DELETE CASCADE,
      notes TEXT,
      commitments TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      submitted BOOLEAN DEFAULT FALSE
    );

    ALTER TABLE advisory_reports ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS
    IF NOT policy_exists('Anyone can read advisory reports', 'advisory_reports') THEN
      CREATE POLICY "Anyone can read advisory reports"
        ON advisory_reports
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT policy_exists('Advisors and admins can insert advisory reports', 'advisory_reports') THEN
      CREATE POLICY "Advisors and admins can insert advisory reports"
        ON advisory_reports
        FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM advisors
            WHERE user_id = auth.uid()
          ) OR
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Advisors and admins can update advisory reports', 'advisory_reports') THEN
      CREATE POLICY "Advisors and admins can update advisory reports"
        ON advisory_reports
        FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM advisors
            WHERE user_id = auth.uid()
            AND id = advisory_reports.advisor_id
          ) OR
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    IF NOT policy_exists('Advisors and admins can delete advisory reports', 'advisory_reports') THEN
      CREATE POLICY "Advisors and admins can delete advisory reports"
        ON advisory_reports
        FOR DELETE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM advisors
            WHERE user_id = auth.uid()
            AND id = advisory_reports.advisor_id
          ) OR
          EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid()
            AND is_admin = true
          )
        );
    END IF;

    RAISE NOTICE 'Tabla advisory_reports creada';
  ELSE
    RAISE NOTICE 'La tabla advisory_reports ya existe';
  END IF;
END $$;

-- Funciones para gestionar asesores
CREATE OR REPLACE FUNCTION create_advisor(
  p_user_id UUID,
  p_name VARCHAR(255),
  p_bio TEXT DEFAULT NULL,
  p_specialty VARCHAR(255) DEFAULT NULL,
  p_email VARCHAR(255) DEFAULT NULL,
  p_phone VARCHAR(50) DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_google_account_email VARCHAR(255) DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_advisor_id UUID;
BEGIN
  INSERT INTO advisors (
    user_id, name, bio, specialty, email, phone, photo_url, google_account_email
  ) VALUES (
    p_user_id, p_name, COALESCE(p_bio, ''), COALESCE(p_specialty, ''), COALESCE(p_email, ''), COALESCE(p_phone, ''), COALESCE(p_photo_url, ''), COALESCE(p_google_account_email, '')
  ) RETURNING id INTO new_advisor_id;
  
  RETURN new_advisor_id;
END;
$$ LANGUAGE plpgsql;

-- Función para asignar un asesor a una empresa y programa
CREATE OR REPLACE FUNCTION assign_advisor_to_company(
  p_advisor_id UUID,
  p_company_id UUID,
  p_program_id UUID
) RETURNS UUID AS $$
DECLARE
  new_assignment_id UUID;
BEGIN
  -- Verificar si ya existe una asignación
  IF EXISTS (
    SELECT 1 FROM advisor_assignments
    WHERE advisor_id = p_advisor_id
    AND company_id = p_company_id
    AND program_id = p_program_id
  ) THEN
    -- Devolver el ID existente
    SELECT id INTO new_assignment_id
    FROM advisor_assignments
    WHERE advisor_id = p_advisor_id
    AND company_id = p_company_id
    AND program_id = p_program_id;
  ELSE
    -- Crear nueva asignación
    INSERT INTO advisor_assignments (
      advisor_id, company_id, program_id
    ) VALUES (
      p_advisor_id, p_company_id, p_program_id
    ) RETURNING id INTO new_assignment_id;
  END IF;
  
  RETURN new_assignment_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener asesores asignados a una empresa
CREATE OR REPLACE FUNCTION get_company_advisors(
  p_company_id UUID,
  p_program_id UUID DEFAULT NULL
) RETURNS TABLE (
  advisor_id UUID,
  advisor_name VARCHAR(255),
  advisor_specialty VARCHAR(255),
  advisor_email VARCHAR(255),
  advisor_phone VARCHAR(50),
  advisor_photo_url TEXT,
  user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as advisor_id,
    a.name as advisor_name,
    a.specialty as advisor_specialty,
    a.email as advisor_email,
    a.phone as advisor_phone,
    a.photo_url as advisor_photo_url,
    a.user_id as user_id
  FROM advisors a
  JOIN advisor_assignments aa ON a.id = aa.advisor_id
  WHERE aa.company_id = p_company_id
  AND (p_program_id IS NULL OR aa.program_id = p_program_id)
  AND a.available = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener empresas asignadas a un asesor
CREATE OR REPLACE FUNCTION get_advisor_companies(
  p_advisor_id UUID,
  p_program_id UUID DEFAULT NULL
) RETURNS TABLE (
  company_id UUID,
  company_name VARCHAR(255),
  program_id UUID,
  program_name VARCHAR(255)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as company_id,
    c.name as company_name,
    p.id as program_id,
    p.name as program_name
  FROM companies c
  JOIN advisor_assignments aa ON c.id = aa.company_id
  JOIN programs p ON aa.program_id = p.id
  WHERE aa.advisor_id = p_advisor_id
  AND (p_program_id IS NULL OR aa.program_id = p_program_id);
END;
$$ LANGUAGE plpgsql;

-- Función para crear una reserva de asesoría
CREATE OR REPLACE FUNCTION create_advisory_booking(
  p_company_id UUID,
  p_advisor_id UUID,
  p_session_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_google_event_id VARCHAR(255) DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_booking_id UUID;
  session_duration INTEGER;
  available_minutes INTEGER;
  allocation_id UUID;
BEGIN
  -- Obtener la duración de la sesión
  SELECT duration INTO session_duration
  FROM advisory_sessions
  WHERE id = p_session_id;
  
  -- Verificar si hay minutos disponibles
  SELECT id, (total_minutes - used_minutes) INTO allocation_id, available_minutes
  FROM advisory_allocations
  WHERE company_id = p_company_id
  AND program_module_id IN (
    SELECT program_module_id
    FROM program_module_contents
    WHERE content_registry_id IN (
      SELECT id
      FROM content_registry
      WHERE content_id = p_session_id
      AND content_type = 'advisory_session'
    )
  )
  LIMIT 1;
  
  IF allocation_id IS NULL THEN
    RAISE EXCEPTION 'No hay asignación de asesoría para esta empresa en este módulo';
  END IF;
  
  IF available_minutes < session_duration THEN
    RAISE EXCEPTION 'No hay suficientes minutos disponibles para esta sesión';
  END IF;
  
  -- Crear la reserva
  INSERT INTO advisory_bookings (
    company_id, advisor_id, session_id, 
    start_time, end_time, google_event_id, created_by
  ) VALUES (
    p_company_id, p_advisor_id, p_session_id, 
    p_start_time, p_end_time, p_google_event_id, p_created_by
  ) RETURNING id INTO new_booking_id;
  
  -- Actualizar minutos utilizados
  UPDATE advisory_allocations
  SET used_minutes = used_minutes + session_duration
  WHERE id = allocation_id;
  
  RETURN new_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Función para crear un reporte de asesoría
CREATE OR REPLACE FUNCTION create_advisory_report(
  p_booking_id UUID,
  p_notes TEXT,
  p_commitments TEXT,
  p_submitted BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  new_report_id UUID;
  v_company_id UUID;
  v_advisor_id UUID;
BEGIN
  -- Obtener company_id y advisor_id de la reserva
  SELECT company_id, advisor_id INTO v_company_id, v_advisor_id
  FROM advisory_bookings
  WHERE id = p_booking_id;
  
  -- Crear el reporte
  INSERT INTO advisory_reports (
    booking_id, company_id, advisor_id, notes, commitments, submitted
  ) VALUES (
    p_booking_id, v_company_id, v_advisor_id, p_notes, p_commitments, p_submitted
  ) RETURNING id INTO new_report_id;
  
  -- Actualizar estado de la reserva si el reporte está enviado
  IF p_submitted THEN
    UPDATE advisory_bookings
    SET status = 'completed'
    WHERE id = p_booking_id;
  END IF;
  
  RETURN new_report_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener reportes pendientes de un asesor
CREATE OR REPLACE FUNCTION get_pending_reports(
  p_advisor_id UUID
) RETURNS TABLE (
  booking_id UUID,
  company_id UUID,
  company_name VARCHAR(255),
  session_id UUID,
  session_title VARCHAR(255),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  report_id UUID,
  report_submitted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ab.id as booking_id,
    ab.company_id,
    c.name as company_name,
    ab.session_id,
    s.title as session_title,
    ab.start_time,
    ab.end_time,
    ar.id as report_id,
    COALESCE(ar.submitted, FALSE) as report_submitted
  FROM advisory_bookings ab
  JOIN companies c ON ab.company_id = c.id
  JOIN advisory_sessions s ON ab.session_id = s.id
  LEFT JOIN advisory_reports ar ON ab.id = ar.booking_id
  WHERE ab.advisor_id = p_advisor_id
  AND (ar.id IS NULL OR ar.submitted = FALSE)
  AND ab.end_time < CURRENT_TIMESTAMP
  ORDER BY ab.end_time DESC;
END;
$$ LANGUAGE plpgsql;

-- Registrar el tipo de contenido 'advisory_session' en content_registry si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM content_registry 
    WHERE content_type = 'advisory_session'
    LIMIT 1
  ) THEN
    -- Verificar si hay sesiones de asesoría
    IF EXISTS (SELECT 1 FROM advisory_sessions LIMIT 1) THEN
      -- Registrar cada sesión en content_registry
      INSERT INTO content_registry (
        title, content_type, content_table, content_id
      )
      SELECT 
        title, 
        'advisory_session', 
        'advisory_sessions', 
        id
      FROM advisory_sessions;
      
      RAISE NOTICE 'Sesiones de asesoría registradas en content_registry';
    ELSE
      RAISE NOTICE 'No hay sesiones de asesoría para registrar';
    END IF;
  ELSE
    RAISE NOTICE 'Ya existen registros de tipo advisory_session en content_registry';
  END IF;
END $$;
