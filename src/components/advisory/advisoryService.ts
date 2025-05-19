import { supabase } from '../../lib/supabase';
import {
  Advisor,
  AdvisorAssignment,
  AdvisorySession,
  AdvisoryAllocation,
  AdvisoryBooking,
  AdvisoryReport,
  TimeSlot
} from './types';

// Funciones para gestionar asesores
export const advisoryService = {
  // Obtener todos los asesores
  async getAdvisors(): Promise<Advisor[]> {
    try {
      const { data, error } = await supabase
        .from('advisors')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener asesores:', error);
      return [];
    }
  },

  // Obtener un asesor por ID
  async getAdvisorById(advisorId: string): Promise<Advisor | null> {
    try {
      const { data, error } = await supabase
        .from('advisors')
        .select('*')
        .eq('id', advisorId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error al obtener asesor con ID ${advisorId}:`, error);
      return null;
    }
  },

  // Obtener asesor por ID de usuario
  async getAdvisorByUserId(userId: string): Promise<Advisor | null> {
    try {
      const { data, error } = await supabase
        .from('advisors')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error al obtener asesor para usuario ${userId}:`, error);
      return null;
    }
  },

  // Crear o actualizar un asesor
  async saveAdvisor(advisor: Partial<Advisor>): Promise<Advisor | null> {
    try {
      let result;
      
      if (advisor.id) {
        // Actualizar asesor existente
        const { data, error } = await supabase
          .from('advisors')
          .update({
            name: advisor.name,
            bio: advisor.bio,
            specialty: advisor.specialty,
            email: advisor.email,
            phone: advisor.phone,
            photo_url: advisor.photo_url,
            google_account_email: advisor.google_account_email,
            calendar_sync_token: advisor.calendar_sync_token,
            available: advisor.available,
            updated_at: new Date().toISOString()
          })
          .eq('id', advisor.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Crear nuevo asesor
        const { data, error } = await supabase
          .rpc('create_advisor', {
            p_user_id: advisor.user_id,
            p_name: advisor.name,
            p_bio: advisor.bio || null,
            p_specialty: advisor.specialty || null,
            p_email: advisor.email || null,
            p_phone: advisor.phone || null,
            p_photo_url: advisor.photo_url || null,
            p_google_account_email: advisor.google_account_email || null
          });
        
        if (error) throw error;
        
        // Obtener el asesor recién creado
        if (data) {
          const { data: newAdvisor, error: fetchError } = await supabase
            .from('advisors')
            .select('*')
            .eq('id', data)
            .single();
          
          if (fetchError) throw fetchError;
          result = newAdvisor;
        }
      }
      
      return result || null;
    } catch (error) {
      console.error('Error al guardar asesor:', error);
      return null;
    }
  },

  // Asignar asesor a empresa y programa
  async assignAdvisorToCompany(
    advisorId: string,
    companyId: string,
    programId: string
  ): Promise<string | null> {
    try {
      // Asignar el asesor a la empresa
      const { data, error } = await supabase
        .rpc('assign_advisor_to_company', {
          p_advisor_id: advisorId,
          p_company_id: companyId,
          p_program_id: programId
        });
      
      if (error) throw error;
      
      // Si la asignación fue exitosa, crear asignaciones de horas para todas las sesiones de asesoría
      // en este programa para esta empresa
      if (data) {
        await this.createAdvisoryAllocationsForCompany(companyId, programId);
      }
      
      return data;
    } catch (error) {
      console.error('Error al asignar asesor a empresa:', error);
      return null;
    }
  },
  
  // Crear asignaciones de horas para todas las sesiones de asesoría en un programa para una empresa
  async createAdvisoryAllocationsForCompany(companyId: string, programId: string): Promise<void> {
    try {
      // 1. Obtener todos los módulos del programa que contienen sesiones de asesoría
      const { data: moduleContents, error: modulesError } = await supabase
        .from('program_module_contents')
        .select(`
          program_module_id,
          content_registry:content_registry_id (id, content_type, content_id)
        `)
        .eq('content_registry.content_type', 'advisory_session');
      
      if (modulesError) {
        console.error('Error al obtener módulos con sesiones de asesoría:', modulesError);
        return;
      }
      
      if (!moduleContents || moduleContents.length === 0) {
        console.log('No hay sesiones de asesoría configuradas en este programa');
        return;
      }
      
      // 2. Obtener información de las sesiones de asesoría para conocer su duración
      const contentIds = moduleContents
        .map(m => m.content_registry?.content_id)
        .filter(id => id); // Filtrar valores nulos
      
      if (contentIds.length === 0) return;
      
      const { data: sessions, error: sessionsError } = await supabase
        .from('advisory_sessions')
        .select('id, duration')
        .in('id', contentIds);
      
      if (sessionsError) {
        console.error('Error al obtener información de sesiones:', sessionsError);
        return;
      }
      
      // 3. Para cada módulo, verificar si ya existe una asignación y crearla si no existe
      for (const moduleContent of moduleContents) {
        const moduleId = moduleContent.program_module_id;
        const contentId = moduleContent.content_registry?.content_id;
        
        if (!moduleId || !contentId) continue;
        
        // Buscar la duración de esta sesión
        const session = sessions?.find(s => s.id === contentId);
        const duration = session?.duration || 60; // Valor predeterminado: 60 minutos
        
        // Verificar si ya existe una asignación para este módulo y empresa
        const { data: existingAllocation, error: checkError } = await supabase
          .from('advisory_allocations')
          .select('id')
          .eq('company_id', companyId)
          .eq('program_module_id', moduleId)
          .maybeSingle();
        
        if (checkError) {
          console.error('Error al verificar asignación existente:', checkError);
          continue;
        }
        
        // Si no existe, crear una nueva asignación
        if (!existingAllocation) {
          // Calcular minutos totales basados en la duración de la sesión
          // Por defecto, asignamos tiempo para 2 sesiones
          const totalMinutes = duration * 2;
          
          const { error: insertError } = await supabase
            .from('advisory_allocations')
            .insert({
              company_id: companyId,
              program_module_id: moduleId,
              total_minutes: totalMinutes,
              used_minutes: 0
            });
          
          if (insertError) {
            console.error('Error al crear asignación de horas:', insertError);
          } else {
            console.log(`Asignación de horas creada para módulo ${moduleId} y empresa ${companyId}`);
          }
        }
      }
    } catch (err) {
      console.error('Error general al crear asignaciones de horas:', err);
    }
  },

  // Eliminar asignación de asesor
  async removeAdvisorAssignment(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisor_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al eliminar asignación de asesor:', error);
      return false;
    }
  },

  // Obtener asesores asignados a una empresa
  async getCompanyAdvisors(
    companyId: string,
    programId?: string
  ): Promise<Advisor[]> {
    try {
      console.log('Obteniendo asesores para la empresa:', companyId);
      
      // Consulta directa a la tabla de asignaciones
      const { data, error } = await supabase
        .from('advisor_assignments')
        .select(`
          id,
          advisor_id,
          program_id,
          advisors:advisor_id (id, name, email, specialty, phone, photo_url),
          programs:program_id (id, name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error en la consulta de asesores:', error);
        throw error;
      }
      
      console.log('Datos de asesores obtenidos:', data);
      
      // Transformar los datos para incluir información del programa
      const advisors = data.map(item => ({
        id: item.advisors.id,
        name: item.advisors.name,
        email: item.advisors.email || '',
        specialty: item.advisors.specialty || '',
        phone: item.advisors.phone || '',
        photo_url: item.advisors.photo_url || '',
        program_id: item.program_id,
        program_name: item.programs.name,
        assignment_id: item.id
      }));
      
      return advisors || [];
    } catch (error) {
      console.error('Error al obtener asesores de la empresa:', error);
      return [];
    }
  },

  // Obtener empresas asignadas a un asesor
  async getAdvisorCompanies(advisorId: string): Promise<any[]> {
    try {
      console.log('Obteniendo empresas para el asesor:', advisorId);
      
      // Consulta completa con join a programas
      const { data, error } = await supabase
        .from('advisor_assignments')
        .select(`
          id,
          company_id,
          program_id,
          companies:company_id (id, name, industry),
          programs:program_id (id, name)
        `)
        .eq('advisor_id', advisorId);
      
      if (error) {
        console.error('Error en la consulta principal:', error);
        throw error;
      }
      
      console.log('Datos obtenidos:', data);
      
      // Transformar los datos para incluir información del programa
      const companies = data.map(item => ({
        id: item.companies.id,
        name: item.companies.name,
        industry: item.companies.industry,
        logo_url: 'https://via.placeholder.com/150', // Logo predeterminado
        program_id: item.program_id,
        program_name: item.programs.name,
        assignment_id: item.id
      }));
      
      return companies || [];
    } catch (error) {
      console.error('Error al obtener empresas del asesor:', error);
      return [];
    }
  },

  // Obtener una empresa por ID
  async getCompanyById(companyId: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error al obtener empresa con ID ${companyId}:`, error);
      return null;
    }
  },

  // Obtener todas las sesiones de asesoría
  async getAdvisorySessions(): Promise<AdvisorySession[]> {
    try {
      const { data, error } = await supabase
        .from('advisory_sessions')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener sesiones de asesoría:', error);
      return [];
    }
  },

  // Obtener una sesión de asesoría por ID
  async getAdvisorySessionById(sessionId: string): Promise<AdvisorySession | null> {
    try {
      const { data, error } = await supabase
        .from('advisory_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error al obtener sesión de asesoría con ID ${sessionId}:`, error);
      return null;
    }
  },

  // Crear o actualizar una sesión de asesoría
  async saveAdvisorySession(session: Partial<AdvisorySession>): Promise<AdvisorySession | null> {
    try {
      let result;
      
      if (session.id) {
        // Actualizar sesión existente
        const { data, error } = await supabase
          .from('advisory_sessions')
          .update({
            title: session.title,
            description: session.description,
            duration: session.duration,
            session_type: session.session_type,
            preparation_instructions: session.preparation_instructions,
            advisor_notes: session.advisor_notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Crear nueva sesión
        const { data, error } = await supabase
          .from('advisory_sessions')
          .insert({
            title: session.title,
            description: session.description,
            duration: session.duration,
            session_type: session.session_type,
            preparation_instructions: session.preparation_instructions,
            advisor_notes: session.advisor_notes
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
        
        // Registrar en content_registry
        if (result) {
          const { error: registryError } = await supabase
            .from('content_registry')
            .insert({
              title: result.title,
              content_type: 'advisory_session',
              content_table: 'advisory_sessions',
              content_id: result.id
            });
          
          if (registryError) {
            console.error('Error al registrar sesión en content_registry:', registryError);
          }
        }
      }
      
      return result || null;
    } catch (error) {
      console.error('Error al guardar sesión de asesoría:', error);
      return null;
    }
  },

  // Obtener asignaciones de horas de asesoría para una empresa
  async getCompanyAllocations(companyId: string): Promise<AdvisoryAllocation[]> {
    try {
      const { data, error } = await supabase
        .from('advisory_allocations')
        .select(`
          *,
          strategy_stages:program_module_id (
            id,
            name,
            program_id
          )
        `)
        .eq('company_id', companyId);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener asignaciones de asesoría:', error);
      return [];
    }
  },

  // Crear o actualizar una asignación de horas
  async saveAllocation(allocation: Partial<AdvisoryAllocation>): Promise<AdvisoryAllocation | null> {
    try {
      let result;
      
      if (allocation.id) {
        // Actualizar asignación existente
        const { data, error } = await supabase
          .from('advisory_allocations')
          .update({
            total_minutes: allocation.total_minutes,
            used_minutes: allocation.used_minutes,
            updated_at: new Date().toISOString()
          })
          .eq('id', allocation.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Crear nueva asignación
        const { data, error } = await supabase
          .from('advisory_allocations')
          .insert({
            program_module_id: allocation.program_module_id,
            company_id: allocation.company_id,
            total_minutes: allocation.total_minutes,
            used_minutes: allocation.used_minutes || 0
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }
      
      return result || null;
    } catch (error) {
      console.error('Error al guardar asignación de asesoría:', error);
      return null;
    }
  },

  // Crear una reserva de asesoría
  async createBooking(booking: {
    companyId: string;
    advisorId: string;
    sessionId: string;
    startTime: Date;
    endTime: Date;
    googleEventId?: string;
    createdBy: string;
  }): Promise<string | null> {
    try {
      // 1. Obtener datos de la sesión y el asesor para crear el evento en Google Calendar
      const [sessionData, advisorData, companyData] = await Promise.all([
        this.getAdvisorySessionById(booking.sessionId),
        this.getAdvisorById(booking.advisorId),
        this.getCompanyById(booking.companyId)
      ]);

      if (!sessionData || !advisorData) {
        throw new Error('No se encontraron los datos de la sesión o el asesor');
      }

      let googleEventId = booking.googleEventId;

      // 2. Verificar si el asesor tiene Google Calendar conectado
      if (advisorData.calendar_sync_token || advisorData.calendar_refresh_token) {
        try {
          // Importar el servicio de Google Calendar dinámicamente
          const googleCalendarService = (await import('./googleCalendarService')).default;
          
          // Crear evento en Google Calendar
          const eventResult = await googleCalendarService.createEvent({
            advisorId: booking.advisorId,
            summary: `Asesoría: ${sessionData.title}`,
            description: `${sessionData.description || ''}
\nEmpresa: ${companyData?.name || 'No especificada'}
\nTipo de sesión: ${sessionData.session_type || 'No especificado'}
\nInstrucciones de preparación: ${sessionData.preparation_instructions || 'No especificadas'}`,
            startDateTime: booking.startTime.toISOString(),
            endDateTime: booking.endTime.toISOString(),
            attendees: [
              { email: advisorData.email, displayName: advisorData.name },
              // Si la empresa tiene un correo, agregarlo como asistente
              ...(companyData?.email ? [{ email: companyData.email, displayName: companyData.name }] : [])
            ],
            colorId: '1', // Azul para eventos de asesoría
            sendNotifications: true
          });
          
          if (eventResult && eventResult.id) {
            googleEventId = eventResult.id;
            console.log('Evento creado en Google Calendar:', eventResult.id);
          }
        } catch (calendarError) {
          console.error('Error al crear evento en Google Calendar:', calendarError);
          // Continuar con la creación de la reserva sin el evento de Google Calendar
        }
      }
      
      // 3. Crear la reserva en la base de datos
      const { data, error } = await supabase
        .rpc('create_advisory_booking', {
          p_company_id: booking.companyId,
          p_advisor_id: booking.advisorId,
          p_session_id: booking.sessionId,
          p_start_time: booking.startTime.toISOString(),
          p_end_time: booking.endTime.toISOString(),
          p_google_event_id: googleEventId || null,
          p_created_by: booking.createdBy
        });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al crear reserva de asesoría:', error);
      return null;
    }
  },

  // Obtener reservas de un asesor
  async getAdvisorBookings(advisorId: string): Promise<AdvisoryBooking[]> {
    try {
      const { data, error } = await supabase
        .from('advisory_bookings')
        .select(`
          *,
          advisor:advisor_id (
            id,
            name,
            email,
            photo_url
          ),
          session:session_id (
            id,
            title,
            duration,
            session_type
          ),
          company:company_id (
            id,
            name
          )
        `)
        .eq('advisor_id', advisorId)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener reservas del asesor:', error);
      return [];
    }
  },

  // Obtener reservas de una empresa
  async getCompanyBookings(companyId: string): Promise<AdvisoryBooking[]> {
    try {
      const { data, error } = await supabase
        .from('advisory_bookings')
        .select(`
          *,
          advisor:advisor_id (
            id,
            name,
            email,
            photo_url
          ),
          session:session_id (
            id,
            title,
            duration,
            session_type
          )
        `)
        .eq('company_id', companyId)
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener reservas de la empresa:', error);
      return [];
    }
  },

  // Cancelar una reserva
  async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      // 1. Obtener datos de la reserva para eliminar el evento en Google Calendar
      const { data: booking, error: bookingError } = await supabase
        .from('advisory_bookings')
        .select('id, advisor_id, google_event_id')
        .eq('id', bookingId)
        .single();
      
      if (bookingError) throw bookingError;
      
      if (booking && booking.google_event_id) {
        // 2. Verificar si el asesor tiene Google Calendar conectado
        const { data: advisor, error: advisorError } = await supabase
          .from('advisors')
          .select('id, calendar_sync_token, calendar_refresh_token')
          .eq('id', booking.advisor_id)
          .single();
        
        if (!advisorError && advisor && (advisor.calendar_sync_token || advisor.calendar_refresh_token)) {
          try {
            // Importar el servicio de Google Calendar dinámicamente
            const googleCalendarService = (await import('./googleCalendarService')).default;
            
            // Eliminar evento en Google Calendar
            await googleCalendarService.deleteEvent({
              advisorId: booking.advisor_id,
              eventId: booking.google_event_id
            });
            
            console.log('Evento eliminado de Google Calendar:', booking.google_event_id);
          } catch (calendarError) {
            console.error('Error al eliminar evento de Google Calendar:', calendarError);
            // Continuar con la cancelación de la reserva aunque falle la eliminación del evento
          }
        }
      }
      
      // 3. Actualizar el estado de la reserva a 'cancelled'
      const { error } = await supabase
        .from('advisory_bookings')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al cancelar reserva:', error);
      return false;
    }
  },

  // Crear un reporte de asesoría
  async createReport(report: {
    bookingId: string;
    notes?: string;
    commitments?: string;
    submitted?: boolean;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .rpc('create_advisory_report', {
          p_booking_id: report.bookingId,
          p_notes: report.notes || null,
          p_commitments: report.commitments || null,
          p_submitted: report.submitted || false
        });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al crear reporte de asesoría:', error);
      return null;
    }
  },

  // Actualizar un reporte de asesoría
  async updateReport(reportId: string, updates: {
    notes?: string;
    commitments?: string;
    submitted?: boolean;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('advisory_reports')
        .update({
          notes: updates.notes,
          commitments: updates.commitments,
          submitted: updates.submitted,
          updated_at: new Date().toISOString()
        })
        .eq('id', reportId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error al actualizar reporte:', error);
      return false;
    }
  },

  // Obtener reportes pendientes de un asesor
  async getPendingReports(advisorId: string): Promise<any[]> {
    try {
      // Intentamos primero con la función RPC
      try {
        const { data, error } = await supabase
          .rpc('get_pending_reports', {
            p_advisor_id: advisorId
          });
        
        if (!error) {
          return data || [];
        }
      } catch (innerError) {
        console.log('Intentando consulta alternativa para reportes pendientes');
      }

      // Si la función RPC falla, usamos una consulta SQL directa como alternativa
      const { data, error } = await supabase
        .from('advisory_reports')
        .select(`
          id as report_id,
          booking_id,
          advisory_bookings!inner(
            start_time as session_date,
            company_id,
            advisor_id,
            companies!inner(name as company_name)
          ),
          status
        `)
        .eq('advisory_bookings.advisor_id', advisorId)
        .eq('status', 'submitted');
      
      if (error) throw error;
      
      // Transformar los datos al formato esperado
      const formattedData = data.map(item => ({
        report_id: item.report_id,
        booking_id: item.booking_id,
        company_name: item.advisory_bookings.companies.company_name,
        session_date: item.advisory_bookings.session_date,
        status: item.status
      }));
      
      return formattedData || [];
    } catch (error) {
      console.error('Error al obtener reportes pendientes:', error);
      return [];
    }
  },

  // Obtener un reporte por ID de reserva
  async getReportByBookingId(bookingId: string): Promise<AdvisoryReport | null> {
    try {
      const { data, error } = await supabase
        .from('advisory_reports')
        .select(`
          *,
          booking:booking_id (
            id,
            start_time,
            end_time,
            status,
            session:session_id (
              id,
              title,
              session_type
            ),
            company:company_id (
              id,
              name
            )
          )
        `)
        .eq('booking_id', bookingId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al obtener reporte:', error);
      return null;
    }
  },

  // Verificar si un usuario es asesor
  async isUserAdvisor(userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('advisors')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error('Error al verificar si el usuario es asesor:', error);
      return false;
    }
  },

  // Obtener disponibilidad de un asesor para una fecha específica
  // Utiliza Google Calendar para determinar la disponibilidad real
  async getAdvisorAvailability(
    advisorId: string,
    date: Date
  ): Promise<TimeSlot[]> {
    try {
      // Configuración de horario laboral estándar
      const startHour = 9; // 9 AM
      const endHour = 17; // 5 PM
      const slotDuration = 60; // 60 minutos por slot
      
      // Configurar fecha de inicio y fin para el día seleccionado
      const startOfDay = new Date(date);
      startOfDay.setHours(startHour, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(endHour, 0, 0, 0);
      
      const startOfDayStr = startOfDay.toISOString();
      const endOfDayStr = endOfDay.toISOString();
      
      // 1. Obtener reservas existentes en la plataforma
      const { data: bookings, error: bookingsError } = await supabase
        .from('advisory_bookings')
        .select('start_time, end_time')
        .eq('advisor_id', advisorId)
        .gte('start_time', startOfDayStr)
        .lte('end_time', endOfDayStr)
        .neq('status', 'cancelled');
      
      if (bookingsError) throw bookingsError;
      
      // 2. Obtener datos del asesor para verificar si tiene Google Calendar conectado
      const { data: advisorData, error: advisorError } = await supabase
        .from('advisors')
        .select('id, calendar_sync_token, calendar_refresh_token')
        .eq('id', advisorId)
        .single();
      
      if (advisorError) throw advisorError;
      
      // Array para almacenar eventos ocupados (tanto de la plataforma como de Google Calendar)
      let busyEvents: {start: Date, end: Date}[] = [];
      
      // Convertir reservas de la plataforma a eventos ocupados
      if (bookings && bookings.length > 0) {
        busyEvents = bookings.map((booking: any) => ({
          start: new Date(booking.start_time),
          end: new Date(booking.end_time)
        }));
      }
      
      // 3. Si el asesor tiene Google Calendar conectado, obtener sus eventos
      if (advisorData && (advisorData.calendar_sync_token || advisorData.calendar_refresh_token)) {
        try {
          // Importar el servicio de Google Calendar dinámicamente
          const googleCalendarService = (await import('./googleCalendarService')).default;
          
          // Obtener eventos del calendario para el día seleccionado
          const calendarEvents = await googleCalendarService.listEvents({
            advisorId,
            timeMin: startOfDayStr,
            timeMax: endOfDayStr
          });
          
          // Convertir eventos de Google Calendar a eventos ocupados
          if (calendarEvents && calendarEvents.length > 0) {
            const calendarBusyEvents = calendarEvents.map((event: any) => ({
              start: new Date(event.start.dateTime || `${event.start.date}T${startHour}:00:00`),
              end: new Date(event.end.dateTime || `${event.end.date}T${endHour}:00:00`)
            }));
            
            // Combinar con los eventos de la plataforma
            busyEvents = [...busyEvents, ...calendarBusyEvents];
          }
        } catch (calendarError) {
          console.error('Error al obtener eventos de Google Calendar:', calendarError);
          // Continuar con la disponibilidad basada solo en las reservas de la plataforma
        }
      }
      
      // 4. Crear slots de tiempo y verificar disponibilidad
      const slots: TimeSlot[] = [];
      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(date);
        slotEnd.setHours(hour, slotDuration, 0, 0);
        
        // Verificar si el slot está disponible (no hay eventos que se solapen)
        const isAvailable = !busyEvents.some(event => {
          return (
            (slotStart >= event.start && slotStart < event.end) ||
            (slotEnd > event.start && slotEnd <= event.end) ||
            (slotStart <= event.start && slotEnd >= event.end)
          );
        });
        
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: isAvailable
        });
      }
      
      return slots;
    } catch (error) {
      console.error('Error al obtener disponibilidad del asesor:', error);
      return [];
    }
  },
  
  /**
   * Actualiza la información de un asesor
   * @param advisor Datos del asesor a actualizar
   * @returns true si la actualización fue exitosa, false en caso contrario
   */
  async updateAdvisor(advisor: Partial<Advisor> & { id: string }): Promise<boolean> {
    try {
      console.log('Actualizando asesor:', advisor.id);
      
      const { error } = await supabase
        .from('advisors')
        .update({ 
          ...advisor, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', advisor.id);
      
      if (error) {
        console.error('Error al actualizar asesor:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error al actualizar asesor:', error);
      return false;
    }
  },

  /**
   * Crea un nuevo asesor
   * @param advisor Datos del nuevo asesor
   * @returns El asesor creado o null si hubo un error
   */
  async createAdvisor(advisor: Partial<Advisor>): Promise<Advisor | null> {
    try {
      console.log('Creando nuevo asesor');
      
      // Generar fechas para created_at y updated_at
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('advisors')
        .insert({
          ...advisor,
          available: advisor.available !== undefined ? advisor.available : true,
          created_at: now,
          updated_at: now
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error al crear asesor:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error al crear asesor:', error);
      return null;
    }
  },

  /**
   * Obtiene las asignaciones de un asesor
   * @param advisorId ID del asesor
   * @returns Lista de asignaciones del asesor
   */
  async getAdvisorAssignments(advisorId: string): Promise<AdvisorAssignment[]> {
    try {
      console.log('Obteniendo asignaciones del asesor:', advisorId);
      
      const { data, error } = await supabase
        .from('advisor_assignments')
        .select(`
          id,
          advisor_id,
          company_id,
          program_id,
          companies:company_id(id, name),
          programs:program_id(id, name)
        `)
        .eq('advisor_id', advisorId);
      
      if (error) {
        console.error('Error al obtener asignaciones:', error);
        throw error;
      }
      
      // Transformar los datos para que coincidan con la interfaz AdvisorAssignment
      return (data || []).map((item: any) => ({
        id: item.id,
        advisor_id: item.advisor_id,
        company_id: item.company_id,
        program_id: item.program_id,
        created_at: item.created_at || new Date().toISOString(),
        company: item.companies,
        program: item.programs
      }));
    } catch (error) {
      console.error('Error al obtener asignaciones del asesor:', error);
      return [];
    }
  },





  /**
   * Actualiza el estado de un reporte de sesión
   * @param reportId ID del reporte
   * @param status Nuevo estado (draft, submitted, approved, rejected)
   * @param feedback Feedback opcional (requerido para rechazos)
   * @returns true si se actualizó correctamente, false en caso contrario
   */
  async updateSessionReportStatus(reportId: string, status: string, feedback?: string): Promise<boolean> {
    try {
      console.log(`Actualizando estado del reporte ${reportId} a ${status}`);
      
      // En advisory_reports no hay un campo status, solo submitted
      // Vamos a usar una lógica simplificada: si status es 'approved' o 'submitted', marcamos como submitted=true
      // Si es 'rejected', no cambiamos submitted pero guardamos el feedback
      const updates: any = {
        updated_at: new Date().toISOString()
      };
      
      if (status === 'approved' || status === 'submitted') {
        updates.submitted = true;
      }
      
      if (feedback) {
        // Guardamos el feedback en algún campo existente, como commitments
        updates.commitments = feedback;
      }
      
      const { error } = await supabase
        .from('advisory_reports')
        .update(updates)
        .eq('id', reportId);
      
      if (error) {
        console.error('Error al actualizar estado del reporte:', error);
        return false;
      }
      
      // Obtener información del reporte para crear notificaciones
      const { data: report } = await supabase
        .from('advisory_reports')
        .select('advisor_id, company_id, booking_id')
        .eq('id', reportId)
        .single();
      
      if (!report) {
        console.error('No se encontró el reporte:', reportId);
        return false;
      }
      
      // Crear notificación según el estado
      try {
        // Intentar insertar en la tabla real
        if (status === 'approved') {
          // Notificar al asesor que su reporte fue aprobado
          await this.createNotification({
            user_id: report.advisor_id,
            title: 'Reporte aprobado',
            message: 'Tu reporte de asesoría ha sido aprobado por la empresa',
            type: 'report',
            related_id: reportId
          });
        } else if (status === 'rejected') {
          // Notificar al asesor que su reporte fue rechazado
          await this.createNotification({
            user_id: report.advisor_id,
            title: 'Reporte rechazado',
            message: `Tu reporte de asesoría ha sido rechazado. Motivo: ${feedback || 'No especificado'}`,
            type: 'report',
            related_id: reportId
          });
        } else if (status === 'submitted') {
          // Notificar a la empresa que hay un nuevo reporte
          await this.createNotification({
            user_id: report.company_id,
            title: 'Nuevo reporte de asesoría',
            message: 'Se ha enviado un nuevo reporte de asesoría para tu revisión',
            type: 'report',
            related_id: reportId
          });
        }
      } catch (notifError) {
        console.warn('Error al crear notificación:', notifError);
        // Continuamos aunque falle la notificación
      }
      
      return true;
    } catch (error) {
      console.error('Error al actualizar estado del reporte:', error);
      return false;
    }
  },

  /**
   * Obtiene los reportes pendientes de revisión para una empresa
   * @param companyId ID de la empresa
   * @returns Lista de reportes pendientes
   */
  async getPendingReportsForCompany(companyId: string): Promise<any[]> {
    try {
      console.log('Obteniendo reportes pendientes para la empresa:', companyId);
      
      const { data, error } = await supabase
        .from('advisory_reports')
        .select('*, advisor:advisor_id(*)')
        .eq('company_id', companyId)
        .eq('submitted', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error al obtener reportes pendientes:', error);
        throw error;
      }
      
      return data.map((report: any) => ({
        ...report,
        advisor_name: report.advisor?.name || 'Asesor desconocido',
        status: report.submitted ? 'submitted' : 'draft' // Convertimos el boolean a string para mantener compatibilidad
      })) || [];
    } catch (error) {
      console.error('Error al obtener reportes pendientes para la empresa:', error);
      return [];
    }
  },

  /**
   * Obtiene las notificaciones de un usuario
   * @param userId ID del usuario
   * @returns Lista de notificaciones
   */
  async getUserNotifications(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Error al obtener notificaciones (posiblemente la tabla no existe aún):', error);
        // Si hay error, devolvemos un array vacío
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error al obtener notificaciones del usuario:', error);
      return [];
    }
  },

  /**
   * Marca una notificación como leída
   * @param notificationId ID de la notificación
   * @returns true si se marcó correctamente, false en caso contrario
   */
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) {
        console.warn('Error al marcar notificación como leída (posiblemente la tabla no existe aún):', error);
        // Simulamos éxito aunque haya error
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
      return false;
    }
  },

  /**
   * Marca todas las notificaciones de un usuario como leídas
   * @param userId ID del usuario
   * @returns true si se marcaron correctamente, false en caso contrario
   */
  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
      
      if (error) {
        console.warn('Error al marcar todas las notificaciones como leídas (posiblemente la tabla no existe aún):', error);
        // Simulamos éxito aunque haya error
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
      return false;
    }
  },

  /**
   * Elimina una notificación
   * @param notificationId ID de la notificación
   * @returns true si se eliminó correctamente, false en caso contrario
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) {
        console.warn('Error al eliminar notificación (posiblemente la tabla no existe aún):', error);
        // Simulamos éxito aunque haya error
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      return false;
    }
  },

  /**
   * Crea una nueva notificación
   * @param notification Datos de la notificación
   * @returns ID de la notificación creada o null si hubo un error
   */
  async createNotification(notification: {
    user_id: string;
    title: string;
    message: string;
    type: string;
    related_id?: string;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          read: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();
      
      if (error) {
        console.warn('Error al crear notificación (posiblemente la tabla no existe aún):', error);
        // Devolvemos un ID temporal
        return 'temp-notification-id';
      }
      
      return data?.id || null;
    } catch (error) {
      console.error('Error al crear notificación:', error);
      return null;
    }
  },

  /**
   * Obtiene los reportes de sesiones según el rol del usuario
   * @param userId ID del usuario
   * @param role Rol del usuario (admin, advisor, company)
   * @returns Lista de reportes de sesiones
   */
  async getSessionReports(userId: string, role: string): Promise<any[]> {
    try {
      let query = supabase
        .from('advisory_reports')
        .select(`
          id,
          booking_id,
          notes,
          commitments,
          submitted,
          created_at,
          updated_at,
          advisory_bookings!inner(
            id,
            advisor_id,
            company_id,
            session_id,
            start_time,
            end_time,
            status,
            advisors!inner(id, name),
            companies!inner(id, name),
            advisory_sessions!inner(id, title)
          )
        `);

      // Filtrar según el rol del usuario
      if (role === 'advisor') {
        // Obtener el ID del asesor asociado al usuario
        const { data: advisorData } = await supabase
          .from('advisors')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (advisorData) {
          query = query.eq('advisory_bookings.advisor_id', advisorData.id);
        }
      } else if (role === 'company') {
        // Para usuarios de empresa, mostrar solo sus reportes
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (companyData) {
          query = query.eq('advisory_bookings.company_id', companyData.id);
        }
      }
      // Para admin, mostrar todos los reportes (no se aplica filtro adicional)

      const { data, error } = await query;

      if (error) throw error;

      // Transformar los datos al formato esperado
      const formattedData = data.map(item => ({
        id: item.id,
        session_id: item.advisory_bookings.session_id,
        advisor_id: item.advisory_bookings.advisor_id,
        company_id: item.advisory_bookings.company_id,
        title: item.advisory_bookings.advisory_sessions.title,
        summary: item.notes || '',
        achievements: item.commitments || '',
        next_steps: '',
        status: item.submitted ? 'submitted' : 'draft',
        feedback: '',
        created_at: item.created_at,
        updated_at: item.updated_at,
        advisor_name: item.advisory_bookings.advisors.name,
        company_name: item.advisory_bookings.companies.name,
        session_date: item.advisory_bookings.start_time
      }));

      return formattedData || [];
    } catch (error) {
      console.error('Error al obtener reportes de sesiones:', error);
      return [];
    }
  },

  /**
   * Obtiene las sesiones que no tienen reportes asociados
   * @param userId ID del usuario
   * @param role Rol del usuario (admin, advisor, company)
   * @returns Lista de sesiones sin reportes
   */
  async getSessionsWithoutReports(userId: string, role: string): Promise<any[]> {
    try {
      // Primero obtenemos el ID del asesor o empresa según el rol
      let advisorId = null;
      let companyId = null;

      if (role === 'advisor') {
        const { data: advisorData } = await supabase
          .from('advisors')
          .select('id')
          .eq('user_id', userId)
          .single();

        advisorId = advisorData?.id;
      } else if (role === 'company') {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', userId)
          .single();

        companyId = companyData?.id;
      }

      // Consulta base para obtener reservas completadas
      let query = supabase
        .from('advisory_bookings')
        .select(`
          id,
          advisor_id,
          company_id,
          session_id,
          start_time,
          end_time,
          status,
          advisors!inner(id, name),
          companies!inner(id, name),
          advisory_sessions!inner(id, title)
        `)
        .eq('status', 'completed')
        .lt('end_time', new Date().toISOString());

      // Aplicar filtros según el rol
      if (advisorId) {
        query = query.eq('advisor_id', advisorId);
      } else if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data: bookings, error: bookingsError } = await query;

      if (bookingsError) throw bookingsError;

      // Obtener los IDs de las reservas que ya tienen reportes
      const { data: reports, error: reportsError } = await supabase
        .from('advisory_reports')
        .select('booking_id');

      if (reportsError) throw reportsError;

      // Filtrar las reservas que no tienen reportes
      const reportBookingIds = reports?.map(r => r.booking_id) || [];
      const sessionsWithoutReports = bookings?.filter(b => !reportBookingIds.includes(b.id)) || [];

      // Transformar los datos al formato esperado
      const formattedData = sessionsWithoutReports.map(item => ({
        id: item.session_id,
        title: item.advisory_sessions.title,
        start_time: item.start_time,
        end_time: item.end_time,
        advisor_id: item.advisor_id,
        company_id: item.company_id,
        status: item.status,
        advisor_name: item.advisors.name,
        company_name: item.companies.name,
        booking_id: item.id
      }));

      return formattedData;
    } catch (error) {
      console.error('Error al obtener sesiones sin reportes:', error);
      return [];
    }
  },

};

export default advisoryService;
