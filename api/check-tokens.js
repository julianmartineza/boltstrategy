// Función API para verificar tokens de Google Calendar en la base de datos
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Manejar preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo permitir método GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Verificar parámetros
    const { advisorId } = req.query;
    
    if (!advisorId) {
      return res.status(400).json({ error: 'ID del asesor requerido' });
    }

    console.log(`Verificando tokens para el asesor: ${advisorId}`);

    // Inicializar cliente Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Variables de entorno de Supabase no configuradas');
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consultar tokens del asesor
    const { data, error } = await supabase
      .from('advisors')
      .select('calendar_sync_token, calendar_refresh_token')
      .eq('id', advisorId)
      .single();

    if (error) {
      console.error('Error al consultar tokens:', error.message);
      return res.status(500).json({ error: `Error al consultar tokens: ${error.message}` });
    }

    if (!data) {
      console.log('No se encontró el asesor');
      return res.status(404).json({ error: 'Asesor no encontrado', hasTokens: false });
    }

    // Verificar si hay tokens
    const hasCalendarSyncToken = !!data.calendar_sync_token;
    const hasCalendarRefreshToken = !!data.calendar_refresh_token;
    const hasTokens = hasCalendarSyncToken || hasCalendarRefreshToken;

    // Preparar respuesta
    const response = {
      hasTokens,
      hasCalendarSyncToken,
      hasCalendarRefreshToken,
      // No devolvemos los tokens completos por seguridad
      calendarSyncToken: hasCalendarSyncToken ? 'Presente' : 'No presente',
      calendarRefreshToken: hasCalendarRefreshToken ? 'Presente' : 'No presente',
    };

    // Si hay un token de sincronización, intentar parsearlo para obtener información adicional
    if (hasCalendarSyncToken) {
      try {
        const tokenData = JSON.parse(data.calendar_sync_token);
        const now = Date.now();
        const expiresAt = tokenData.expires_at;
        const isExpired = now >= expiresAt;
        
        response.tokenInfo = {
          expiresAt: new Date(expiresAt).toISOString(),
          isExpired,
          timeRemaining: isExpired ? 'Expirado' : `${Math.round((expiresAt - now) / 1000 / 60)} minutos`,
          scope: tokenData.scope || 'No disponible'
        };
      } catch (e) {
        console.error('Error al parsear token:', e.message);
        response.tokenParseError = e.message;
      }
    }

    console.log('Verificación completada:', response);
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error inesperado:', error.message);
    return res.status(500).json({ error: `Error inesperado: ${error.message}` });
  }
}
