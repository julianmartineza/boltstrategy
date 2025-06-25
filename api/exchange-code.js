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

/**
 * Función API serverless para manejar la autenticación con Google
 * Soporta tanto el intercambio de código por tokens como el refresco de tokens
 */
module.exports = async function handler(req, res) {
  // Solo permitir solicitudes POST para seguridad
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Configuraciones CORS para el entorno de desarrollo
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Si es una solicitud OPTIONS (preflight), responder y terminar
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extraer parámetros del cuerpo de la solicitud
    const { code, refreshToken, grantType } = req.body;

    // Validar que tenemos las credenciales necesarias
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('❌ Error: No se encontraron las credenciales de Google en las variables de entorno');
      return res.status(500).json({ 
        error: 'Error de configuración del servidor',
        details: 'Faltan credenciales de Google en las variables de entorno'
      });
    }

    // Preparar datos para la solicitud a Google según el tipo de operación
    let data;

    if (grantType === 'authorization_code' && code) {
      // Intercambio de código por tokens
      console.log('📤 Intercambiando código por tokens...');
      data = {
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      };
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
      return res.status(400).json({ 
        error: 'Parámetros insuficientes',
        details: 'Se requiere code para authorization_code o refreshToken para refresh_token'
      });
    }

    // Enviar solicitud a Google para intercambio de tokens
    const response = await axios.post(GOOGLE_TOKEN_URL, new URLSearchParams(data), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    // Devolver los tokens obtenidos al cliente
    console.log('✅ Tokens obtenidos exitosamente de Google');
    return res.status(200).json(response.data);

  } catch (error) {
    // Manejar errores
    console.error('❌ Error en autenticación Google:', error.response?.data || error.message);
    
    // Determinar el tipo de error para dar una respuesta más específica
    let statusCode = 500;
    let errorMessage = 'Error interno del servidor';
    let errorDetails = error.message;

    // Si tenemos una respuesta del API de Google, usar esos detalles
    if (error.response) {
      statusCode = error.response.status;
      errorMessage = 'Error en la autenticación con Google';
      errorDetails = error.response.data;
    }

    return res.status(statusCode).json({
      error: errorMessage,
      details: errorDetails
    });
  }
}
