// Servidor proxy para autenticación con Google Calendar
// Este servidor maneja el intercambio de código por tokens sin exponer el Client Secret en el frontend
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ruta para intercambiar código por tokens
app.post('/api/exchange-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Se requiere un código de autorización' });
    }
    
    console.log('Recibido código de autorización:', code.substring(0, 10) + '...');
    
    // Preparar parámetros para la solicitud a Google
    const params = new URLSearchParams();
    params.append('client_id', process.env.VITE_GOOGLE_CLIENT_ID);
    params.append('client_secret', process.env.VITE_GOOGLE_CLIENT_SECRET);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', process.env.VITE_GOOGLE_REDIRECT_URI);
    
    console.log('Enviando solicitud a Google para intercambiar código por tokens...');
    
    // Realizar solicitud a Google
    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('Respuesta recibida de Google:', {
      access_token: response.data.access_token ? 'Presente' : 'Ausente',
      refresh_token: response.data.refresh_token ? 'Presente' : 'Ausente',
      expires_in: response.data.expires_in
    });
    
    // Devolver los tokens al cliente
    res.json(response.data);
  } catch (error) {
    console.error('Error al intercambiar código por tokens:', error.response?.data || error.message);
    
    res.status(500).json({
      error: 'Error al intercambiar código por tokens',
      details: error.response?.data || error.message
    });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor proxy de autenticación ejecutándose en http://localhost:${PORT}`);
});
