-- Crear tabla de notificaciones para el sistema de asesorías
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    title varchar(255) NOT NULL,
    message text NOT NULL,
    type varchar(50) NOT NULL,
    related_id uuid,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Agregar comentarios a la tabla y columnas
COMMENT ON TABLE public.notifications IS 'Tabla para almacenar notificaciones del sistema';
COMMENT ON COLUMN public.notifications.id IS 'ID único de la notificación';
COMMENT ON COLUMN public.notifications.user_id IS 'ID del usuario destinatario de la notificación';
COMMENT ON COLUMN public.notifications.title IS 'Título de la notificación';
COMMENT ON COLUMN public.notifications.message IS 'Contenido detallado de la notificación';
COMMENT ON COLUMN public.notifications.type IS 'Tipo de notificación (booking, cancellation, report, assignment, reminder)';
COMMENT ON COLUMN public.notifications.related_id IS 'ID de referencia relacionado con la notificación (opcional)';
COMMENT ON COLUMN public.notifications.read IS 'Indica si la notificación ha sido leída';
COMMENT ON COLUMN public.notifications.created_at IS 'Fecha y hora de creación';
COMMENT ON COLUMN public.notifications.updated_at IS 'Fecha y hora de última actualización';

-- Establecer políticas RLS para la tabla de notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver sus propias notificaciones
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Política para que los usuarios solo puedan actualizar sus propias notificaciones
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para que los administradores puedan crear notificaciones para cualquier usuario
CREATE POLICY "Admins can create notifications" ON public.notifications
    FOR INSERT WITH CHECK (true);
