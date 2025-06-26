// API Serverless para Vercel para manejar la autenticación con Google Calendar (versión diagnóstico)
const axios = require('axios');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
dotenv.config();

// Recuperar las variables de entorno necesarias
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.VITE_GOOGLE_REDIRECT_URI || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// URL para el intercambio de tokens de Google
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Inicializar cliente de Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configurar logs detallados
const logRequestDetails = (req) => {
  console.log('==== DETALLES DE LA SOLICITUD API ====');
  console.log(`Método: ${req.method}`);
  console.log(`URL: ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.body) {
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.code) {
      sanitizedBody.code = sanitizedBody.code.substring(0, 10) + '...';
    }
    if (sanitizedBody.client_secret) {
      sanitizedBody.client_secret = '[REDACTED]';
    }
    console.log('Body:', JSON.stringify(sanitizedBody, null, 2));
  }
  console.log('====================================');
};

// Función para validar las variables de entorno
const validateEnvVars = () => {
  const missingVars = [];
  
  if (!GOOGLE_CLIENT_ID) missingVars.push('VITE_GOOGLE_CLIENT_ID');
  if (!GOOGLE_CLIENT_SECRET) missingVars.push('VITE_GOOGLE_CLIENT_SECRET');
  if (!GOOGLE_REDIRECT_URI) missingVars.push('VITE_GOOGLE_REDIRECT_URI');
  if (!SUPABASE_URL) missingVars.push('VITE_SUPABASE_URL');
  if (!SUPABASE_ANON_KEY) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  if (missingVars.length > 0) {
    console.error(`Faltan variables de entorno: ${missingVars.join(', ')}`);
    return false;
  }
  
  console.log('Variables de entorno validadas correctamente:');
  console.log(`- VITE_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? 'Configurado' : 'No configurado'}`);
  console.log(`- VITE_GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? 'Configurado' : 'No configurado'}`);
  console.log(`- VITE_GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}`);
  console.log(`- VITE_SUPABASE_URL: ${SUPABASE_URL ? 'Configurado' : 'No configurado'}`);
  console.log(`- VITE_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? 'Configurado' : 'No configurado'}`);
  
  return true;
};

// Función para guardar tokens en Supabase
const saveTokensToSupabase = async (tokens, advisorId) => {
  if (!advisorId) {
    console.error('No se proporcionó ID de asesor para guardar tokens');
    return { success: false, error: 'No se proporcionó ID de asesor' };
  }

  try {
    console.log(`Guardando tokens para el asesor ID: ${advisorId}`);
    
    // Calcular expiración del token
    const expiresIn = tokens.expires_in || 3600;
    const tokenExpiry = new Date();
    tokenExpiry.setSeconds(tokenExpiry.getSeconds() + expiresIn);
    
    // Preparar datos para guardar en Supabase
    const tokenData = {
      calendar_sync_token: JSON.stringify({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokenExpiry.toISOString(),
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope
      }),
      calendar_refresh_token: tokens.refresh_token,
      google_account_email: tokens.scope?.includes('email') ? tokens.email : 'conectado@gmail.com',
      updated_at: new Date().toISOString()
    };
    
    console.log('Datos de token preparados para guardar (sin tokens sensibles):', {
      ...tokenData,
      calendar_sync_token: 'JSON con tokens (omitido)',
      calendar_refresh_token: 'Token de refresco (omitido)'
    });
    
    // Actualizar el registro del asesor en Supabase
    const { data, error } = await supabase
      .from('advisors')
      .update(tokenData)
      .eq('id', advisorId);
    
    if (error) {
      console.error('Error al guardar tokens en Supabase:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Tokens guardados exitosamente en Supabase');
    return { success: true };
  } catch (error) {
    console.error('Error al guardar tokens:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Función API serverless para manejar la autenticación con Google (versión diagnóstico)
 * Soporta tanto el intercambio de código por tokens como el refresco de tokens
 * Incluye redirección a la página de diagnóstico
 */
module.exports = async function handler(req, res) {
  console.log('\n\n==== NUEVA SOLICITUD API RECIBIDA (DIAGNÓSTICO) ====');
  console.log(`Fecha/Hora: ${new Date().toISOString()}`);
  console.log(`Método: ${req.method}`);
  console.log(`URL: ${req.url}`);
  
  // Configuraciones CORS para el entorno de desarrollo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Si es una solicitud OPTIONS (preflight), responder y terminar
  if (req.method === 'OPTIONS') {
    console.log('Solicitud OPTIONS recibida, respondiendo con 200 OK');
    return res.status(200).end();
  }
  
  // Solo permitir solicitudes POST para seguridad
  if (req.method !== 'POST') {
    console.error(`Método no permitido: ${req.method}`);
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Registrar detalles de la solicitud
  logRequestDetails(req);

  try {
    // Validar variables de entorno
    if (!validateEnvVars()) {
      return res.status(500).json({ 
        error: 'Error de configuración del servidor',
        details: 'Faltan credenciales en las variables de entorno'
      });
    }
    
    // Extraer parámetros del cuerpo de la solicitud
    const { code, advisorId, redirectUrl } = req.body;
    
    console.log('Parámetros recibidos:');
    console.log(`- code: ${code ? 'Presente (primeros caracteres: ' + code.substring(0, 10) + '...)' : 'No presente'}`);
    console.log(`- advisorId: ${advisorId || 'No especificado'}`);
    console.log(`- redirectUrl: ${redirectUrl || 'No especificado'}`);
    
    // Verificar que se proporcionó un código
    if (!code) {
      console.error('No se proporcionó código de autorización');
      return res.status(400).json({ 
        error: 'Parámetros insuficientes',
        details: 'Se requiere code para el intercambio de tokens'
      });
    }

    // Preparar datos para la solicitud a Google
    const data = {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code: code,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    };
    
    console.log('Datos para intercambio de tokens (client_secret omitido):');
    console.log({
      client_id: GOOGLE_CLIENT_ID,
      code: code.substring(0, 10) + '...',
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    try {
      // Enviar solicitud a Google para intercambio de tokens
      console.log(`Enviando solicitud a Google: ${GOOGLE_TOKEN_URL}`);
      const response = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams(data), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      // Registrar respuesta exitosa
      console.log('✅ Tokens obtenidos exitosamente de Google');
      console.log('Código de estado:', response.status);
      console.log('Tokens recibidos:');
      console.log('- access_token:', response.data.access_token ? 'Presente (primeros caracteres: ' + response.data.access_token.substring(0, 5) + '...)' : 'Ausente');
      console.log('- refresh_token:', response.data.refresh_token ? 'Presente' : 'Ausente');
      console.log('- expires_in:', response.data.expires_in);
      console.log('- token_type:', response.data.token_type);
      
      // Si se proporcionó un ID de asesor, guardar los tokens en Supabase
      let saveResult = { success: true };
      if (advisorId) {
        console.log(`Guardando tokens para el asesor ID: ${advisorId}`);
        saveResult = await saveTokensToSupabase(response.data, advisorId);
      } else {
        console.log('No se proporcionó ID de asesor, omitiendo guardado en base de datos');
      }
      
      // Determinar URL de redirección
      let finalRedirectUrl = redirectUrl;
      if (!finalRedirectUrl) {
        // URL predeterminada para la página de diagnóstico
        finalRedirectUrl = '/public/diagnostico-oauth-google.html';
      }
      
      // Añadir información de éxito a la URL de redirección
      const redirectUrlObj = new URL(finalRedirectUrl, 'http://localhost');
      redirectUrlObj.searchParams.append('success', 'true');
      redirectUrlObj.searchParams.append('tokenSaved', saveResult.success.toString());
      
      if (saveResult.error) {
        redirectUrlObj.searchParams.append('saveError', encodeURIComponent(saveResult.error));
      }
      
      // Redireccionar al usuario a la página de diagnóstico con información de éxito
      console.log(`Redireccionando a: ${redirectUrlObj.pathname}${redirectUrlObj.search}`);
      return res.redirect(302, `${redirectUrlObj.pathname}${redirectUrlObj.search}`);
      
    } catch (googleError) {
      // Manejar errores específicos de la llamada a Google
      console.error('❌ Error en la llamada a Google API:');
      
      if (googleError.response) {
        console.error('Estado de respuesta:', googleError.response.status);
        console.error('Datos de respuesta:', googleError.response.data);
        
        // Errores comunes de OAuth
        if (googleError.response.data.error === 'invalid_grant') {
          console.error('Error de invalid_grant: Código de autorización inválido o ya utilizado');
          return res.status(400).json({
            error: 'Código de autorización inválido',
            details: 'El código de autorización ya ha sido utilizado o es inválido. Intenta autorizar nuevamente.',
            google_error: googleError.response.data
          });
        }
        
        if (googleError.response.data.error === 'redirect_uri_mismatch') {
          console.error('Error de redirect_uri_mismatch: La URL de redirección no coincide con la configurada en Google Cloud Console');
          console.error('URL de redirección configurada:', GOOGLE_REDIRECT_URI);
          return res.status(400).json({
            error: 'URL de redirección incorrecta',
            details: 'La URL de redirección no coincide con la configurada en Google Cloud Console.',
            configured_uri: GOOGLE_REDIRECT_URI,
            google_error: googleError.response.data
          });
        }
        
        // Otros errores con respuesta
        return res.status(googleError.response.status).json({
          error: 'Error en la autenticación con Google',
          details: googleError.response.data,
          message: googleError.message
        });
      } else {
        // Errores sin respuesta (problemas de red, etc.)
        console.error('Mensaje de error:', googleError.message);
        console.error('Stack trace:', googleError.stack);
        return res.status(500).json({
          error: 'Error de conexión con Google',
          details: googleError.message
        });
      }
    }
  } catch (error) {
    // Manejar errores generales de la función API
    console.error('❌ Error general en la función API:', error);
    console.error('Mensaje:', error.message);
    console.error('Stack trace:', error.stack);
    
    return res.status(500).json({
      error: 'Error interno del servidor',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
