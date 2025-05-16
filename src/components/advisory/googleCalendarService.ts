import { supabase } from '../../lib/supabase';

// Constantes para la API de Google Calendar
const GOOGLE_API_BASE_URL = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

// URL base para las APIs serverless
const API_BASE_URL = '/api';

// Usar variables de entorno para las credenciales públicas
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const REDIRECT_URI = import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth/google/callback';

// Tipos para los tokens y respuestas de Google
interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
  email?: string;
}

interface GoogleEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: {
    email: string;
    displayName?: string;
    responseStatus?: string;
  }[];
  reminders?: {
    useDefault: boolean;
    overrides?: {
      method: string;
      minutes: number;
    }[];
  };
  colorId?: string;
}

/**
 * Servicio para integración con Google Calendar
 */
export const googleCalendarService = {
  /**
   * Genera la URL para iniciar el flujo de autorización OAuth2
   * @returns URL para redireccionar al usuario
   * @throws Error si las credenciales no están configuradas correctamente
   */
  getAuthorizationUrl(): string {
    // Verificar que las credenciales estén configuradas
    if (!GOOGLE_CLIENT_ID) {
      console.error('Error: VITE_GOOGLE_CLIENT_ID no está configurado en el archivo .env');
      throw new Error('Credenciales de Google no configuradas. Contacta al administrador.');
    }

    if (!REDIRECT_URI) {
      console.error('Error: VITE_GOOGLE_REDIRECT_URI no está configurado en el archivo .env');
      throw new Error('URL de redirección no configurada. Contacta al administrador.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    // Mostrar información de depuración
    console.log('Iniciando autorización OAuth2 con los siguientes parámetros:');
    console.log('- Client ID:', GOOGLE_CLIENT_ID.substring(0, 10) + '...');
    console.log('- Redirect URI:', REDIRECT_URI);
    console.log('- Scopes:', scopes.join(' '));

    return `${GOOGLE_OAUTH_URL}?${params.toString()}`;
  },

  /**
   * Intercambia el código de autorización por tokens de acceso y refresco
   * Utiliza una API serverless para proteger el client_secret
   * @param code Código de autorización recibido de Google
   * @returns Tokens de acceso y refresco
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
    try {
      console.log('=== INICIANDO INTERCAMBIO DE CÓDIGO POR TOKENS ===');
      console.log('Código recibido:', code.substring(0, 10) + '...');
      console.log('Verificando credenciales:');
      console.log('- Client ID configurado:', GOOGLE_CLIENT_ID ? 'Sí' : 'No');
      console.log('- Redirect URI:', REDIRECT_URI);
      
      if (!GOOGLE_CLIENT_ID) {
        throw new Error('Client ID de Google no configurado correctamente en el archivo .env');
      }
      
      // Usar la API serverless para intercambiar el código por tokens
      // Esto protege el client_secret que no debe estar en el frontend
      console.log('Enviando solicitud a la API serverless...');
      
      const response = await fetch(`${API_BASE_URL}/google-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          code,
          grantType: 'authorization_code'
        })
      });

      console.log('Respuesta recibida de la API - Status:', response.status, response.statusText);
      
      if (!response.ok) {
        const responseText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(responseText);
          console.error('Error detallado de la API:', errorData);
        } catch (e) {
          console.error('Respuesta no es JSON válido:', responseText);
          throw new Error(`Error al obtener tokens. Status: ${response.status}. Respuesta: ${responseText}`);
        }
        throw new Error(`Error al obtener tokens: ${errorData.error || errorData.details || 'Error desconocido'}`);
      }

      const tokenData = await response.json();
      console.log('Tokens recibidos correctamente:');
      console.log('- access_token:', tokenData.access_token ? 'Presente (primeros caracteres: ' + tokenData.access_token.substring(0, 5) + '...)' : 'Ausente');
      console.log('- refresh_token:', tokenData.refresh_token ? 'Presente' : 'Ausente');
      console.log('- expires_in:', tokenData.expires_in);
      console.log('- token_type:', tokenData.token_type);
      
      return tokenData;
    } catch (error: any) {
      console.error('Error al intercambiar código por tokens:', error);
      console.error('Mensaje de error:', error.message);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  },

  /**
   * Refresca el token de acceso usando el token de refresco
   * @param refreshToken Token de refresco
   * @returns Nuevo token de acceso y su tiempo de expiración
   */
  async refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
    try {
      console.log('Refrescando token de acceso...');
      
      if (!refreshToken) {
        throw new Error('Token de refresco no proporcionado');
      }
      
      const response = await fetch(`${API_BASE_URL}/google-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
          grantType: 'refresh_token'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error al refrescar token:', errorData);
        throw new Error(`Error al refrescar token: ${errorData.error_description || errorData.error || 'Error desconocido'}`);
      }
      
      const tokenData = await response.json();
      console.log('Token refrescado correctamente. Expira en:', tokenData.expires_in, 'segundos');
      
      return {
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
      };
    } catch (error: any) {
      console.error('Error al refrescar token de acceso:', error);
      throw error;
    }
  },

  /**
   * Guarda los tokens en la base de datos para un asesor
   * @param advisorId ID del asesor
   * @param tokens Tokens a guardar
   * @returns Resultado de la operación
   */
  async saveTokensForAdvisor(advisorId: string, tokens: GoogleTokens): Promise<boolean> {
    try {
      console.log('=== GUARDANDO TOKENS PARA EL ASESOR ===');
      console.log('ID del asesor:', advisorId);
      console.log('Tokens recibidos:', {
        access_token: tokens.access_token ? 'Presente' : 'Ausente',
        refresh_token: tokens.refresh_token ? 'Presente' : 'Ausente',
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope
      });
      
      if (!tokens.access_token) {
        console.error('Error: No se recibió un access_token válido');
        return false;
      }
      
      // Verificar que el asesor existe
      const { data: advisor, error: advisorError } = await supabase
        .from('advisors')
        .select('id, name')
        .eq('id', advisorId)
        .single();
      
      if (advisorError || !advisor) {
        console.error('Error: No se encontró el asesor con ID:', advisorId);
        console.error('Error de Supabase:', advisorError);
        return false;
      }
      
      console.log('Asesor encontrado:', advisor.name);
      
      // Crear un objeto con los datos a guardar
      const tokenData = {
        calendar_sync_token: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + tokens.expires_in * 1000, // Convertir segundos a milisegundos
          token_type: tokens.token_type,
          scope: tokens.scope
        }),
        calendar_refresh_token: tokens.refresh_token,
        google_account_email: tokens.scope?.includes('email') ? tokens.email : null,
        updated_at: new Date().toISOString()
      };

      console.log('Datos a guardar:', {
        calendar_sync_token: 'JSON con tokens (longitud: ' + tokenData.calendar_sync_token.length + ' caracteres)',
        calendar_refresh_token: tokens.refresh_token ? 'Presente' : 'Ausente',
        google_account_email: tokenData.google_account_email,
        updated_at: tokenData.updated_at
      });

      // Actualizar el registro del asesor
      const { error } = await supabase
        .from('advisors')
        .update(tokenData)
        .eq('id', advisorId);

      if (error) {
        console.error('Error al actualizar el registro del asesor:', error);
        throw error;
      }
      
      console.log('✅ Tokens guardados correctamente en la base de datos');
      return true;
    } catch (error: any) {
      console.error('Error al guardar tokens para el asesor:', error);
      console.error('Mensaje de error:', error.message);
      console.error('Stack trace:', error.stack);
      return false;
    }
  },

  /**
   * Obtiene el token de acceso válido para un asesor
   * Si el token ha expirado, intenta refrescarlo automáticamente
   * @param advisorId ID del asesor
   * @returns Token de acceso válido o null si no se puede obtener
   */
  async getValidAccessToken(advisorId: string): Promise<string | null> {
    try {
      // Obtener el asesor con sus tokens
      const { data: advisor, error } = await supabase
        .from('advisors')
        .select('calendar_sync_token, calendar_refresh_token')
        .eq('id', advisorId)
        .single();

      if (error || !advisor || !advisor.calendar_sync_token) {
        return null;
      }

      // Parsear el token almacenado
      const tokenData = JSON.parse(advisor.calendar_sync_token);
      const expiresAt = tokenData.expires_at;
      
      // Verificar si el token ha expirado (con un margen de 5 minutos)
      const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;
      
      if (!isExpired) {
        return tokenData.access_token;
      }
      
      // Si el token ha expirado, intentar refrescarlo
      if (advisor.calendar_refresh_token) {
        try {
          const newTokenData = await this.refreshAccessToken(advisor.calendar_refresh_token);
          
          // Actualizar el token en la base de datos
          const updatedTokenData = {
            ...tokenData,
            access_token: newTokenData.access_token,
            expires_at: Date.now() + newTokenData.expires_in * 1000
          };
          
          await supabase
            .from('advisors')
            .update({
              calendar_sync_token: JSON.stringify(updatedTokenData),
              updated_at: new Date().toISOString()
            })
            .eq('id', advisorId);
          
          return newTokenData.access_token;
        } catch (refreshError) {
          console.error('Error al refrescar token:', refreshError);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error al obtener token de acceso válido:', error);
      return null;
    }
  },

  /**
   * Crea un evento en Google Calendar
   * @param params Parámetros para crear el evento
   * @returns Evento creado o null si hay error
   */
  async createEvent(params: {
    advisorId: string;
    summary: string;
    description?: string;
    location?: string;
    startDateTime: string;
    endDateTime: string;
    attendees?: {email: string; displayName?: string}[];
    colorId?: string;
    sendNotifications?: boolean;
  }): Promise<{id: string} | null> {
    try {
      const accessToken = await this.getValidAccessToken(params.advisorId);
      
      if (!accessToken) {
        throw new Error('No se pudo obtener un token de acceso válido');
      }

      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/primary/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: params.summary,
          description: params.description,
          location: params.location,
          start: {
            dateTime: params.startDateTime,
            timeZone: 'America/Mexico_City'
          },
          end: {
            dateTime: params.endDateTime,
            timeZone: 'America/Mexico_City'
          },
          attendees: params.attendees,
          colorId: params.colorId,
          reminders: {
            useDefault: true
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al crear evento: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      return { id: data.id };
    } catch (error) {
      console.error('Error al crear evento en Google Calendar:', error);
      return null;
    }
  },

  /**
   * Actualiza un evento existente en Google Calendar
   * @param params Parámetros para actualizar el evento
   * @returns true si se actualizó correctamente, false si hubo error
   */
  async updateEvent(params: {
    advisorId: string;
    eventId: string;
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    attendees?: {email: string; displayName?: string}[];
    colorId?: string;
  }): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken(params.advisorId);
      
      if (!accessToken) {
        throw new Error('No se pudo obtener un token de acceso válido');
      }

      // Crear objeto con los datos a actualizar
      const eventData: any = {};
      
      if (params.summary) eventData.summary = params.summary;
      if (params.description) eventData.description = params.description;
      if (params.location) eventData.location = params.location;
      
      if (params.startDateTime) {
        eventData.start = {
          dateTime: params.startDateTime,
          timeZone: 'America/Mexico_City'
        };
      }
      
      if (params.endDateTime) {
        eventData.end = {
          dateTime: params.endDateTime,
          timeZone: 'America/Mexico_City'
        };
      }
      
      if (params.attendees) eventData.attendees = params.attendees;
      if (params.colorId) eventData.colorId = params.colorId;

      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/primary/events/${params.eventId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al actualizar evento: ${errorData.error?.message || 'Error desconocido'}`);
      }

      return true;
    } catch (error) {
      console.error('Error al actualizar evento en Google Calendar:', error);
      return false;
    }
  },

  /**
   * Elimina un evento de Google Calendar
   * @param params Parámetros para eliminar el evento
   * @returns true si se eliminó correctamente, false si hubo error
   */
  async deleteEvent(params: {
    advisorId: string;
    eventId: string;
  }): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken(params.advisorId);
      
      if (!accessToken) {
        throw new Error('No se pudo obtener un token de acceso válido');
      }

      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/primary/events/${params.eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al eliminar evento: ${errorData.error?.message || 'Error desconocido'}`);
      }

      return true;
    } catch (error) {
      console.error('Error al eliminar evento de Google Calendar:', error);
      return false;
    }
  },

  /**
   * Obtiene eventos del calendario del asesor en un rango de fechas
   * @param advisorId ID del asesor
   * @param timeMin Fecha de inicio (ISO string)
   * @param timeMax Fecha de fin (ISO string)
   * @returns Lista de eventos o null si hay error
   */
  async getEvents(
    advisorId: string, 
    timeMin: string, 
    timeMax: string
  ): Promise<GoogleEvent[] | null> {
    try {
      const accessToken = await this.getValidAccessToken(advisorId);
      
      if (!accessToken) {
        throw new Error('No se pudo obtener un token de acceso válido');
      }

      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime'
      });

      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/primary/events?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al obtener eventos: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Error al obtener eventos de Google Calendar:', error);
      return null;
    }
  },

  /**
   * Verifica si un horario está disponible para el asesor
   * @param advisorId ID del asesor
   * @param startTime Hora de inicio (ISO string)
   * @param endTime Hora de fin (ISO string)
   * @returns true si el horario está disponible, false si no
   */
  async isTimeSlotAvailable(
    advisorId: string, 
    startTime: string, 
    endTime: string
  ): Promise<boolean> {
    try {
      const accessToken = await this.getValidAccessToken(advisorId);
      
      if (!accessToken) {
        throw new Error('No se pudo obtener un token de acceso válido');
      }

      // Consultar eventos en el rango de tiempo
      const params = new URLSearchParams({
        timeMin: startTime,
        timeMax: endTime,
        singleEvents: 'true'
      });

      const response = await fetch(`${GOOGLE_API_BASE_URL}/calendars/primary/events?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Error al verificar disponibilidad: ${errorData.error?.message || 'Error desconocido'}`);
      }

      const data = await response.json();
      
      // Si hay eventos en el rango, el horario no está disponible
      return (data.items || []).length === 0;
    } catch (error) {
      console.error('Error al verificar disponibilidad de horario:', error);
      return false; // En caso de error, asumimos que no está disponible por seguridad
    }
  },

  /**
   * Revoca el acceso a Google Calendar para un asesor
   * @param advisorId ID del asesor
   * @returns true si se revocó correctamente, false si hubo error
   */
  async revokeAccess(advisorId: string): Promise<boolean> {
    try {
      // Obtener el token de refresco del asesor
      const { data: advisor, error } = await supabase
        .from('advisors')
        .select('calendar_sync_token, calendar_refresh_token')
        .eq('id', advisorId)
        .single();
      
      if (error || !advisor || !advisor.calendar_sync_token) {
        return false;
      }
      
      const tokenData = JSON.parse(advisor.calendar_sync_token);
      
      // Revocar el token de acceso
      if (tokenData.access_token) {
        const params = new URLSearchParams({
          token: tokenData.access_token
        });
        
        const response = await fetch(`https://oauth2.googleapis.com/revoke?${params.toString()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        if (!response.ok) {
          console.error('Error al revocar token de acceso:', await response.text());
        }
      }
      
      // Limpiar los tokens en la base de datos
      const { error: updateError } = await supabase
        .from('advisors')
        .update({
          calendar_sync_token: null,
          calendar_refresh_token: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', advisorId);
      
      if (updateError) throw updateError;
      
      return true;
    } catch (error) {
      console.error('Error al revocar acceso a Google Calendar:', error);
      return false;
    }
  },

  /**
   * Alias para getEvents para mantener consistencia con la nomenclatura
   * @param params Parámetros para listar eventos
   * @returns Lista de eventos o null si hay error
   */
  listEvents(params: {
    advisorId: string;
    timeMin: string;
    timeMax: string;
  }): Promise<GoogleEvent[] | null> {
    return this.getEvents(params.advisorId, params.timeMin, params.timeMax);
  }
};

export default googleCalendarService;
