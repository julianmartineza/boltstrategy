import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import googleCalendarService from './googleCalendarService';
import { advisoryService } from './advisoryService';

const GoogleAuthCallback: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  useEffect(() => {
    const processAuthCode = async () => {
      try {
        console.log('=== INICIO DEL PROCESO DE CALLBACK DE GOOGLE CALENDAR ===');
        console.log('URL completa:', window.location.href);
        console.log('Parámetros de búsqueda:', location.search);
        
        // Verificar que el usuario esté autenticado
        console.log('Verificando usuario...', user ? 'Usuario autenticado' : 'No hay usuario');
        if (!user) {
          const errorMsg = 'Debes iniciar sesión para completar este proceso.';
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        console.log('Usuario autenticado:', user.id);
        
        // Obtener el código de autorización de la URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        
        if (errorParam) {
          const errorMsg = `Error devuelto por Google: ${errorParam}`;
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        if (!code) {
          const errorMsg = 'No se recibió un código de autorización válido.';
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        
        console.log('Código de autorización recibido:', code.substring(0, 10) + '...');
        
        // Obtener el ID del asesor
        console.log('Obteniendo perfil de asesor para el usuario:', user.id);
        const advisor = await advisoryService.getAdvisorByUserId(user.id);
        
        if (!advisor) {
          const errorMsg = 'No se encontró tu perfil de asesor.';
          console.error(errorMsg);
          setError(errorMsg);
          setLoading(false);
          return;
        }
        console.log('Perfil de asesor encontrado:', advisor.id);
        
        // Intercambiar el código por tokens
        console.log('Intercambiando código por tokens...');
        try {
          const tokens = await googleCalendarService.exchangeCodeForTokens(code);
          console.log('Tokens recibidos:', {
            access_token: tokens.access_token ? '✓ Presente' : '✗ Ausente',
            refresh_token: tokens.refresh_token ? '✓ Presente' : '✗ Ausente',
            expires_in: tokens.expires_in
          });
          
          // Guardar los tokens en la base de datos
          console.log('Guardando tokens para el asesor:', advisor.id);
          const saved = await googleCalendarService.saveTokensForAdvisor(advisor.id, tokens);
          
          if (saved) {
            console.log('✅ Tokens guardados correctamente en la base de datos.');
            setSuccess(true);
            
            // Redireccionar después de 2 segundos
            console.log('Redireccionando a /dashboard/profile en 2 segundos...');
            setTimeout(() => {
              navigate('/dashboard/profile', { replace: true });
            }, 2000);
          } else {
            throw new Error('No se pudieron guardar los tokens en la base de datos.');
          }
        } catch (tokenError: any) {
          console.error('Error específico al intercambiar tokens:', tokenError);
          console.error('Mensaje de error:', tokenError.message);
          throw tokenError;
        }
      } catch (err: any) {
        console.error('Error al procesar código de autorización:', err);
        setError(`Error al conectar con Google Calendar: ${err.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    
    processAuthCode();
  }, [user, location, navigate]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-center mb-6">
          Conexión con Google Calendar
        </h2>
        
        {loading && (
          <div className="text-center py-8">
            <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">
              Procesando autorización...
            </p>
          </div>
        )}
        
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="text-red-500 mr-3 mt-0.5" size={20} />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => navigate('/dashboard/profile')}
                  className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Volver al perfil
                </button>
              </div>
            </div>
          </div>
        )}
        
        {success && !loading && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <CheckCircle className="text-green-500 mr-3 mt-0.5" size={20} />
              <div>
                <h3 className="text-green-800 font-medium">¡Conexión exitosa!</h3>
                <p className="text-green-700">
                  Tu cuenta de Google Calendar ha sido conectada correctamente.
                </p>
                <p className="text-green-600 mt-2">
                  Redireccionando a tu perfil...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
