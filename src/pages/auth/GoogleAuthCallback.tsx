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
        // Si no hay usuario autenticado, redirigir al login
        navigate('/login', { replace: true });
        return;
      }
      
      try {
        // Obtener el código de autorización de la URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get('code');
        
        if (!code) {
          throw new Error('No se recibió código de autorización');
        }
        
        // Verificar si el usuario es asesor
        const advisor = await advisoryService.getAdvisorByUserId(user.id);
        
        if (!advisor) {
          throw new Error('No tienes un perfil de asesor configurado');
        }
        
        // Intercambiar el código por tokens
        const tokens = await googleCalendarService.exchangeCodeForTokens(code);
        
        // Guardar los tokens en la base de datos
        const saved = await googleCalendarService.saveTokensForAdvisor(advisor.id, tokens);
        
        if (!saved) {
          throw new Error('No se pudieron guardar los tokens');
        }
        
        // Actualizar el correo de Google Calendar si no está configurado
        if (!advisor.google_account_email) {
          // Aquí se podría hacer una llamada a la API de Google para obtener el correo
          // Por ahora, simplemente actualizamos con un valor genérico
          await advisoryService.saveAdvisor({
            id: advisor.id,
            google_account_email: 'conectado@gmail.com' // En una implementación real, obtendríamos el correo real
          });
        }
        
        // Redirigir al panel de asesor
        navigate('/dashboard/advisor', { 
          replace: true,
          state: { calendarConnected: true }
        });
      } catch (err) {
        console.error('Error al procesar código de autorización:', err);
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
        <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Conectando con Google Calendar</h2>
        <p className="text-gray-600">
          Estamos procesando tu autorización. Por favor, espera un momento...
        </p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
