# Componente de Asesorías: Lógica de Implementación y Estructura Relacional

Este documento describe el diseño funcional y técnico del componente de sesiones de asesoría dentro de la plataforma. A diferencia de la estructura general de contenidos, este componente incluye flujos adicionales de agendamiento, integración con calendarios y gestión de actas. Se integra con la arquitectura modular de contenidos mediante el sistema `content_registry`.

---

## 1. Objetivos del componente

- Configurar, dentro de un programa, cuántas horas de asesoría están disponibles para una empresa.
- Mostrar ese acceso como un contenido dentro del orden del programa.
- Permitir agendamiento de sesiones con asesores, sincronizado con Google Calendar.
- Generar tareas de reporte (actas) para los asesores.
- Permitir creación manual de actas si la sesión ocurrió por otro medio.
- Gestionar la asignación de asesores a empresas y programas.

---

## 2. Tablas y Relaciones

### 2.1. Tabla `advisory_sessions` (esto ya se implementó)
Contiene la configuración de cada tipo de sesión.
```sql
CREATE TABLE advisory_sessions (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  duration INTEGER,
  session_type VARCHAR(50),
  preparation_instructions TEXT,
  advisor_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2. Tabla `advisory_allocations`
Define cuántas horas de asesoría tiene una empresa dentro de un módulo.
```sql
CREATE TABLE advisory_allocations (
  id UUID PRIMARY KEY,
  program_module_id UUID REFERENCES program_modules(id),
  company_id UUID REFERENCES companies(id),
  total_minutes INTEGER,
  used_minutes INTEGER DEFAULT 0
);
```

### 2.3. Tabla `advisory_bookings`
Almacena las sesiones agendadas con horario y Google Calendar.
```sql
CREATE TABLE advisory_bookings (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  advisor_id UUID REFERENCES advisors(id),
  session_id UUID REFERENCES advisory_sessions(id),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  google_event_id VARCHAR(255),
  created_by UUID REFERENCES user_profiles(id)
);
```

### 2.4. Tabla `advisory_reports`
Actas de las sesiones, diligenciadas por los asesores.
```sql
CREATE TABLE advisory_reports (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES advisory_bookings(id),
  company_id UUID REFERENCES companies(id),
  advisor_id UUID REFERENCES advisors(id),
  notes TEXT,
  commitments TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  submitted BOOLEAN DEFAULT FALSE
);
```

### 2.5. Tabla `advisors`
Perfil de los asesores con integración a Google Calendar.
```sql
CREATE TABLE advisors (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  name VARCHAR(255),
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
```

La tabla `advisors` está directamente relacionada con `user_profiles` a través del campo `user_id`, lo que permite:
- Mantener la autenticación y gestión de permisos en el sistema principal
- Extender la información básica del usuario con datos específicos del rol de asesor
- Facilitar la transición entre diferentes roles (un usuario puede ser asesor y también tener otros roles)

### 2.6. Tabla `advisor_assignments`
Define qué asesor puede atender a qué empresa y en qué programa.
```sql
CREATE TABLE advisor_assignments (
  id UUID PRIMARY KEY,
  advisor_id UUID REFERENCES advisors(id),
  company_id UUID REFERENCES companies(id),
  program_id UUID REFERENCES programs(id)
);
```

---

## 3. Integración con el gestor de contenidos

- Las sesiones de asesoría se crean como entradas en `advisory_sessions`.
- Cada sesión se indexa en `content_registry` con `content_type = 'advisory_session'`.
- Luego se asigna a una etapa del programa a través de `program_module_contents`.
- El frontend puede renderizarlo como un bloque con opción de agendar y ver saldo de horas.

---

## 4. Flujo de agendamiento y reportes

1. El usuario llega a un contenido tipo `advisory_session`.
2. Ve las instrucciones, tipo de sesión y botón para agendar.
3. El sistema consulta la disponibilidad del asesor asignado.
4. Al seleccionar el horario, se crea evento en Google Calendar y entrada en `advisory_bookings`.
5. Se asigna tarea pendiente para diligenciar acta (`advisory_reports`).
6. El asesor puede acceder a sus sesiones, actas pendientes y crear manualmente nuevas actas si fue necesario.

---

## 5. Consideraciones técnicas

### 5.1. Integración con Google Calendar

- ✅ Usar OAuth2 para que el asesor sincronice su cuenta de Google.
- ✅ Gestionar tokens de acceso y refresco desde `advisors.calendar_sync_token` y `advisors.calendar_refresh_token`.
- ✅ Implementar mecanismos de refresco automático de tokens cuando expiren.
- ✅ Sincronización bidireccional de eventos entre la plataforma y Google Calendar.
- ⏳ Considerar usar Edge Functions o cron jobs para manejar eventos o refrescar datos de calendario.

### 5.2. Gestión de disponibilidad

- ✅ Calcular la disponibilidad real del asesor basada en sus eventos de Google Calendar.
- ✅ Permitir configuración de horarios laborales y duración de slots por parte del asesor.
- ✅ Manejar conflictos de horario y solapamientos entre eventos.
- ⏳ Optimizar consultas para mejorar rendimiento con muchos eventos.

### 5.3. Integración con el sistema

- ⏳ Adaptar `@admin/content-manager` para que soporte este nuevo tipo de contenido con lógica específica.
- ✅ Implementar componentes reutilizables para la gestión de disponibilidad y reservas.

---

## 6. Integración con el módulo de administrador

### 6.1. Gestión de asesores
El módulo de administrador existente debe ampliarse para incluir:
- Una sección para crear y gestionar perfiles de asesores
- Funcionalidad para asignar el rol de asesor a usuarios existentes
- Interfaz para asignar asesores a empresas y programas específicos
- Visualización del estado de disponibilidad de los asesores

### 6.2. Ajustes en UserManager
El componente UserManager actual debe modificarse para:
- Incluir una opción para designar a un usuario como asesor
- Permitir la creación del perfil de asesor asociado al usuario
- Proporcionar acceso a la configuración de Google Calendar

---

## 7. Interfaz de usuario para asesores

### 7.1. Panel de asesor
Se debe implementar un panel específico para asesores que incluya:
- Vista de calendario con sesiones programadas
- Lista de empresas asignadas
- Sección de actas pendientes por completar
- Historial de sesiones realizadas
- Perfil personal configurable

### 7.2. Experiencia de usuario
- El asesor debe poder acceder a información relevante de las empresas que asesora
- Interfaz para completar actas post-sesión
- Gestión de disponibilidad horaria
- Notificaciones de nuevas sesiones agendadas

---

## 8. Recomendaciones de implementación

- Pilotear primero en un programa específico.

---

## 9. Estado actual de implementación

### 9.1. Integración con Google Calendar

**Completado:**
- ✅ Configuración de OAuth2 para autenticación con Google Calendar
- ✅ Implementación del flujo de autorización y callback
- ✅ Almacenamiento seguro de tokens en la base de datos
- ✅ Refresco automático de tokens expirados
- ✅ Sincronización bidireccional de eventos
- ✅ Componente para mostrar el estado de conexión con Google Calendar

**Pendiente:**
- ⏳ Pruebas exhaustivas con múltiples asesores y escenarios
- ⏳ Implementación de Edge Functions para sincronización periódica
- ⏳ Manejo de webhooks para actualizaciones en tiempo real

### 9.2. Gestión de disponibilidad

**Completado:**
- ✅ Componente `AdvisorAvailabilityManager` para gestionar disponibilidad
- ✅ Configuración de horarios laborales y duración de slots
- ✅ Cálculo de disponibilidad basado en eventos de Google Calendar
- ✅ Visualización de eventos y slots disponibles

**Pendiente:**
- ⏳ Optimización de rendimiento para calendarios con muchos eventos
- ⏳ Mejoras en la interfaz de usuario para selección de horarios
- ⏳ Implementación de vistas de calendario avanzadas (mes, semana, día)

### 9.3. Sistema de notificaciones

**Completado:**
- ✅ Notificaciones por correo electrónico a través de Google Calendar
- ✅ Recordatorios automáticos para sesiones programadas
- ✅ Alertas de cancelación o reprogramación

**Pendiente:**
- ⏳ Componentes de visualización de notificaciones en la plataforma
- ⏳ Panel de configuración de preferencias de notificación
- ⏳ Notificaciones para nuevas asignaciones y reportes pendientes

### 9.4. Administración de asesores

**Completado:**
- ✅ Estructura básica para la gestión de perfiles de asesores
- ✅ Configuración de Google Calendar en el perfil del asesor

**Pendiente:**
- ⏳ Mejoras en el componente `UserManager` para designar usuarios como asesores
- ⏳ Panel completo de administración de asesores
- ⏳ Interfaz para asignación masiva de asesores a empresas y programas

### 9.5. Próximos pasos prioritarios

1. Completar las pruebas de la integración con Google Calendar con credenciales reales
2. Desarrollar el panel de administración de asesores
3. Implementar componentes de visualización de notificaciones
4. Optimizar el rendimiento de las consultas de disponibilidad
5. Implementar Edge Functions para sincronización periódica
- Validar integración completa con agendamiento y reportes.
- Establecer dashboard de seguimiento para administradores y asesores.

---

Este componente está diseñado para integrarse sin fricción al sistema actual y abrir la puerta a una experiencia más personalizada, rastreable y conectada dentro del proceso formativo.
