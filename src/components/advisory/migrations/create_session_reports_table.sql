-- Migración para crear la tabla de reportes de sesiones de asesorías
-- Esta tabla almacena los reportes generados después de las sesiones de asesoría
-- Ejecutar en la consola SQL de Supabase

-- Crear tabla de reportes de sesiones
CREATE TABLE IF NOT EXISTS session_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES advisory_sessions(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  summary TEXT NOT NULL,
  achievements TEXT NOT NULL,
  next_steps TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, submitted, approved, rejected
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_session_reports_session_id ON session_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_advisor_id ON session_reports(advisor_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_company_id ON session_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_status ON session_reports(status);
CREATE INDEX IF NOT EXISTS idx_session_reports_created_at ON session_reports(created_at);

-- Crear política RLS para que los asesores puedan ver y editar sus propios reportes
CREATE POLICY "Advisors can view and edit their own reports"
  ON session_reports
  USING (advisor_id IN (
    SELECT id FROM advisors WHERE user_id = auth.uid()
  ));

-- Crear política RLS para que las empresas puedan ver los reportes de sus sesiones
CREATE POLICY "Companies can view reports for their sessions"
  ON session_reports
  FOR SELECT
  USING (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ));

-- Crear política RLS para que las empresas puedan aprobar/rechazar reportes
CREATE POLICY "Companies can update report status"
  ON session_reports
  FOR UPDATE
  USING (company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  ))
  WITH CHECK (
    (OLD.status = 'submitted' AND NEW.status IN ('approved', 'rejected')) AND
    (OLD.id = NEW.id AND OLD.session_id = NEW.session_id AND OLD.advisor_id = NEW.advisor_id AND OLD.company_id = NEW.company_id)
  );

-- Crear política RLS para administradores
CREATE POLICY "Admins can manage all reports"
  ON session_reports
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Habilitar RLS en la tabla
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;

-- Crear función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_session_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar el campo updated_at automáticamente
CREATE TRIGGER update_session_reports_updated_at
BEFORE UPDATE ON session_reports
FOR EACH ROW
EXECUTE FUNCTION update_session_reports_updated_at();

-- Comentarios para documentar la tabla
COMMENT ON TABLE session_reports IS 'Reportes de sesiones de asesoría';
COMMENT ON COLUMN session_reports.id IS 'Identificador único del reporte';
COMMENT ON COLUMN session_reports.session_id IS 'ID de la sesión a la que pertenece el reporte';
COMMENT ON COLUMN session_reports.advisor_id IS 'ID del asesor que creó el reporte';
COMMENT ON COLUMN session_reports.company_id IS 'ID de la empresa a la que pertenece la sesión';
COMMENT ON COLUMN session_reports.title IS 'Título del reporte';
COMMENT ON COLUMN session_reports.summary IS 'Resumen de la sesión';
COMMENT ON COLUMN session_reports.achievements IS 'Logros alcanzados durante la sesión';
COMMENT ON COLUMN session_reports.next_steps IS 'Próximos pasos a seguir';
COMMENT ON COLUMN session_reports.status IS 'Estado del reporte (borrador, enviado, aprobado, rechazado)';
COMMENT ON COLUMN session_reports.feedback IS 'Feedback proporcionado por la empresa (en caso de rechazo)';
COMMENT ON COLUMN session_reports.created_at IS 'Fecha y hora de creación del reporte';
COMMENT ON COLUMN session_reports.updated_at IS 'Fecha y hora de la última actualización del reporte';
