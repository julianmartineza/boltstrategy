import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { advisoryService } from '../../components/advisory/advisoryService';
import { googleCalendarService } from '../../components/advisory/googleCalendarService';

const GoogleAuthCallback: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);
  
  useEffect(() => {
    const processAuthCode = async () => {
      if (!user) {
        console.log('GoogleAuthCallback: No hay usuario autenticado, redirigiendo al login');
        navigate('/login', { replace: true });
        return;
      }
      
      try {
        console.log('GoogleAuthCallback: Procesando código de autorización...');
        console.log('GoogleAuthCallback: URL completa:', window.location.href);
        
        // Obtener el código de autorización de la URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        const errorParam = urlParams.get('error');
        
        if (errorParam) {
          console.error('GoogleAuthCallback: Error recibido en los parámetros de URL:', errorParam);
          throw new Error(`Error de autorización de Google: ${errorParam}`);
        }
        
        if (!code) {
          console.error('GoogleAuthCallback: No se recibió código de autorización en la URL');
          throw new Error('No se recibió código de autorización');
        }
        
        console.log('GoogleAuthCallback: Código de autorización recibido (primeros caracteres):', code.substring(0, 10) + '...');
        
        // Verificar si el usuario es asesor
        console.log('GoogleAuthCallback: Verificando perfil de asesor para el usuario:', user.id);
        const advisor = await advisoryService.getAdvisorByUserId(user.id);
        
        if (!advisor) {
          console.error('GoogleAuthCallback: No se encontró perfil de asesor para el usuario:', user.id);
          throw new Error('No tienes un perfil de asesor configurado');
        }
        
        console.log('GoogleAuthCallback: Perfil de asesor encontrado:', advisor.id);
        
        // Intercambiar el código por tokens
        console.log('GoogleAuthCallback: Intercambiando código por tokens...');
        console.log('GoogleAuthCallback: Código de autorización:', code.substring(0, 10) + '...');
        
        try {
          const tokens = await googleCalendarService.exchangeCodeForTokens(code);
          
          if (!tokens || !tokens.access_token) {
            console.error('GoogleAuthCallback: No se recibieron tokens válidos de Google');
            throw new Error('No se recibieron tokens válidos de Google');
          }
          
          console.log('GoogleAuthCallback: Tokens recibidos correctamente:');
          console.log('- access_token:', tokens.access_token ? 'Presente (primeros caracteres: ' + tokens.access_token.substring(0, 5) + '...)' : 'Ausente');
          console.log('- refresh_token:', tokens.refresh_token ? 'Presente' : 'Ausente');
          console.log('- expires_in:', tokens.expires_in);
          console.log('- token_type:', tokens.token_type);
          
          // Guardar los tokens en la base de datos
          console.log('GoogleAuthCallback: Guardando tokens en la base de datos para el asesor:', advisor.id);
          const saved = await googleCalendarService.saveTokensForAdvisor(advisor.id, tokens);
          
          if (!saved) {
            console.error('GoogleAuthCallback: Error al guardar tokens en la base de datos');
            throw new Error('No se pudieron guardar los tokens en la base de datos');
          }
          
          console.log('GoogleAuthCallback: Tokens guardados correctamente');
          
          // Verificar que los tokens se guardaron correctamente
          console.log('GoogleAuthCallback: Verificando que los tokens se guardaron correctamente...');
          const verifyToken = await googleCalendarService.getValidAccessToken(advisor.id);
          
          if (!verifyToken) {
            console.error('GoogleAuthCallback: No se pudo verificar que los tokens se guardaron correctamente');
            throw new Error('No se pudo verificar la conexión con Google Calendar');
          }
          
          console.log('GoogleAuthCallback: Verificación exitosa. Se confirmó que los tokens están guardados y son accesibles.');
        } catch (tokenError: any) {
          console.error('GoogleAuthCallback: Error en el proceso de intercambio o guardado de tokens:', tokenError.message);
          throw new Error(`Error al procesar tokens: ${tokenError.message}`);
        }
        
        // Actualizar el correo de Google Calendar si no está configurado
        if (!advisor.google_account_email) {
          console.log('GoogleAuthCallback: Actualizando correo de Google Calendar...');
          // Aquí se podría hacer una llamada a la API de Google para obtener el correo
          // Por ahora, simplemente actualizamos con un valor genérico
          await advisoryService.saveAdvisor({
            id: advisor.id,
            google_account_email: 'conectado@gmail.com' // En una implementación real, obtendríamos el correo real
          });
          console.log('GoogleAuthCallback: Correo de Google Calendar actualizado');
        }
        
        console.log('GoogleAuthCallback: Conexión exitosa, redirigiendo al panel de asesor...');
        // Redirigir al panel de asesor
        navigate('/dashboard/advisor', { 
          replace: true,
          state: { calendarConnected: true }
        });
      } catch (err) {
        console.error('GoogleAuthCallback: Error al procesar código de autorización:', err);
        if (err instanceof Error) {
          console.error('GoogleAuthCallback: Mensaje de error:', err.message);
          console.error('GoogleAuthCallback: Stack trace:', err.stack);
        }
        setError(err instanceof Error ? err.message : 'Error al conectar con Google Calendar');
        setProcessing(false);
      }
    };
    
    processAuthCode();
  }, [user, location, navigate]);
  
  // Si hay un error, mostrar mensaje y botón para volver
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error de conexión</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => navigate('/dashboard/advisor', { replace: true })}
          >
            Volver al panel de asesor
          </button>
        </div>
      </div>
    );
  }
  
  // Pantalla de carga mientras se procesa
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center">
        {processing ? (
          <>
            <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Conectando con Google Calendar</h2>
            <p className="text-gray-600">
              Estamos procesando tu autorización. Por favor, espera un momento...
            </p>
            <div className="mt-4 text-xs text-gray-500">
              Si este proceso tarda más de 30 segundos, puede haber un problema con la conexión.
              Intenta revisar la consola del navegador para ver si hay errores.
            </div>
          </>
        ) : (
          <>
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-red-600">Error en el proceso</h2>
            <p className="text-gray-700">
              El proceso ha sido interrumpido. Por favor, intenta nuevamente.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
