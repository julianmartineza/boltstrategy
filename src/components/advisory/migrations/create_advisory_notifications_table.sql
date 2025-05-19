-- Migración para crear la tabla de notificaciones de asesorías
-- Esta tabla almacena las notificaciones relacionadas con el sistema de asesorías
-- Ejecutar en la consola SQL de Supabase

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS advisory_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  related_id UUID,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_advisory_notifications_user_id ON advisory_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_advisory_notifications_read ON advisory_notifications(read);
CREATE INDEX IF NOT EXISTS idx_advisory_notifications_type ON advisory_notifications(type);
CREATE INDEX IF NOT EXISTS idx_advisory_notifications_created_at ON advisory_notifications(created_at);

-- Crear política RLS para que los usuarios solo puedan ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications"
  ON advisory_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Crear política RLS para que los usuarios solo puedan actualizar sus propias notificaciones
CREATE POLICY "Users can update their own notifications"
  ON advisory_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Crear política RLS para que los usuarios solo puedan eliminar sus propias notificaciones
CREATE POLICY "Users can delete their own notifications"
  ON advisory_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Habilitar RLS en la tabla
ALTER TABLE advisory_notifications ENABLE ROW LEVEL SECURITY;

-- Crear función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION update_advisory_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar el campo updated_at automáticamente
CREATE TRIGGER update_advisory_notifications_updated_at
BEFORE UPDATE ON advisory_notifications
FOR EACH ROW
EXECUTE FUNCTION update_advisory_notifications_updated_at();

-- Comentarios para documentar la tabla
COMMENT ON TABLE advisory_notifications IS 'Notificaciones relacionadas con el sistema de asesorías';
COMMENT ON COLUMN advisory_notifications.id IS 'Identificador único de la notificación';
COMMENT ON COLUMN advisory_notifications.user_id IS 'ID del usuario al que pertenece la notificación';
COMMENT ON COLUMN advisory_notifications.title IS 'Título de la notificación';
COMMENT ON COLUMN advisory_notifications.message IS 'Mensaje detallado de la notificación';
COMMENT ON COLUMN advisory_notifications.type IS 'Tipo de notificación (booking, cancellation, report, assignment, reminder)';
COMMENT ON COLUMN advisory_notifications.related_id IS 'ID relacionado con la notificación (ej: ID de reserva, reporte, etc.)';
COMMENT ON COLUMN advisory_notifications.read IS 'Indica si la notificación ha sido leída';
COMMENT ON COLUMN advisory_notifications.created_at IS 'Fecha y hora de creación de la notificación';
COMMENT ON COLUMN advisory_notifications.updated_at IS 'Fecha y hora de la última actualización de la notificación';
