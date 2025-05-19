import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { advisoryService } from './advisoryService';
import googleCalendarService from './googleCalendarService';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Loader2, CheckCircle, AlertCircle, Calendar, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface GoogleCalendarStatusProps {
  onConnect?: () => void;
}

const GoogleCalendarStatus: React.FC<GoogleCalendarStatusProps> = ({ onConnect }) => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    email?: string;
    lastSynced?: string;
    error?: string;
  } | null>(null);

  // Obtener el ID del asesor al cargar el componente
  useEffect(() => {
    const getAdvisorId = async () => {
      if (!user) return;
      
      try {
        const advisor = await advisoryService.getAdvisorByUserId(user.id);
        if (advisor) {
          setAdvisorId(advisor.id);
          checkConnectionStatus(advisor.id);
        } else {
          setError('No se encontró tu perfil de asesor.');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error al obtener el perfil de asesor:', err);
        setError(err.message || 'Error al obtener tu perfil de asesor.');
        setLoading(false);
      }
    };
    
    getAdvisorId();
  }, [user]);

  // Verificar el estado de la conexión con Google Calendar
  const checkConnectionStatus = async (id: string) => {
    try {
      setChecking(true);
      setError(null);
      
      const status = await googleCalendarService.isCalendarConnected(id);
      setConnectionStatus(status);
      
      if (status.error) {
        setError(status.error);
      }
    } catch (err: any) {
      console.error('Error al verificar la conexión con Google Calendar:', err);
      setError(err.message || 'Error al verificar la conexión con Google Calendar.');
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  // Manejar la conexión con Google Calendar
  const handleConnect = () => {
    if (onConnect) {
      onConnect();
    } else {
      // Redireccionar a la página de conexión
      window.location.href = '/dashboard/profile';
    }
  };

  // Formatear la fecha de última sincronización
  const formatLastSynced = (dateString?: string) => {
    if (!dateString) return 'Nunca';
    
    try {
      const date = new Date(dateString);
      return `Hace ${formatDistanceToNow(date, { locale: es })}`;
    } catch (err) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex flex-col items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
          <p className="text-center text-muted-foreground">Verificando el estado de la conexión...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Estado de Google Calendar
        </CardTitle>
        <CardDescription>
          Verifica el estado de la conexión con tu cuenta de Google Calendar
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {connectionStatus && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-full ${connectionStatus.connected ? 'bg-green-100' : 'bg-amber-100'}`}>
                {connectionStatus.connected ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {connectionStatus.connected 
                    ? 'Calendario conectado correctamente' 
                    : 'Calendario no conectado'}
                </p>
                {connectionStatus.connected && connectionStatus.email && (
                  <p className="text-sm text-muted-foreground">
                    Conectado a: {connectionStatus.email}
                  </p>
                )}
              </div>
            </div>
            
            {connectionStatus.connected && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm mb-1 font-medium">Detalles de la conexión:</p>
                <ul className="text-sm space-y-1">
                  <li>Última sincronización: {formatLastSynced(connectionStatus.lastSynced)}</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => advisorId && checkConnectionStatus(advisorId)}
          disabled={checking || !advisorId}
        >
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar estado
            </>
          )}
        </Button>
        
        {(!connectionStatus?.connected) && (
          <Button onClick={handleConnect}>
            <Calendar className="mr-2 h-4 w-4" />
            Conectar calendario
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default GoogleCalendarStatus;
