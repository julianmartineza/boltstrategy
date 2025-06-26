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
   * @param advisorId ID del asesor (opcional)
   * @returns Tokens de acceso y refresco
   */
  async exchangeCodeForTokens(code: string, advisorId?: string): Promise<GoogleTokens> {
    try {
      console.log('=== INICIANDO INTERCAMBIO DE CÓDIGO POR TOKENS ===');
      console.log('Código recibido:', code.substring(0, 10) + '...');
      console.log('Verificando credenciales:');
      console.log('- Client ID configurado:', GOOGLE_CLIENT_ID ? 'Sí' : 'No');
      console.log('- Redirect URI:', REDIRECT_URI);
      console.log('- API Base URL configurada:', API_BASE_URL);
      
      if (!GOOGLE_CLIENT_ID) {
        throw new Error('Client ID de Google no configurado correctamente en el archivo .env');
      }
      
      // Usar la API serverless para intercambiar el código por tokens
      // Esto protege el client_secret que no debe estar en el frontend
      console.log('Enviando solicitud a la API serverless...');
      console.log(`URL completa de solicitud: ${API_BASE_URL}/exchange-code`);
      console.log('Método: POST');
      console.log('Datos enviados:', { code: code.substring(0, 10) + '...', grantType: 'authorization_code' });
      
      // Incluir el ID del asesor en la solicitud si está disponible
      const requestData = { 
        code,
        grantType: 'authorization_code'
      };
      
      if (advisorId) {
        console.log('Incluyendo ID del asesor en la solicitud:', advisorId);
        Object.assign(requestData, { advisorId });
      }
      
      const response = await fetch(`${API_BASE_URL}/exchange-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('Datos enviados a la API:', {
        ...requestData,
        code: requestData.code.substring(0, 10) + '...'
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
      
      const response = await fetch(`${API_BASE_URL}/exchange-code`, {
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
        access_token: tokens.access_token ? `Presente (${tokens.access_token.substring(0, 10)}...)` : 'Ausente',
        refresh_token: tokens.refresh_token ? `Presente (${tokens.refresh_token.substring(0, 10)}...)` : 'Ausente',
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope
      });
      
      // Validaciones de tokens
      if (!tokens.access_token) {
        console.error('Error: No se recibió un access_token válido');
        return false;
      }
      
      if (!tokens.refresh_token) {
        console.warn('Advertencia: No se recibió refresh_token. Esto podría causar problemas para refrescar el token en el futuro.');
        // Continuamos porque algunos flujos podrían no devolver refresh_token si ya existe uno
      }
      
      if (!tokens.expires_in) {
        console.warn('Advertencia: No se recibió tiempo de expiración. Usando valor predeterminado de 3600 segundos (1 hora).');
        tokens.expires_in = 3600; // Valor predeterminado de 1 hora
      }
      
      // Verificar que el asesor existe
      console.log('Verificando existencia del asesor en la base de datos...');
      const { data: advisor, error: advisorError } = await supabase
        .from('advisors')
        .select('id, name, calendar_refresh_token')
        .eq('id', advisorId)
        .single();
      
      if (advisorError) {
        console.error('Error al consultar el asesor:', advisorError.message);
        console.error('Código de error:', advisorError.code);
        console.error('Detalles:', advisorError.details);
        return false;
      }
      
      if (!advisor) {
        console.error('Error: No se encontró el asesor con ID:', advisorId);
        return false;
      }
      
      console.log('Asesor encontrado:', advisor.name);
      
      // Si no recibimos refresh_token pero ya existe uno en la base de datos, lo conservamos
      if (!tokens.refresh_token && advisor.calendar_refresh_token) {
        console.log('Usando refresh_token existente de la base de datos');
        tokens.refresh_token = advisor.calendar_refresh_token;
      }
      
      // Crear un objeto con los datos a guardar
      const tokenExpiry = Date.now() + tokens.expires_in * 1000; // Convertir segundos a milisegundos
      
      // Crear el objeto de datos con los tokens
      const tokenData = {
        calendar_sync_token: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokenExpiry,
          token_type: tokens.token_type || 'Bearer',
          scope: tokens.scope
        }),
        calendar_refresh_token: tokens.refresh_token,
        google_account_email: tokens.scope?.includes('email') ? tokens.email : 'conectado@gmail.com',
        updated_at: new Date().toISOString()
      };

      console.log('Datos a guardar:', {
        calendar_sync_token: 'JSON con tokens (longitud: ' + tokenData.calendar_sync_token.length + ' caracteres)',
        calendar_refresh_token: tokens.refresh_token ? 'Presente' : 'Ausente',
        google_account_email: tokenData.google_account_email,
        updated_at: tokenData.updated_at,
        token_expiry: new Date(tokenExpiry).toISOString()
      });

      // Actualizar el registro del asesor
      console.log('Actualizando registro en la tabla advisors...');
      const { error } = await supabase
        .from('advisors')
        .update(tokenData)
        .eq('id', advisorId);

      if (error) {
        console.error('Error al actualizar el registro del asesor:', error.message);
        console.error('Código de error:', error.code);
        console.error('Detalles:', error.details);
        throw error;
      }
      
      // Verificar que los datos se guardaron correctamente
      console.log('Verificando que los datos se guardaron correctamente...');
      
      const { data: verifyData, error: verifyError } = await supabase
        .from('advisors')
        .select('calendar_sync_token, calendar_refresh_token')
        .eq('id', advisorId)
        .single();
        
      if (verifyError || !verifyData) {
        console.error('Error al verificar los datos guardados:', verifyError?.message || 'No se encontraron datos');
        return false;
      }
      
      console.log('Verificación exitosa. Datos guardados:');
      console.log('- calendar_sync_token presente:', !!verifyData.calendar_sync_token);
      console.log('- calendar_refresh_token presente:', !!verifyData.calendar_refresh_token);
      
      // Determinar si está conectado basado en la presencia de tokens
      const isConnected = !!verifyData.calendar_sync_token || !!verifyData.calendar_refresh_token;
      console.log('- Estado de conexión con Google Calendar:', isConnected ? 'Conectado' : 'No conectado');
      
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
      console.log('=== OBTENIENDO TOKEN DE ACCESO PARA ASESOR ===');
      console.log('ID del asesor:', advisorId);
      
      // Obtener el asesor con sus tokens
      console.log('Consultando tokens del asesor en la base de datos...');
      
      // Consultar los tokens del asesor
      const { data: advisor, error } = await supabase
        .from('advisors')
        .select('calendar_sync_token, calendar_refresh_token')
        .eq('id', advisorId)
        .single();

      if (error) {
        console.error('Error al consultar tokens del asesor:', error.message);
        console.error('Código de error:', error.code);
        return null;
      }
      
      if (!advisor) {
        console.error('No se encontró el asesor con ID:', advisorId);
        return null;
      }
      
      // Determinar el estado de conexión basado en la presencia de tokens
      const isConnected = !!advisor.calendar_sync_token || !!advisor.calendar_refresh_token;
      
      console.log('Asesor encontrado. Estado de conexión con Google Calendar:', 
        isConnected ? 'Conectado' : 'No conectado');
      
      if (!advisor.calendar_sync_token) {
        console.error('El asesor no tiene tokens de Google Calendar almacenados');
        return null;
      }

      // Parsear el token almacenado
      console.log('Analizando datos de token almacenado...');
      let tokenData;
      
      try {
        tokenData = JSON.parse(advisor.calendar_sync_token);
      } catch (parseError: any) {
        console.error('Error al parsear el token almacenado:', parseError.message);
        return null;
      }
      
      if (!tokenData || !tokenData.access_token) {
        console.error('Formato de token inválido o incompleto');
        return null;
      }
      
      const expiresAt = tokenData.expires_at;
      if (!expiresAt) {
        console.warn('El token no tiene fecha de expiración. Asumiendo que ha expirado.');
      }
      
      // Verificar si el token ha expirado (con un margen de 5 minutos)
      const now = Date.now();
      const isExpired = !expiresAt || now > expiresAt - 5 * 60 * 1000;
      
      if (!isExpired) {
        console.log('Token de acceso válido encontrado (no expirado)');
        console.log('- Expira en:', Math.round((expiresAt - now) / 1000 / 60), 'minutos');
        return tokenData.access_token;
      }
      
      console.log('El token de acceso ha expirado. Intentando refrescarlo...');
      
      // Si el token ha expirado, intentar refrescarlo
      if (advisor.calendar_refresh_token) {
        console.log('Refresh token encontrado. Intentando refrescar el token de acceso...');
        
        try {
          const newTokenData = await this.refreshAccessToken(advisor.calendar_refresh_token);
          
          if (!newTokenData || !newTokenData.access_token) {
            console.error('No se pudo obtener un nuevo token de acceso');
            return null;
          }
          
          console.log('Nuevo token de acceso obtenido exitosamente');
          
          // Actualizar el token en la base de datos
          const tokenExpiry = Date.now() + (newTokenData.expires_in || 3600) * 1000;
          const updatedTokenData = {
            ...tokenData,
            access_token: newTokenData.access_token,
            expires_at: tokenExpiry
          };
          
          console.log('Actualizando token en la base de datos...');
          const { error: updateError } = await supabase
            .from('advisors')
            .update({
              calendar_sync_token: JSON.stringify(updatedTokenData),
              updated_at: new Date().toISOString()
            })
            .eq('id', advisorId);
          
          if (updateError) {
            console.error('Error al actualizar token en la base de datos:', updateError.message);
            console.error('Código de error:', updateError.code);
            // Continuamos porque aún tenemos un token válido aunque no se haya podido guardar
          } else {
            console.log('Token actualizado exitosamente en la base de datos');
          }
          
          return newTokenData.access_token;
        } catch (refreshError: any) {
          console.error('Error al refrescar token:', refreshError.message);
          console.error('Detalles del error:', refreshError);
          return null;
        }
      } else {
        console.error('No hay refresh token disponible para refrescar el token de acceso');
      }
      
      return null;
    } catch (error: any) {
      console.error('Error al obtener token de acceso válido:', error.message);
      console.error('Stack trace:', error.stack);
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
  },

  /**
   * Verifica si un asesor tiene un calendario conectado
   * @param advisorId ID del asesor
   * @returns Objeto con el estado de la conexión y detalles adicionales
   */
  async isCalendarConnected(advisorId: string): Promise<{ 
    connected: boolean; 
    email?: string; 
    lastSynced?: string;
    error?: string;
  }> {
    try {
      console.log('Verificando si el asesor tiene un calendario conectado:', advisorId);
      
      // Obtener el asesor de la base de datos
      const { data: advisor, error } = await supabase
        .from('advisors')
        .select('google_account_email, calendar_refresh_token, calendar_sync_token, updated_at')
        .eq('id', advisorId)
        .single();
      
      if (error) {
        console.error('Error al obtener datos del asesor:', error);
        return { 
          connected: false, 
          error: 'Error al verificar la conexión con Google Calendar.' 
        };
      }
      
      if (!advisor) {
        console.error('No se encontró el asesor con ID:', advisorId);
        return { 
          connected: false, 
          error: 'No se encontró el perfil del asesor.' 
        };
      }
      
      // Verificar si tiene un token de refresco (lo que indica que se ha conectado)
      const hasRefreshToken = !!advisor.calendar_refresh_token;
      
      console.log('Resultado de la verificación:');
      console.log('- Email de Google:', advisor.google_account_email || 'No conectado');
      console.log('- Token de refresco:', hasRefreshToken ? 'Presente' : 'Ausente');
      console.log('- Última sincronización:', advisor.updated_at || 'Nunca');
      
      return {
        connected: hasRefreshToken,
        email: advisor.google_account_email || undefined,
        lastSynced: advisor.updated_at || undefined
      };
    } catch (error: any) {
      console.error('Error al verificar la conexión con Google Calendar:', error);
      return { 
        connected: false, 
        error: error.message || 'Error desconocido al verificar la conexión.' 
      };
    }
  }
};

export default googleCalendarService;
