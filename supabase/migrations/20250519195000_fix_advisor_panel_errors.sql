-- Agregar la columna logo_url a la tabla companies si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'companies' AND column_name = 'logo_url'
    ) THEN
        ALTER TABLE companies ADD COLUMN logo_url text;
    END IF;
END $$;

-- Corregir la función get_pending_reports
-- Primero eliminamos la función existente
DROP FUNCTION IF EXISTS get_pending_reports(uuid);

-- Luego creamos la función con la estructura original pero corregida
CREATE FUNCTION get_pending_reports(p_advisor_id uuid)
RETURNS TABLE(
    booking_id uuid, 
    company_id uuid, 
    company_name text, 
    session_id uuid, 
    session_title text, 
    start_time timestamp with time zone, 
    end_time timestamp with time zone, 
    report_id uuid, 
    report_submitted boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ab.id as booking_id,
    ab.company_id,
    c.name::text as company_name,
    ab.session_id,
    s.title::text as session_title,
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

-- Actualizar algunas empresas con URLs de logo de ejemplo (opcional)
UPDATE companies
SET logo_url = 'https://via.placeholder.com/150'
WHERE logo_url IS NULL;
