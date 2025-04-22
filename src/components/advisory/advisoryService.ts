import { supabase } from '../../lib/supabase';
import {
  Advisor,
  AdvisorAssignment,
  AdvisorySession,
  AdvisoryAllocation,
  AdvisoryBooking,
  AdvisoryReport,
  TimeSlot,
  AvailabilityDay
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
      const { data, error } = await supabase
        .rpc('assign_advisor_to_company', {
          p_advisor_id: advisorId,
          p_company_id: companyId,
          p_program_id: programId
        });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error al asignar asesor a empresa:', error);
      return null;
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
      const { data, error } = await supabase
        .rpc('get_company_advisors', {
          p_company_id: companyId,
          p_program_id: programId || null
        });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener asesores de la empresa:', error);
      return [];
    }
  },

  // Obtener empresas asignadas a un asesor
  async getAdvisorCompanies(
    advisorId: string,
    programId?: string
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_advisor_companies', {
          p_advisor_id: advisorId,
          p_program_id: programId || null
        });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error al obtener empresas del asesor:', error);
      return [];
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
      const { data, error } = await supabase
        .rpc('create_advisory_booking', {
          p_company_id: booking.companyId,
          p_advisor_id: booking.advisorId,
          p_session_id: booking.sessionId,
          p_start_time: booking.startTime.toISOString(),
          p_end_time: booking.endTime.toISOString(),
          p_google_event_id: booking.googleEventId || null,
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
      const { data, error } = await supabase
        .rpc('get_pending_reports', {
          p_advisor_id: advisorId
        });
      
      if (error) throw error;
      return data || [];
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
  // Esta es una implementación básica, en una implementación real
  // se consultaría la API de Google Calendar
  async getAdvisorAvailability(
    advisorId: string,
    date: Date
  ): Promise<TimeSlot[]> {
    try {
      // En una implementación real, aquí se consultaría la API de Google Calendar
      // Para este ejemplo, generamos slots de tiempo ficticios
      const startHour = 9; // 9 AM
      const endHour = 17; // 5 PM
      const slotDuration = 60; // 60 minutos por slot
      
      const slots: TimeSlot[] = [];
      const startOfDay = new Date(date);
      startOfDay.setHours(startHour, 0, 0, 0);
      
      // Obtener reservas existentes para este asesor en esta fecha
      const startOfDayStr = startOfDay.toISOString();
      const endOfDay = new Date(date);
      endOfDay.setHours(endHour, 0, 0, 0);
      const endOfDayStr = endOfDay.toISOString();
      
      const { data: bookings, error } = await supabase
        .from('advisory_bookings')
        .select('start_time, end_time')
        .eq('advisor_id', advisorId)
        .gte('start_time', startOfDayStr)
        .lte('end_time', endOfDayStr)
        .neq('status', 'cancelled');
      
      if (error) throw error;
      
      // Crear slots de tiempo
      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(date);
        slotEnd.setHours(hour, slotDuration, 0, 0);
        
        // Verificar si el slot está disponible
        const isAvailable = !(bookings || []).some(booking => {
          const bookingStart = new Date(booking.start_time);
          const bookingEnd = new Date(booking.end_time);
          
          return (
            (slotStart >= bookingStart && slotStart < bookingEnd) ||
            (slotEnd > bookingStart && slotEnd <= bookingEnd) ||
            (slotStart <= bookingStart && slotEnd >= bookingEnd)
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
  }
};

export default advisoryService;
