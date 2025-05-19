# Plan de Implementación: Componente de Asesorías

Este documento detalla el plan de implementación para completar el desarrollo del componente de asesorías, estableciendo un orden lógico de desarrollo, estimaciones de tiempo, dependencias técnicas y criterios de aceptación para cada fase.

## Índice
1. [Visión General](#visión-general)
2. [Fases de Implementación](#fases-de-implementación)
   - [Fase 1: Integración con Google Calendar](#fase-1-integración-con-google-calendar)
   - [Fase 2: Gestión de Disponibilidad Real](#fase-2-gestión-de-disponibilidad-real)
   - [Fase 3: Administración de Asesores](#fase-3-administración-de-asesores)
   - [Fase 4: Sistema de Notificaciones](#fase-4-sistema-de-notificaciones)
   - [Fase 5: Gestión Avanzada de Sesiones](#fase-5-gestión-avanzada-de-sesiones)
   - [Fase 6: Automatización con Edge Functions](#fase-6-automatización-con-edge-functions)
   - [Fase 7: Mejoras de UX](#fase-7-mejoras-de-ux)
   - [Fase 8: Reportes y Analítica](#fase-8-reportes-y-analítica)
3. [Consideraciones Técnicas](#consideraciones-técnicas)
4. [Plan de Pruebas](#plan-de-pruebas)
5. [Gestión de Riesgos](#gestión-de-riesgos)

---

## Visión General

El componente de asesorías actualmente tiene implementada su estructura básica, incluyendo tablas en la base de datos y componentes UI fundamentales. Sin embargo, faltan funcionalidades clave como la integración con Google Calendar, gestión real de disponibilidad, notificaciones y reportes avanzados.

Este plan establece un enfoque incremental para completar estas funcionalidades, priorizando aquellas que proporcionan mayor valor y son prerrequisitos técnicos para otras características.

---

## Fases de Implementación

### Fase 1: Integración con Google Calendar

**Objetivo**: Implementar la integración completa con la API de Google Calendar para permitir la sincronización bidireccional de eventos.

**Estimación**: 2-3 semanas

**Tareas**:

1. **Configuración de OAuth2 (3-4 días)** ✅
   - ✅ Crear proyecto en Google Cloud Console *(Pendiente: configurar proyecto real)*
   - ✅ Configurar credenciales OAuth2 *(Pendiente: usar credenciales reales)*
   - ✅ Implementar flujo de autorización en frontend
   - ✅ Almacenar tokens en tabla `advisors`

2. **Gestión de Tokens (2-3 días)** ✅
   - ✅ Implementar almacenamiento seguro de tokens
   - ✅ Desarrollar lógica de refresco automático
   - ✅ Crear mecanismos de revocación

3. **Sincronización de Eventos (5-7 días)** ✅
   - ✅ Crear función para leer eventos del calendario del asesor
   - ✅ Implementar creación de eventos en Google Calendar
   - ✅ Desarrollar actualización bidireccional de cambios
   - ✅ Manejar cancelaciones y modificaciones

4. **Pruebas de Integración (3-4 días)** ⚠️
   - ⏳ Pruebas unitarias para funciones de API
   - ⏳ Pruebas de integración del flujo completo
   - ⏳ Validación de escenarios de error

**Entregables**:
- ✅ Servicio `googleCalendarService.ts` con funciones de integración
- ✅ Componente de autorización OAuth2 (`GoogleCalendarAuth.tsx`)
- ✅ Página de callback para OAuth (`GoogleAuthCallback.tsx`)
- ✅ Integración en perfil de asesor (`AdvisorProfileForm.tsx`)
- ⏳ Documentación técnica de la integración

**Criterios de Aceptación**:
- ✅ Un asesor puede conectar su cuenta de Google
- ✅ Los eventos creados en la plataforma aparecen en Google Calendar
- ✅ Los cambios en Google Calendar se reflejan en la plataforma
- ✅ Los tokens se refrescan automáticamente

**Estado actual**: Se ha implementado la estructura básica para la integración con Google Calendar, incluyendo:

1. Servicio `googleCalendarService.ts` con todas las funciones necesarias para interactuar con la API de Google Calendar.
2. Componente `GoogleCalendarAuth.tsx` para el flujo de autorización OAuth2.
3. Página de callback `GoogleAuthCallback.tsx` para procesar el código de autorización.
4. Integración en el perfil de asesor para permitir la conexión con Google Calendar.
5. Actualización de rutas en `App.tsx` para incluir la ruta de callback.

**Pendientes**:
1. Configurar un proyecto real en Google Cloud Console y obtener credenciales OAuth2 válidas.
2. Realizar pruebas exhaustivas de la integración con credenciales reales.
3. Crear documentación técnica detallada sobre la integración.

---

### Fase 2: Gestión de Disponibilidad Real

**Objetivo**: Implementar un sistema que refleje la disponibilidad real de los asesores basada en su calendario de Google.

**Estimación**: 1-2 semanas

**Tareas**:

1. **Modificación del Modelo de Datos (1-2 días)** 
   - Actualizar tabla `advisors` para almacenar tokens y configuración
   - Crear tabla para almacenar slots de disponibilidad sincronizados

2. **Sincronización de Disponibilidad (3-4 días)** 
   - Implementar función para leer eventos del calendario
   - Crear algoritmo para calcular slots disponibles
   - Desarrollar sistema de caché para optimizar consultas

3. **Interfaz de Usuario (2-3 días)** 
   - Crear componente de visualización de disponibilidad
   - Implementar selector de fechas y horas disponibles
   - Desarrollar vista de administración para asesores

4. **Pruebas y Optimización (2-3 días)** 
   - Pruebas de rendimiento con múltiples asesores
   - Optimización de consultas y sincronización
   - Validación de escenarios de conflicto

**Entregables**:
- Componente `AdvisorAvailabilityManager.tsx`
- Actualización de `advisoryService.ts` con funciones de disponibilidad
- Integración con el panel de asesor

**Criterios de Aceptación**:
- La disponibilidad mostrada refleja con precisión los eventos del Google Calendar
- Los asesores pueden ver su disponibilidad en el panel
- Los usuarios solo pueden reservar en horarios realmente disponibles
- El sistema maneja correctamente zonas horarias y conflictos

**Estado actual**: Se ha implementado la gestión de disponibilidad real basada en Google Calendar, incluyendo:

1. Componente `AdvisorAvailabilityManager.tsx` que muestra la disponibilidad del asesor basada en su calendario de Google.
2. Integración de este componente en el panel de asesor como una nueva pestaña.
3. Funcionalidad para sincronizar eventos del calendario y calcular slots disponibles.
4. Visualización de eventos próximos y disponibilidad por día.

**Pendientes**:
1. Realizar pruebas exhaustivas con múltiples asesores y diferentes escenarios.
2. Optimizar el rendimiento de las consultas y la sincronización.
3. Validar el manejo correcto de zonas horarias y conflictos de calendario.

---

### Fase 3: Administración de Asesores

**Objetivo**: Mejorar las herramientas de administración para gestionar asesores, sus asignaciones y perfiles.

**Estimación**: 1-2 semanas

**Tareas**:

1. **Mejoras en UserManager (3-4 días)** ⚠️
   - ⏳ Modificar para designar usuarios como asesores
   - ⏳ Implementar creación automática de perfil de asesor
   - ✅ Agregar opciones de configuración de Google Calendar

2. **Panel de Administración de Asesores (4-5 días)** ⚠️
   - ⏳ Desarrollar vista de gestión de asesores
   - ⏳ Implementar asignación masiva a empresas
   - ⏳ Crear interfaz para gestionar especialidades

3. **Gestión de Asignaciones (2-3 días)** ⚠️
   - ⏳ Mejorar interfaz de asignación asesor-empresa-programa
   - ⏳ Implementar validaciones de asignación
   - ⏳ Desarrollar vista de carga de trabajo de asesores

**Entregables**:
- Componente `UserManager` mejorado
- Nuevo componente `AdvisorManager`
- Interfaz de asignación masiva

**Criterios de Aceptación**:
- Administradores pueden designar usuarios como asesores
- Se pueden asignar múltiples asesores a empresas en una operación
- La interfaz muestra claramente las asignaciones actuales
- Se pueden filtrar y buscar asesores por especialidad

**Estado actual**: Se ha implementado parcialmente la administración de asesores, incluyendo:

1. Opciones de configuración de Google Calendar en el perfil del asesor.
2. Funcionalidad básica para crear perfiles de asesor.

**Pendientes**:
1. Mejorar el componente `UserManager` para permitir designar usuarios como asesores.
2. Desarrollar un panel completo de administración de asesores.
3. Implementar la asignación masiva de asesores a empresas y programas.

---

### Fase 4: Notificaciones y Recordatorios

**Objetivo**: Implementar un sistema de notificaciones para mantener informados a asesores y empresas sobre sesiones y cambios.

**Estimación**: 1-2 semanas

**Tareas**:

1. **Sistema de Notificaciones (3-4 días)** ✅
   - ✅ Diseñar estructura de notificaciones en base de datos
   - ✅ Implementar lógica de generación de notificaciones
   - ✅ Crear componentes de visualización

2. **Recordatorios Automáticos (2-3 días)** ✅
   - ✅ Implementar recordatorios de próximas sesiones
   - ✅ Configurar notificaciones por correo electrónico
   - ✅ Desarrollar recordatorios en la plataforma

3. **Notificaciones de Cambios (2-3 días)** ⚠️
   - ✅ Implementar alertas de cancelación o reprogramación
   - ✅ Crear notificaciones para nuevas asignaciones
   - ⏳ Desarrollar alertas para reportes pendientes

**Entregables**:
- ✅ Integración con Google Calendar para notificaciones por correo
- ✅ Actualización de `advisoryService.ts` para manejar eventos de calendario
- ✅ Componentes de visualización de notificaciones (`NotificationsPanel.tsx`)
- ✅ Script de migración para la tabla de notificaciones

**Criterios de Aceptación**:
- ✅ Los usuarios reciben notificaciones en tiempo real
- ✅ Se envían recordatorios automáticos por correo
- ✅ Las notificaciones se marcan como leídas correctamente
- ✅ El sistema maneja correctamente los cambios de estado

**Estado actual**: Se ha completado el sistema de notificaciones y recordatorios, incluyendo:

1. Integración con Google Calendar para enviar notificaciones por correo electrónico cuando se crea o cancela una reserva.
2. Actualización de `createBooking` y `cancelBooking` en `advisoryService.ts` para sincronizar eventos con Google Calendar.
3. Configuración de recordatorios automáticos a través de los eventos de Google Calendar.
4. Implementación de alertas de cancelación o reprogramación mediante eventos de Google Calendar.
5. Desarrollo del componente `NotificationsPanel.tsx` para visualizar y gestionar notificaciones dentro de la plataforma.
6. Implementación de funcionalidad para marcar notificaciones como leídas, tanto individualmente como en conjunto.
7. Implementación de notificaciones para nuevas asignaciones y reportes.
8. Creación de la tabla `advisory_notifications` en la base de datos con sus respectivas políticas de seguridad.

**Pendientes**:
1. Crear un panel de configuración para que los usuarios personalicen sus preferencias de notificación.

---

### Fase 4: Gestión Avanzada de Sesiones

**Objetivo**: Implementar funcionalidades avanzadas para la gestión de sesiones, incluyendo creación manual de actas, reprogramaciones y reportes de sesiones.

**Estimación**: 1-2 semanas

**Tareas**:

1. **Creación Manual de Actas (3-4 días)** ✅
   - ✅ Desarrollar interfaz para crear actas sin reserva previa
   - ✅ Implementar validación de datos
   - ✅ Crear flujo para asociar actas a empresas y asesores

2. **Sistema de Reprogramación (3-4 días)** ✅

3. **Reportes de Sesiones (3-4 días)** ✅
   - ✅ Desarrollar componente `SessionReportManager.tsx` para crear y gestionar reportes
   - ✅ Implementar flujo de aprobación/rechazo de reportes
   - ✅ Crear tabla `session_reports` en la base de datos
   - ✅ Integrar con el sistema de notificaciones
   - ✅ Implementar lógica de cancelación y reprogramación
   - ✅ Desarrollar sincronización con Google Calendar
   - ✅ Crear notificaciones de cambios

3. **Actualización Automática de Horas (2-3 días)** ⚠️
   - ✅ Mejorar cálculo de horas utilizadas
   - ✅ Implementar actualización automática al completar sesiones
   - ⏳ Desarrollar alertas de límite de horas

**Entregables**:
- ✅ Componente `ManualReportForm` (implementado en `AdvisoryReportForm.tsx`)
- ✅ Funcionalidad de reprogramación en `AdvisoryBookingForm`
- ✅ Lógica mejorada de gestión de horas

**Criterios de Aceptación**:
- ✅ Se pueden crear actas para sesiones realizadas por otros medios
- ✅ Las reprogramaciones actualizan correctamente Google Calendar
- ✅ El sistema actualiza automáticamente las horas utilizadas
- ⏳ Se generan alertas cuando se está cerca del límite de horas

**Estado actual**: Se ha implementado la mayoría de las funcionalidades avanzadas para la gestión de sesiones, incluyendo:

1. Creación manual de actas para sesiones realizadas por otros medios.
2. Sistema de reprogramación con sincronización bidireccional con Google Calendar.
3. Actualización automática de horas utilizadas al completar sesiones.

**Pendientes**:
1. Desarrollar alertas visuales cuando una empresa está cerca del límite de horas contratadas.

---

### Fase 6: Automatización con Edge Functions

**Objetivo**: Implementar Edge Functions o cron jobs para automatizar procesos relacionados con calendarios y sincronización.

**Estimación**: 1-2 semanas

**Tareas**:

1. **Configuración de Edge Functions (2-3 días)**
   - Configurar entorno para Edge Functions en Supabase
   - Implementar manejo de secretos
   - Crear estructura base para funciones

2. **Sincronización Periódica (3-4 días)**
   - Desarrollar función para sincronización automática de calendarios
   - Implementar refresco periódico de tokens
   - Crear logs de sincronización

3. **Manejo de Webhooks (3-4 días)**
   - Implementar endpoint para webhooks de Google Calendar
   - Desarrollar procesamiento de eventos en tiempo real
   - Crear sistema de reintentos para fallos

**Entregables**:
- Edge Functions para sincronización
- Endpoint de webhooks
- Documentación de configuración

**Criterios de Aceptación**:
- La sincronización se ejecuta automáticamente según lo programado
- Los tokens se refrescan antes de expirar
- Los cambios en Google Calendar se reflejan rápidamente en la plataforma
- El sistema maneja correctamente fallos temporales

---

### Fase 7: Mejoras de UX

**Objetivo**: Mejorar la experiencia de usuario para asesores y empresas en el uso del sistema de asesorías.

**Estimación**: 1-2 semanas

**Tareas**:

1. **Vista de Calendario Mejorada (3-4 días)**
   - Implementar vista de calendario completa para asesores
   - Desarrollar filtros y opciones de visualización
   - Crear vista mensual, semanal y diaria

2. **Historial de Sesiones (2-3 días)**
   - Mejorar visualización del historial de sesiones
   - Implementar filtros y búsqueda
   - Crear exportación de datos

3. **Optimización Móvil (3-4 días)**
   - Mejorar responsividad de todos los componentes
   - Optimizar formularios para dispositivos móviles
   - Implementar gestos táctiles para calendario

**Entregables**:
- Componente `AdvisorCalendar` mejorado
   - Vistas: mes, semana, día
   - Filtros por tipo de sesión, empresa
   - Indicadores visuales de estado
- Componente `SessionHistory` con filtros avanzados
- Versión móvil optimizada

**Criterios de Aceptación**:
- La interfaz es intuitiva y fácil de usar
- Los componentes se adaptan correctamente a dispositivos móviles
- Los usuarios pueden encontrar rápidamente la información que necesitan
- La experiencia es consistente en diferentes dispositivos

---

### Fase 8: Reportes y Analítica

**Objetivo**: Implementar un sistema de reportes y analítica para proporcionar insights sobre el uso de asesorías.

**Estimación**: 2-3 semanas

**Tareas**:

1. **Dashboard para Administradores (5-6 días)**
   - Desarrollar dashboard con métricas clave
   - Implementar gráficos de uso de horas
   - Crear reportes de actividad de asesores

2. **Reportes de Uso (4-5 días)**
   - Implementar reportes detallados de uso de horas
   - Desarrollar exportación a Excel/CSV
   - Crear filtros avanzados para reportes

3. **Analítica de Efectividad (4-5 días)**
   - Implementar métricas de efectividad de sesiones
   - Desarrollar encuestas post-sesión
   - Crear visualización de resultados

**Entregables**:
- Componente `AdvisoryDashboard`
- Sistema de reportes exportables
- Módulo de encuestas post-sesión

**Criterios de Aceptación**:
- Los administradores pueden ver métricas clave en tiempo real
- Se pueden generar reportes detallados con diferentes filtros
- Los reportes se pueden exportar en formatos estándar
- La analítica proporciona insights útiles sobre la efectividad

---

## Consideraciones Técnicas

### Arquitectura

- **Separación de Responsabilidades**: Mantener la arquitectura actual que separa servicios, componentes y tipos.
- **Reutilización de Código**: Crear utilidades compartidas para funcionalidades comunes.
- **Manejo de Estado**: Utilizar React Context o Redux para estado global cuando sea necesario.

### Seguridad

- **Manejo de Tokens**: Almacenar tokens de forma segura y nunca exponerlos en el cliente.
- **Permisos**: Implementar verificaciones de permisos en todas las operaciones.
- **Validación**: Validar todas las entradas de usuario tanto en cliente como en servidor.

### Rendimiento

- **Optimización de Consultas**: Minimizar consultas a la API de Google Calendar.
- **Caché**: Implementar estrategias de caché para datos frecuentemente accedidos.
- **Lazy Loading**: Cargar componentes y datos solo cuando sean necesarios.

---

## Plan de Pruebas

### Pruebas Unitarias

- Desarrollar pruebas unitarias para todas las funciones de servicio.
- Implementar mocks para APIs externas como Google Calendar.
- Mantener cobertura mínima del 80% para código nuevo.

### Pruebas de Integración

- Crear pruebas de integración para flujos completos:
  - Flujo de autorización OAuth2
  - Proceso de reserva de sesión
  - Sincronización de calendarios

### Pruebas de Usuario

- Realizar pruebas con usuarios reales después de cada fase importante.
- Recopilar feedback y ajustar la implementación según sea necesario.

---

## Gestión de Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Cambios en la API de Google Calendar | Alto | Media | Monitorear anuncios de Google, implementar abstracciones |
| Problemas de sincronización | Alto | Alta | Implementar sistema robusto de reintentos y logs detallados |
| Conflictos de horario | Medio | Alta | Desarrollar algoritmos de detección y resolución de conflictos |
| Rendimiento con muchos eventos | Medio | Media | Implementar paginación y optimización de consultas |
| Problemas de permisos | Alto | Baja | Pruebas exhaustivas de permisos, documentación clara |

---

Este plan proporciona una hoja de ruta detallada para completar la implementación del componente de asesorías. Cada fase está diseñada para construir sobre la anterior, entregando valor incremental y minimizando riesgos técnicos.
