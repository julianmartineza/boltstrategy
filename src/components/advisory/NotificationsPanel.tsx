import React, { useState, useEffect } from 'react';
import { Bell, Calendar, Clock, CheckCircle, X, RefreshCw, User, MessageSquare } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { advisoryService } from './advisoryService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

// Interfaz para las notificaciones
interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'booking' | 'cancellation' | 'report' | 'assignment' | 'reminder';
  related_id?: string;
  read: boolean;
  created_at: string;
}

/**
 * Componente para mostrar y gestionar notificaciones relacionadas con asesorías
 */
const NotificationsPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  
  // Cargar notificaciones al montar el componente
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);
  
  // Función para cargar notificaciones
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Esta función debe implementarse en advisoryService
      const data = await advisoryService.getUserNotifications(user?.id || '');
      setNotifications(data);
    } catch (err: any) {
      console.error('Error al cargar notificaciones:', err);
      setError(err.message || 'Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para marcar una notificación como leída
  const markAsRead = async (notificationId: string) => {
    try {
      // Esta función debe implementarse en advisoryService
      const success = await advisoryService.markNotificationAsRead(notificationId);
      
      if (success) {
        // Actualizar el estado local
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, read: true } 
              : notification
          )
        );
      }
    } catch (err) {
      console.error('Error al marcar notificación como leída:', err);
    }
  };
  
  // Función para marcar todas las notificaciones como leídas
  const markAllAsRead = async () => {
    try {
      // Esta función debe implementarse en advisoryService
      const success = await advisoryService.markAllNotificationsAsRead(user?.id || '');
      
      if (success) {
        // Actualizar el estado local
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
      }
    } catch (err) {
      console.error('Error al marcar todas las notificaciones como leídas:', err);
    }
  };
  
  // Función para eliminar una notificación
  const deleteNotification = async (notificationId: string) => {
    try {
      // Esta función debe implementarse en advisoryService
      const success = await advisoryService.deleteNotification(notificationId);
      
      if (success) {
        // Actualizar el estado local
        setNotifications(prev => 
          prev.filter(notification => notification.id !== notificationId)
        );
      }
    } catch (err) {
      console.error('Error al eliminar notificación:', err);
    }
  };
  
  // Filtrar notificaciones según la pestaña activa
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    return notification.type === activeTab;
  });
  
  // Contar notificaciones no leídas
  const unreadCount = notifications.filter(notification => !notification.read).length;
  
  // Formatear fecha relativa
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: es
      });
    } catch (err) {
      return dateString;
    }
  };
  
  // Obtener icono según el tipo de notificación
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'cancellation':
        return <X className="h-5 w-5 text-red-500" />;
      case 'report':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'assignment':
        return <User className="h-5 w-5 text-purple-500" />;
      case 'reminder':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Obtener color de fondo según el tipo de notificación
  const getNotificationBgColor = (type: string, read: boolean) => {
    if (read) return 'bg-gray-50';
    
    switch (type) {
      case 'booking':
        return 'bg-blue-50';
      case 'cancellation':
        return 'bg-red-50';
      case 'report':
        return 'bg-green-50';
      case 'assignment':
        return 'bg-purple-50';
      case 'reminder':
        return 'bg-amber-50';
      default:
        return 'bg-gray-100';
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notificaciones</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} sin leer
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={fetchNotifications}
                    disabled={loading}
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actualizar notificaciones</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Marcar todas como leídas
            </Button>
          </div>
        </div>
        <CardDescription>
          Mantente al día con tus sesiones de asesoría y actualizaciones importantes.
        </CardDescription>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-6">
            <TabsTrigger value="all">
              Todas
              <Badge variant="outline" className="ml-2">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Sin leer
              <Badge variant="outline" className="ml-2">
                {unreadCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="booking">Reservas</TabsTrigger>
            <TabsTrigger value="cancellation">Cancelaciones</TabsTrigger>
            <TabsTrigger value="report">Reportes</TabsTrigger>
            <TabsTrigger value="assignment">Asignaciones</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>No tienes notificaciones {activeTab !== 'all' ? 'en esta categoría' : ''}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {filteredNotifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg border ${getNotificationBgColor(notification.type, notification.read)} ${!notification.read ? 'border-l-4 border-l-blue-500' : 'border-gray-200'}`}
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-2 text-gray-400">
                          <span className="text-xs">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                          <div className="flex gap-1">
                            {!notification.read && (
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => markAsRead(notification.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => deleteNotification(notification.id)}
                            >
                              <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <p className={`text-sm mt-1 ${!notification.read ? 'text-gray-700' : 'text-gray-500'}`}>
                        {notification.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between text-sm text-gray-500">
        <div>
          Mostrando {filteredNotifications.length} de {notifications.length} notificaciones
        </div>
        <div>
          Última actualización: {new Date().toLocaleTimeString()}
        </div>
      </CardFooter>
    </Card>
  );
};

export default NotificationsPanel;
