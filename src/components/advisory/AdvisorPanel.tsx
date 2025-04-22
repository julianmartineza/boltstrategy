import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Calendar, FileText, Building, Clock, Check, X, AlertTriangle, UserCircle } from 'lucide-react';
import { advisoryService } from './advisoryService';
import { Advisor, AdvisoryBooking } from './types';
import AdvisoryReportForm from './AdvisoryReportForm';
import AdvisorProfileForm from './AdvisorProfileForm';

const AdvisorPanel: React.FC = () => {
  const { user } = useAuthStore();
  
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [bookings, setBookings] = useState<AdvisoryBooking[]>([]);
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'reports' | 'companies' | 'profile'>('calendar');
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  
  // Cargar datos del asesor
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;
        
        setLoading(true);
        
        // Verificar si el usuario es asesor
        const isAdvisor = await advisoryService.isUserAdvisor(user.id);
        
        if (!isAdvisor) {
          setError('No tienes permisos de asesor.');
          setLoading(false);
          return;
        }
        
        // Cargar perfil del asesor
        const advisorData = await advisoryService.getAdvisorByUserId(user.id);
        
        if (!advisorData) {
          setError('No se encontró tu perfil de asesor.');
          setLoading(false);
          return;
        }
        
        // Cargar reservas del asesor
        const bookingsData = await advisoryService.getAdvisorBookings(advisorData.id);
        
        // Cargar reportes pendientes
        const pendingReportsData = await advisoryService.getPendingReports(advisorData.id);
        
        // Cargar empresas asignadas
        const companiesData = await advisoryService.getAdvisorCompanies(advisorData.id);
        
        setAdvisor(advisorData);
        setBookings(bookingsData);
        setPendingReports(pendingReportsData);
        setCompanies(companiesData);
      } catch (err) {
        console.error('Error al cargar datos del asesor:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Función para crear un reporte
  const handleCreateReport = async (report: {
    bookingId: string;
    notes: string;
    commitments: string;
    submitted: boolean;
  }) => {
    try {
      setLoading(true);
      
      const reportId = await advisoryService.createReport({
        bookingId: report.bookingId,
        notes: report.notes,
        commitments: report.commitments,
        submitted: report.submitted
      });
      
      if (!reportId) {
        throw new Error('Error al crear el reporte');
      }
      
      // Recargar reportes pendientes
      if (advisor) {
        const updatedReports = await advisoryService.getPendingReports(advisor.id);
        setPendingReports(updatedReports);
      }
      
      setShowReportForm(false);
      setSelectedBooking(null);
      setSuccess('Reporte creado exitosamente.');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al crear reporte:', err);
      setError('Error al crear el reporte. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para abrir el formulario de reporte
  const handleOpenReportForm = (bookingId: string) => {
    setSelectedBooking(bookingId);
    setShowReportForm(true);
  };
  
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
  
  if (!advisor) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error || 'No se encontró tu perfil de asesor.'}</p>
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
        
        {/* Información del asesor */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Panel de Asesor</h1>
          <p className="text-gray-600">Bienvenido, {advisor.name}</p>
        </div>
        
        {/* Alertas */}
        {pendingReports.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4 flex items-start">
            <AlertTriangle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Tienes {pendingReports.length} actas pendientes por completar</p>
              <p className="text-sm">Por favor, completa las actas de las sesiones realizadas.</p>
            </div>
          </div>
        )}
        
        {/* Pestañas */}
        <div className="border-b mb-6">
          <nav className="flex -mb-px">
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
                Actas Pendientes
                {pendingReports.length > 0 && (
                  <span className="ml-2 bg-red-500 text-white rounded-full text-xs px-2 py-0.5">
                    {pendingReports.length}
                  </span>
                )}
              </div>
            </button>
            
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'companies'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('companies')}
            >
              <div className="flex items-center">
                <Building size={18} className="mr-2" />
                Empresas Asignadas
              </div>
            </button>

            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              <div className="flex items-center">
                <UserCircle size={18} className="mr-2" />
                Mi Perfil
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
                            {booking.company?.name || 'Empresa no asignada'}
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
                            {booking.company?.name || 'Empresa no asignada'}
                          </p>
                        </div>
                        
                        <div>
                          {booking.status === 'completed' ? (
                            <span className="text-green-500 flex items-center">
                              <Check size={16} className="mr-1" />
                              Completada
                            </span>
                          ) : (
                            <button
                              className="text-blue-500 hover:text-blue-700 text-sm"
                              onClick={() => handleOpenReportForm(booking.id)}
                            >
                              Crear Acta
                            </button>
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
          
          {/* Actas Pendientes */}
          {activeTab === 'reports' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Actas Pendientes</h2>
              
              {pendingReports.length > 0 ? (
                <div className="space-y-4">
                  {pendingReports.map((report) => (
                    <div 
                      key={report.booking_id} 
                      className="p-4 rounded-md border border-yellow-200 bg-yellow-50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{report.session_title || 'Sesión sin título'}</p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Calendar size={16} className="mr-2" />
                            {formatDateTime(report.start_time)}
                          </p>
                          <p className="text-gray-600 flex items-center mt-1">
                            <Building size={16} className="mr-2" />
                            {report.company_name || 'Empresa no asignada'}
                          </p>
                        </div>
                        
                        <button
                          className="bg-blue-500 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded"
                          onClick={() => handleOpenReportForm(report.booking_id)}
                        >
                          Completar Acta
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No tienes actas pendientes por completar.</p>
              )}
            </div>
          )}
          
          {/* Empresas Asignadas */}
          {activeTab === 'companies' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Empresas Asignadas</h2>
              
              {companies.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {companies.map((company) => (
                    <div 
                      key={`${company.company_id}-${company.program_id}`} 
                      className="p-4 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                    >
                      <p className="font-medium">{company.company_name}</p>
                      <p className="text-gray-600 text-sm mt-1">
                        Programa: {company.program_name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No tienes empresas asignadas.</p>
              )}
            </div>
          )}

          {/* Perfil de Asesor */}
          {activeTab === 'profile' && (
            <AdvisorProfileForm />
          )}
        </div>
      </div>
      
      {/* Formulario de reporte */}
      {showReportForm && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Crear Acta de Asesoría</h3>
            
            <AdvisoryReportForm
              bookingId={selectedBooking}
              onSubmit={handleCreateReport}
              onCancel={() => {
                setShowReportForm(false);
                setSelectedBooking(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorPanel;
