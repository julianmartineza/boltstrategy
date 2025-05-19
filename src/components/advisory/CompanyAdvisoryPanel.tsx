import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Calendar, FileText, Building, Clock, Check, X, AlertTriangle, Bell, ClipboardList } from 'lucide-react';
import { advisoryService } from './advisoryService';
import { supabase } from '../../lib/supabase';
import NotificationsPanel from './NotificationsPanel';
import SessionReportManager from './SessionReportManager';

/**
 * Panel de asesorías para empresas
 * Permite a las empresas gestionar sus sesiones de asesoría, ver notificaciones y reportes
 */
const CompanyAdvisoryPanel: React.FC = () => {
  const { user } = useAuthStore();
  
  const [company, setCompany] = useState<any | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [advisors, setAdvisors] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'reports' | 'advisors' | 'notifications' | 'session-reports'>('calendar');
  
  // Cargar datos de la empresa
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;
        
        setLoading(true);
        
        // Verificar si el usuario tiene una empresa
        // Importamos supabase directamente desde el archivo lib/supabase
        const { data: companies, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (companyError) {
          throw companyError;
        }
        
        if (!companies) {
          setError('No se encontró tu perfil de empresa.');
          setLoading(false);
          return;
        }
        
        // Cargar reservas de la empresa
        const bookingsData = await advisoryService.getCompanyBookings(companies.id);
        
        // Cargar reportes pendientes de revisión
        const pendingReportsData = await advisoryService.getPendingReportsForCompany(companies.id);
        
        // Cargar asesores asignados
        const advisorsData = await advisoryService.getCompanyAdvisors(companies.id);
        
        setCompany(companies);
        setBookings(bookingsData);
        setPendingReports(pendingReportsData);
        setAdvisors(advisorsData);
      } catch (err) {
        console.error('Error al cargar datos de la empresa:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Filtrar reservas para el calendario
  const getUpcomingBookings = () => {
    const now = new Date();
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate >= now && booking.status === 'scheduled';
    });
  };
  
  // Filtrar reservas pasadas
  const getPastBookings = () => {
    const now = new Date();
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time);
      return bookingDate < now || booking.status === 'completed';
    });
  };
  
  // Formatear fecha y hora
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!company) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error || 'No se encontró tu perfil de empresa.'}</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Mensajes de error y éxito */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={20} />
            </button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}>
              <X size={20} />
            </button>
          </div>
        )}
        
        {/* Información de la empresa */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Panel de Asesorías</h1>
          <p className="text-gray-600">Bienvenido, {company.name}</p>
        </div>
        
        {/* Alertas */}
        {pendingReports.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4 flex items-start">
            <AlertTriangle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Tienes {pendingReports.length} reportes pendientes por revisar</p>
              <p className="text-sm">Por favor, revisa los reportes de las sesiones realizadas.</p>
            </div>
          </div>
        )}
        
        {/* Pestañas */}
        <div className="border-b mb-6">
          <nav className="flex flex-wrap -mb-px">
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'calendar'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('calendar')}
            >
              <div className="flex items-center">
                <Calendar size={18} className="mr-2" />
                Calendario
              </div>
            </button>
            
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('reports')}
            >
              <div className="flex items-center">
                <FileText size={18} className="mr-2" />
                Reportes Pendientes
                {pendingReports.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white rounded-full text-xs px-2 py-0.5">
                    {pendingReports.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'session-reports'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('session-reports')}
            >
              <div className="flex items-center">
                <ClipboardList size={18} className="mr-2" />
                Reportes de Sesiones
              </div>
            </button>
            
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'advisors'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('advisors')}
            >
              <div className="flex items-center">
                <Building size={18} className="mr-2" />
                Asesores Asignados
              </div>
            </button>
            
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'notifications'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('notifications')}
            >
              <div className="flex items-center">
                <Bell size={18} className="mr-2" />
                Notificaciones
              </div>
            </button>
          </nav>
        </div>
        
        {/* Contenido de las pestañas */}
        <div>
          {/* Calendario */}
          {activeTab === 'calendar' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Próximas Sesiones</h2>
              
              {getUpcomingBookings().length > 0 ? (
                <div className="space-y-4 mb-8">
                  {getUpcomingBookings().map((booking) => (
                    <div 
                      key={booking.id} 
                      className="p-4 rounded-md border border-blue-200 bg-blue-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{booking.session?.title || 'Sesión sin título'}</p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Calendar size={16} className="mr-2" />
                            {formatDateTime(booking.start_time)}
                          </p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Clock size={16} className="mr-2" />
                            {booking.session?.duration || 60} minutos
                          </p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Building size={16} className="mr-2" />
                            {booking.advisor?.name || 'Asesor no asignado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 mb-8">No tienes sesiones programadas próximamente.</p>
              )}
              
              <h2 className="text-xl font-semibold mb-4">Sesiones Pasadas</h2>
              
              {getPastBookings().length > 0 ? (
                <div className="space-y-4">
                  {getPastBookings().map((booking) => (
                    <div 
                      key={booking.id} 
                      className="p-4 rounded-md border border-gray-200 bg-gray-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{booking.session?.title || 'Sesión sin título'}</p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Calendar size={16} className="mr-2" />
                            {formatDateTime(booking.start_time)}
                          </p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Building size={16} className="mr-2" />
                            {booking.advisor?.name || 'Asesor no asignado'}
                          </p>
                        </div>
                        
                        <div>
                          {booking.status === 'completed' ? (
                            <span className="text-green-500 flex items-center">
                              <Check size={16} className="mr-1" />
                              Completada
                            </span>
                          ) : (
                            <span className="text-gray-500">
                              {booking.status === 'cancelled' ? 'Cancelada' : booking.status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No tienes sesiones pasadas.</p>
              )}
            </div>
          )}
          
          {/* Reportes Pendientes */}
          {activeTab === 'reports' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Reportes Pendientes de Revisión</h2>
              
              {pendingReports.length > 0 ? (
                <div className="space-y-4">
                  {pendingReports.map((report) => (
                    <div 
                      key={report.id} 
                      className="p-4 rounded-md border border-yellow-200 bg-yellow-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{report.title || 'Reporte sin título'}</p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Calendar size={16} className="mr-2" />
                            {formatDateTime(report.created_at)}
                          </p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Building size={16} className="mr-2" />
                            {report.advisor_name || 'Asesor no asignado'}
                          </p>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            className="bg-green-500 hover:bg-green-700 text-white text-sm py-1 px-3 rounded"
                            onClick={() => {
                              // Implementar lógica para aprobar reporte
                              advisoryService.updateSessionReportStatus(report.id, 'approved');
                              setSuccess('Reporte aprobado correctamente');
                              setPendingReports(pendingReports.filter(r => r.id !== report.id));
                            }}
                          >
                            Aprobar
                          </button>
                          <button
                            className="bg-red-500 hover:bg-red-700 text-white text-sm py-1 px-3 rounded"
                            onClick={() => {
                              // Implementar lógica para rechazar reporte
                              const feedback = prompt('Por favor, proporciona un feedback para el rechazo:');
                              if (feedback) {
                                advisoryService.updateSessionReportStatus(report.id, 'rejected', feedback);
                                setSuccess('Reporte rechazado correctamente');
                                setPendingReports(pendingReports.filter(r => r.id !== report.id));
                              }
                            }}
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No tienes reportes pendientes por revisar.</p>
              )}
            </div>
          )}
          
          {/* Asesores Asignados */}
          {activeTab === 'advisors' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Asesores Asignados</h2>
              
              {advisors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {advisors.map((advisor) => (
                    <div 
                      key={advisor.id} 
                      className="p-4 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <p className="font-medium">{advisor.name}</p>
                      <p className="text-gray-600 text-sm mt-1">
                        {advisor.specialization || 'Sin especialización'}
                      </p>
                      <p className="text-gray-600 text-sm mt-1">
                        {advisor.email}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No tienes asesores asignados.</p>
              )}
            </div>
          )}
          
          {/* Notificaciones */}
          {activeTab === 'notifications' && (
            <NotificationsPanel />
          )}
          
          {/* Reportes de Sesiones */}
          {activeTab === 'session-reports' && (
            <SessionReportManager />
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyAdvisoryPanel;
