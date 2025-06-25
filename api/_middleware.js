// Middleware para registrar todas las solicitudes a la API
module.exports = (req, res, next) => {
  console.log(`[API Middleware] ${req.method} ${req.url}`);
  console.log('[API Middleware] Headers:', req.headers);
  
  // Si es una solicitud POST, registrar el cuerpo
  if (req.method === 'POST' && req.body) {
    console.log('[API Middleware] Body:', JSON.stringify(req.body, null, 2));
  }
  
  // Continuar con la solicitud
  if (typeof next === 'function') {
    next();
  }
};
