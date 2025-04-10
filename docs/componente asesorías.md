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

### 2.1. Tabla `advisory_sessions`
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
  google_account_email VARCHAR(255),
  calendar_sync_token TEXT,
  available BOOLEAN DEFAULT TRUE
);
```

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

- Usar OAuth2 para que el asesor sincronice su cuenta de Google.
- Gestionar tokens de acceso y refresco desde `advisors.calendar_sync_token`.
- Considerar usar Edge Functions o cron jobs para manejar eventos o refrescar datos de calendario.
- Adaptar `@admin/content-manager` para que soporte este nuevo tipo de contenido con lógica específica.

---

## 6. Recomendaciones de implementación

- Pilotear primero en un programa específico.
- Validar integración completa con agendamiento y reportes.
- Establecer dashboard de seguimiento para administradores y asesores.

---

Este componente está diseñado para integrarse sin fricción al sistema actual y abrir la puerta a una experiencia más personalizada, rastreable y conectada dentro del proceso formativo.

