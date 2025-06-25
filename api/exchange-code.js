// API Serverless para Vercel para manejar la autenticación con Google Calendar
const axios = require('axios');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Recuperar las variables de entorno necesarias
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.VITE_GOOGLE_REDIRECT_URI || '';

// URL para el intercambio de tokens de Google
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

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
  
  if (missingVars.length > 0) {
    console.error(`Faltan variables de entorno: ${missingVars.join(', ')}`);
    return false;
  }
  
  console.log('Variables de entorno validadas correctamente:');
  console.log(`- VITE_GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID ? 'Configurado' : 'No configurado'}`);
  console.log(`- VITE_GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET ? 'Configurado' : 'No configurado'}`);
  console.log(`- VITE_GOOGLE_REDIRECT_URI: ${GOOGLE_REDIRECT_URI}`);
  
  return true;
};

/**
 * Función API serverless para manejar la autenticación con Google
 * Soporta tanto el intercambio de código por tokens como el refresco de tokens
 */
module.exports = async function handler(req, res) {
  console.log('\n\n==== NUEVA SOLICITUD API RECIBIDA ====');
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
        details: 'Faltan credenciales de Google en las variables de entorno'
      });
    }
    
    // Extraer parámetros del cuerpo de la solicitud
    const { code, refreshToken, grantType } = req.body;
    
    console.log('Parámetros recibidos:');
    console.log(`- grantType: ${grantType || 'No especificado'}`);
    console.log(`- code: ${code ? 'Presente (primeros caracteres: ' + code.substring(0, 10) + '...)' : 'No presente'}`);
    console.log(`- refreshToken: ${refreshToken ? 'Presente' : 'No presente'}`);
    

    // Preparar datos para la solicitud a Google según el tipo de operación
    let data;

    if (grantType === 'authorization_code' && code) {
      // Intercambio de código por tokens
      console.log('📤 Intercambiando código por tokens...');
      console.log('URL de redirección configurada:', GOOGLE_REDIRECT_URI);
      
      data = {
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
    } else if (grantType === 'refresh_token' && refreshToken) {
      // Refresco de tokens
      console.log('🔄 Refrescando token de acceso...');
      data = {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      };
    } else {
      // Parámetros insuficientes
      console.error('Parámetros insuficientes para la solicitud');
      return res.status(400).json({ 
        error: 'Parámetros insuficientes',
        details: 'Se requiere code para authorization_code o refreshToken para refresh_token'
      });
    }

    console.log(`Enviando solicitud a Google: ${GOOGLE_TOKEN_URL}`);
    
    try {
      // Enviar solicitud a Google para intercambio de tokens
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
      
      // Devolver los tokens obtenidos al cliente
      return res.status(200).json(response.data);
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
}
