import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Calendar, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { googleCalendarService } from './googleCalendarService';
import { advisoryService } from './advisoryService';

interface GoogleCalendarAuthProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const GoogleCalendarAuth: React.FC<GoogleCalendarAuthProps> = ({
  onSuccess,
  onCancel
}) => {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  
  // Verificar si el usuario es asesor y obtener su ID
  useEffect(() => {
    const checkAdvisor = async () => {
      if (!user) return;
      
      try {
        const advisor = await advisoryService.getAdvisorByUserId(user.id);
        
        if (advisor) {
          setAdvisorId(advisor.id);
        } else {
          setError('No tienes un perfil de asesor. Contacta al administrador.');
        }
      } catch (err) {
        console.error('Error al verificar perfil de asesor:', err);
        setError('Error al verificar tu perfil de asesor.');
      }
    };
    
    checkAdvisor();
  }, [user]);
  
  // Procesar el código de autorización si existe en la URL
  useEffect(() => {
    const processAuthCode = async () => {
      if (!advisorId) return;
      
      // Obtener el código de autorización de la URL
      const urlParams = new URLSearchParams(location.search);
      const code = urlParams.get('code');
      
      if (code) {
        setLoading(true);
        setError(null);
        
        try {
          // Intercambiar el código por tokens
          const tokens = await googleCalendarService.exchangeCodeForTokens(code);
          
          // Guardar los tokens en la base de datos
          const saved = await googleCalendarService.saveTokensForAdvisor(advisorId, tokens);
          
          if (saved) {
            setSuccess(true);
            
            // Limpiar la URL
            navigate(location.pathname, { replace: true });
            
            if (onSuccess) {
              setTimeout(() => onSuccess(), 2000);
            }
          } else {
            throw new Error('No se pudieron guardar los tokens.');
          }
        } catch (err) {
          console.error('Error al procesar código de autorización:', err);
          setError('Error al conectar con Google Calendar. Por favor, inténtalo de nuevo.');
        } finally {
          setLoading(false);
        }
      }
    };
    
    processAuthCode();
  }, [location, advisorId, navigate, onSuccess]);
  
  // Iniciar el flujo de autorización
  const handleStartAuth = () => {
    if (!advisorId) {
      setError('No se pudo obtener tu perfil de asesor.');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Mostrar información detallada sobre la configuración actual
      console.log('=== INICIANDO PROCESO DE AUTORIZACIÓN CON GOOGLE CALENDAR ===');
      console.log('Información de la aplicación:');
      console.log('- URL actual completa:', window.location.href);
      console.log('- Protocolo:', window.location.protocol);
      console.log('- Host:', window.location.host);
      console.log('- Hostname:', window.location.hostname);
      console.log('- Pathname:', window.location.pathname);
      console.log('- Origen calculado:', window.location.origin);
      console.log('- URL de redirección configurada en .env:', import.meta.env.VITE_GOOGLE_REDIRECT_URI);
      
      // Verificar que la URL de redirección está configurada correctamente
      if (!import.meta.env.VITE_GOOGLE_REDIRECT_URI) {
        throw new Error('La URL de redirección (VITE_GOOGLE_REDIRECT_URI) no está configurada en el archivo .env');
      }
      
      // Verificar que la URL de redirección coincide con la esperada para este entorno
      let expectedCallbackUrl = '';
      
      // Determinar si estamos en desarrollo o producción
      if (window.location.hostname === 'localhost') {
        // Entorno de desarrollo
        expectedCallbackUrl = window.location.origin + '/auth/google/callback';
      } else {
        // Entorno de producción (Vercel u otro)
        expectedCallbackUrl = 'https://' + window.location.hostname + '/auth/google/callback';
      }
      
      console.log('- URL de callback esperada para este entorno:', expectedCallbackUrl);
      
      if (import.meta.env.VITE_GOOGLE_REDIRECT_URI !== expectedCallbackUrl) {
        console.warn('\u26A0\uFE0F ADVERTENCIA: La URL de redirección configurada NO coincide con la URL esperada para este entorno.');
        console.warn('- Configurada en .env:', import.meta.env.VITE_GOOGLE_REDIRECT_URI);
        console.warn('- Esperada para este entorno:', expectedCallbackUrl);
        console.warn('Esto puede causar el error "redirect_uri_mismatch" en Google OAuth.');
        console.warn('Asegúrate de que:');
        console.warn('1. La variable VITE_GOOGLE_REDIRECT_URI en Vercel coincide con la URL de tu aplicación desplegada');
        console.warn('2. La misma URL está configurada en Google Cloud Console como URI de redirección autorizada');
      }
      
      // Obtener la URL de autorización
      const authUrl = googleCalendarService.getAuthorizationUrl();
      console.log('URL de autorización generada:', authUrl);
      
      // Analizar la URL de autorización para verificar los parámetros
      try {
        const authUrlObj = new URL(authUrl);
        const params = new URLSearchParams(authUrlObj.search);
        console.log('Parámetros de la URL de autorización:');
        console.log('- client_id:', params.get('client_id') ? params.get('client_id')!.substring(0, 10) + '...' : 'No presente');
        console.log('- redirect_uri:', params.get('redirect_uri'));
        console.log('- response_type:', params.get('response_type'));
        console.log('- scope:', params.get('scope'));
        console.log('- access_type:', params.get('access_type'));
        console.log('- prompt:', params.get('prompt'));
      } catch (e) {
        console.error('Error al analizar la URL de autorización:', e);
      }
      
      // Redireccionar al usuario
      console.log('Redireccionando al usuario a la página de autorización de Google...');
      window.location.href = authUrl;
    } catch (err: any) {
      console.error('Error al iniciar autorización:', err);
      
      // Mostrar mensaje de error más específico
      if (err.message && err.message.includes('Credenciales de Google no configuradas')) {
        setError('Las credenciales de Google Calendar no están configuradas correctamente. Por favor, contacta al administrador.');
      } else if (err.message && err.message.includes('URL de redirección no configurada')) {
        setError('La URL de redirección no está configurada correctamente. Por favor, contacta al administrador.');
      } else {
        setError(`Error al iniciar el proceso de autorización: ${err.message || 'Error desconocido'}`);
      }
      
      setLoading(false);
    }
  };
  
  // Cancelar el proceso
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-semibold mb-4 flex items-center">
        <Calendar className="mr-2 text-blue-500" />
        Conectar con Google Calendar
      </h3>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-start">
          <AlertCircle className="mr-2 mt-0.5 flex-shrink-0" size={18} />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <Check className="mr-2 flex-shrink-0" size={18} />
          <span>¡Conexión exitosa con Google Calendar!</span>
        </div>
      )}
      
      <div className="mb-6">
        <p className="text-gray-700 mb-2">
          Para sincronizar tus sesiones de asesoría con Google Calendar, necesitas autorizar el acceso a tu cuenta.
        </p>
        <p className="text-gray-700 mb-4">
          Al conectar tu cuenta, podrás:
        </p>
        <ul className="list-disc pl-5 mb-4 text-gray-700 space-y-1">
          <li>Ver las sesiones de asesoría en tu calendario de Google</li>
          <li>Recibir notificaciones automáticas de nuevas sesiones</li>
          <li>Gestionar tu disponibilidad de forma más eficiente</li>
        </ul>
        <p className="text-sm text-gray-500 mb-4">
          Solo solicitamos los permisos necesarios para gestionar eventos en tu calendario. No accederemos a otros datos de tu cuenta de Google.
        </p>
      </div>
      
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        
        <button
          type="button"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          onClick={handleStartAuth}
          disabled={loading || !advisorId}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={18} />
              Conectando...
            </>
          ) : (
            <>
              <Calendar className="mr-2" size={18} />
              Conectar con Google Calendar
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default GoogleCalendarAuth;
