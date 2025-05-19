/**
 * Script de prueba para la integración con Google Calendar
 * 
 * Este script verifica los siguientes aspectos de la integración:
 * 1. Generación de URL de autorización
 * 2. Intercambio de código por tokens
 * 3. Almacenamiento de tokens en la base de datos
 * 4. Refresco automático de tokens
 * 5. Creación, actualización y eliminación de eventos
 * 6. Sincronización bidireccional
 * 
 * Para ejecutar este script:
 * 1. Asegúrate de tener configuradas las variables de entorno correctas
 * 2. Ejecuta: ts-node googleCalendarIntegrationTest.ts
 */

import googleCalendarService from '../googleCalendarService';
import { advisoryService } from '../advisoryService';
import { supabase } from '../../../lib/supabase';

// Configuración de prueba
const TEST_ADVISOR_ID = ''; // Completar con un ID de asesor válido
const TEST_CODE = ''; // Completar con un código de autorización válido (opcional)

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Función para imprimir mensajes formateados
const log = {
  info: (message: string) => console.log(`${colors.blue}[INFO]${colors.reset} ${message}`),
  success: (message: string) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`),
  error: (message: string) => console.log(`${colors.red}[ERROR]${colors.reset} ${message}`),
  warning: (message: string) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`),
  separator: () => console.log('\n' + '-'.repeat(80) + '\n')
};

// Función principal de prueba
async function runTests() {
  log.info('Iniciando pruebas de integración con Google Calendar');
  log.separator();

  // Verificar que el asesor existe
  try {
    log.info(`Verificando asesor con ID: ${TEST_ADVISOR_ID}`);
    const advisor = await advisoryService.getAdvisorById(TEST_ADVISOR_ID);
    
    if (!advisor) {
      log.error('No se encontró el asesor con el ID proporcionado');
      return;
    }
    
    log.success(`Asesor encontrado: ${advisor.name}`);
    log.info(`Email: ${advisor.email}`);
    log.info(`Estado de conexión: ${advisor.calendar_sync_token ? 'Conectado' : 'No conectado'}`);
  } catch (error) {
    log.error(`Error al verificar asesor: ${error}`);
    return;
  }
  
  log.separator();

  // Prueba 1: Generar URL de autorización
  try {
    log.info('Prueba 1: Generando URL de autorización');
    const authUrl = googleCalendarService.getAuthorizationUrl();
    log.success(`URL generada: ${authUrl}`);
  } catch (error) {
    log.error(`Error al generar URL de autorización: ${error}`);
  }
  
  log.separator();

  // Prueba 2: Verificar estado de conexión
  try {
    log.info('Prueba 2: Verificando estado de conexión con Google Calendar');
    const status = await googleCalendarService.isCalendarConnected(TEST_ADVISOR_ID);
    
    if (status.connected) {
      log.success('El calendario está conectado');
      log.info(`Email de Google: ${status.email}`);
      log.info(`Última sincronización: ${status.lastSynced}`);
    } else {
      log.warning('El calendario no está conectado');
      if (status.error) {
        log.error(`Error: ${status.error}`);
      }
    }
  } catch (error) {
    log.error(`Error al verificar estado de conexión: ${error}`);
  }
  
  log.separator();

  // Si se proporcionó un código de autorización, probar el intercambio por tokens
  if (TEST_CODE) {
    try {
      log.info('Prueba 3: Intercambiando código por tokens');
      const tokens = await googleCalendarService.exchangeCodeForTokens(TEST_CODE);
      
      log.success('Tokens obtenidos correctamente');
      log.info(`Access Token: ${tokens.access_token ? 'Presente' : 'Ausente'}`);
      log.info(`Refresh Token: ${tokens.refresh_token ? 'Presente' : 'Ausente'}`);
      log.info(`Expires In: ${tokens.expires_in} segundos`);
      
      // Guardar tokens
      log.info('Guardando tokens en la base de datos');
      const saved = await googleCalendarService.saveTokensForAdvisor(TEST_ADVISOR_ID, tokens);
      
      if (saved) {
        log.success('Tokens guardados correctamente');
      } else {
        log.error('Error al guardar tokens');
      }
    } catch (error) {
      log.error(`Error en el proceso de intercambio de código: ${error}`);
    }
    
    log.separator();
  }

  // Prueba 4: Obtener token de acceso válido
  try {
    log.info('Prueba 4: Obteniendo token de acceso válido');
    const accessToken = await googleCalendarService.getValidAccessToken(TEST_ADVISOR_ID);
    
    if (accessToken) {
      log.success('Token de acceso válido obtenido');
    } else {
      log.error('No se pudo obtener un token de acceso válido');
    }
  } catch (error) {
    log.error(`Error al obtener token de acceso: ${error}`);
  }
  
  log.separator();

  // Prueba 5: Listar eventos del calendario
  try {
    log.info('Prueba 5: Listando eventos del calendario');
    
    // Definir rango de fechas (próximos 7 días)
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    log.info(`Rango de fechas: ${now.toISOString()} - ${nextWeek.toISOString()}`);
    
    const events = await googleCalendarService.listEvents({
      advisorId: TEST_ADVISOR_ID,
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString()
    });
    
    if (events && events.length > 0) {
      log.success(`Se encontraron ${events.length} eventos`);
      
      // Mostrar detalles de los primeros 3 eventos
      const eventsToShow = events.slice(0, 3);
      eventsToShow.forEach((event, index) => {
        log.info(`Evento ${index + 1}:`);
        log.info(`  ID: ${event.id}`);
        log.info(`  Título: ${event.summary}`);
        log.info(`  Inicio: ${event.start.dateTime || event.start.date}`);
        log.info(`  Fin: ${event.end.dateTime || event.end.date}`);
      });
      
      if (events.length > 3) {
        log.info(`... y ${events.length - 3} eventos más`);
      }
    } else {
      log.warning('No se encontraron eventos en el rango de fechas especificado');
    }
  } catch (error) {
    log.error(`Error al listar eventos: ${error}`);
  }
  
  log.separator();

  // Prueba 6: Crear un evento de prueba
  let testEventId: string | null = null;
  try {
    log.info('Prueba 6: Creando evento de prueba');
    
    // Definir fechas para el evento (mañana a las 10:00 AM, duración 1 hora)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(11, 0, 0, 0);
    
    log.info(`Fecha del evento: ${tomorrow.toISOString()} - ${tomorrowEnd.toISOString()}`);
    
    const eventResult = await googleCalendarService.createEvent({
      advisorId: TEST_ADVISOR_ID,
      summary: '[PRUEBA] Evento de prueba de integración',
      description: 'Este es un evento creado automáticamente para probar la integración con Google Calendar',
      startDateTime: tomorrow.toISOString(),
      endDateTime: tomorrowEnd.toISOString(),
      attendees: [
        { email: 'test@example.com', displayName: 'Usuario de Prueba' }
      ],
      colorId: '7', // Azul
      sendNotifications: false
    });
    
    if (eventResult && eventResult.id) {
      testEventId = eventResult.id;
      log.success(`Evento creado correctamente con ID: ${testEventId}`);
    } else {
      log.error('Error al crear evento de prueba');
    }
  } catch (error) {
    log.error(`Error al crear evento: ${error}`);
  }
  
  log.separator();

  // Prueba 7: Actualizar el evento creado (si se creó correctamente)
  if (testEventId) {
    try {
      log.info(`Prueba 7: Actualizando evento con ID: ${testEventId}`);
      
      const updated = await googleCalendarService.updateEvent({
        advisorId: TEST_ADVISOR_ID,
        eventId: testEventId,
        summary: '[PRUEBA ACTUALIZADA] Evento de prueba de integración',
        description: 'Este evento ha sido actualizado como parte de la prueba de integración',
        colorId: '10' // Verde
      });
      
      if (updated) {
        log.success('Evento actualizado correctamente');
      } else {
        log.error('Error al actualizar evento');
      }
    } catch (error) {
      log.error(`Error al actualizar evento: ${error}`);
    }
    
    log.separator();
  }

  // Prueba 8: Eliminar el evento creado (si se creó correctamente)
  if (testEventId) {
    try {
      log.info(`Prueba 8: Eliminando evento con ID: ${testEventId}`);
      
      const deleted = await googleCalendarService.deleteEvent({
        advisorId: TEST_ADVISOR_ID,
        eventId: testEventId
      });
      
      if (deleted) {
        log.success('Evento eliminado correctamente');
      } else {
        log.error('Error al eliminar evento');
      }
    } catch (error) {
      log.error(`Error al eliminar evento: ${error}`);
    }
    
    log.separator();
  }

  // Prueba 9: Verificar disponibilidad
  try {
    log.info('Prueba 9: Verificando disponibilidad del asesor');
    
    // Definir fecha para verificar disponibilidad (mañana)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    log.info(`Fecha para verificar disponibilidad: ${tomorrow.toDateString()}`);
    
    const availability = await advisoryService.getAdvisorAvailability(TEST_ADVISOR_ID, tomorrow);
    
    if (availability && availability.length > 0) {
      log.success(`Se encontraron ${availability.length} slots de disponibilidad`);
      
      // Contar slots disponibles y ocupados
      const availableSlots = availability.filter(slot => slot.available).length;
      const unavailableSlots = availability.length - availableSlots;
      
      log.info(`Slots disponibles: ${availableSlots}`);
      log.info(`Slots ocupados: ${unavailableSlots}`);
      
      // Mostrar algunos slots de ejemplo
      const slotsToShow = availability.slice(0, 3);
      slotsToShow.forEach((slot, index) => {
        log.info(`Slot ${index + 1}:`);
        log.info(`  Inicio: ${slot.start.toLocaleTimeString()}`);
        log.info(`  Fin: ${slot.end.toLocaleTimeString()}`);
        log.info(`  Disponible: ${slot.available ? 'Sí' : 'No'}`);
      });
    } else {
      log.warning('No se encontraron slots de disponibilidad para la fecha especificada');
    }
  } catch (error) {
    log.error(`Error al verificar disponibilidad: ${error}`);
  }
  
  log.separator();
  
  log.info('Pruebas de integración completadas');
}

// Ejecutar las pruebas
runTests()
  .then(() => {
    console.log('\nPruebas finalizadas');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error en las pruebas:', error);
    process.exit(1);
  });
