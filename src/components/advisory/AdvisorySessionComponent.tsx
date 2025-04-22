import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Loader2, Calendar, Clock, User, Info, Check, X } from 'lucide-react';
import { advisoryService } from './advisoryService';
import { AdvisorySession, Advisor, AdvisoryBooking, AdvisoryAllocation, TimeSlot } from './types';
import AdvisoryBookingForm from './AdvisoryBookingForm';

interface AdvisorySessionComponentProps {
  sessionId: string;
  companyId: string;
}

const AdvisorySessionComponent: React.FC<AdvisorySessionComponentProps> = ({
  sessionId,
  companyId
}) => {
  const { user } = useAuthStore();
  
  const [session, setSession] = useState<AdvisorySession | null>(null);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [bookings, setBookings] = useState<AdvisoryBooking[]>([]);
  const [allocation, setAllocation] = useState<AdvisoryAllocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null);
  
  // Cargar datos de la sesión
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar sesión
        const sessionData = await advisoryService.getAdvisorySessionById(sessionId);
        if (!sessionData) {
          throw new Error('No se encontró la sesión de asesoría');
        }
        
        // Cargar asesores disponibles para esta empresa
        const advisorsData = await advisoryService.getCompanyAdvisors(companyId);
        
        // Cargar reservas existentes
        const bookingsData = await advisoryService.getCompanyBookings(companyId);
        
        // Cargar asignación de horas
        const allocationsData = await advisoryService.getCompanyAllocations(companyId);
        const moduleAllocation = allocationsData.find(a => {
          // Buscar la asignación que corresponde a este módulo
          // En una implementación real, necesitaríamos saber el módulo específico
          return true; // Por ahora tomamos la primera asignación
        });
        
        setSession(sessionData);
        setAdvisors(advisorsData);
        setBookings(bookingsData.filter(b => b.session_id === sessionId));
        setAllocation(moduleAllocation || null);
      } catch (err) {
        console.error('Error al cargar datos de asesoría:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    
    if (sessionId && companyId && user) {
      fetchData();
    }
  }, [sessionId, companyId, user]);
  
  // Función para abrir el formulario de reserva
  const handleStartBooking = (advisor: Advisor) => {
    setSelectedAdvisor(advisor);
    setShowBookingForm(true);
  };
  
  // Función para crear una reserva
  const handleCreateBooking = async (booking: {
    advisorId: string;
    startTime: Date;
    endTime: Date;
  }) => {
    if (!user || !session) return;
    
    try {
      setLoading(true);
      
      const bookingId = await advisoryService.createBooking({
        companyId,
        advisorId: booking.advisorId,
        sessionId,
        startTime: booking.startTime,
        endTime: booking.endTime,
        createdBy: user.id
      });
      
      if (!bookingId) {
        throw new Error('Error al crear la reserva');
      }
      
      // Recargar reservas
      const updatedBookings = await advisoryService.getCompanyBookings(companyId);
      const updatedAllocations = await advisoryService.getCompanyAllocations(companyId);
      
      setBookings(updatedBookings.filter(b => b.session_id === sessionId));
      setAllocation(updatedAllocations.find(a => a.id === allocation?.id) || null);
      setShowBookingForm(false);
      setSelectedAdvisor(null);
      setSuccess('Asesoría agendada exitosamente.');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al crear reserva:', err);
      setError('Error al agendar la asesoría. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para cancelar una reserva
  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm('¿Estás seguro de que deseas cancelar esta reserva?')) {
      try {
        setLoading(true);
        
        const success = await advisoryService.cancelBooking(bookingId);
        
        if (!success) {
          throw new Error('Error al cancelar la reserva');
        }
        
        // Recargar reservas
        const updatedBookings = await advisoryService.getCompanyBookings(companyId);
        const updatedAllocations = await advisoryService.getCompanyAllocations(companyId);
        
        setBookings(updatedBookings.filter(b => b.session_id === sessionId));
        setAllocation(updatedAllocations.find(a => a.id === allocation?.id) || null);
        setSuccess('Reserva cancelada exitosamente.');
        
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error('Error al cancelar reserva:', err);
        setError('Error al cancelar la reserva. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!session) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>No se encontró la sesión de asesoría solicitada.</p>
      </div>
    );
  }
  
  // Calcular minutos disponibles
  const availableMinutes = allocation 
    ? allocation.total_minutes - allocation.used_minutes 
    : 0;
  
  // Verificar si hay minutos suficientes para esta sesión
  const canBook = availableMinutes >= session.duration;
  
  return (
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
      
      {/* Información de la sesión */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{session.title}</h2>
        
        <div className="flex items-center text-gray-600 mb-2">
          <Clock size={18} className="mr-2" />
          <span>{session.duration} minutos</span>
        </div>
        
        {session.description && (
          <p className="text-gray-700 mb-4">{session.description}</p>
        )}
        
        {session.preparation_instructions && (
          <div className="bg-blue-50 p-4 rounded-md mb-4">
            <h3 className="font-semibold flex items-center mb-2">
              <Info size={18} className="mr-2 text-blue-500" />
              Instrucciones de preparación
            </h3>
            <p className="text-gray-700">{session.preparation_instructions}</p>
          </div>
        )}
      </div>
      
      {/* Información de horas disponibles */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h3 className="font-semibold mb-2">Horas de asesoría disponibles</h3>
        
        {allocation ? (
          <div>
            <div className="flex justify-between mb-2">
              <span>Total asignado:</span>
              <span className="font-medium">{Math.floor(allocation.total_minutes / 60)} horas {allocation.total_minutes % 60} minutos</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Utilizado:</span>
              <span className="font-medium">{Math.floor(allocation.used_minutes / 60)} horas {allocation.used_minutes % 60} minutos</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Disponible:</span>
              <span className={availableMinutes > 0 ? "text-green-600" : "text-red-600"}>
                {Math.floor(availableMinutes / 60)} horas {availableMinutes % 60} minutos
              </span>
            </div>
          </div>
        ) : (
          <p className="text-yellow-600">No hay horas asignadas para este módulo.</p>
        )}
      </div>
      
      {/* Reservas existentes */}
      {bookings.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold mb-3">Sesiones agendadas</h3>
          
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div 
                key={booking.id} 
                className={`p-4 rounded-md border ${
                  booking.status === 'completed' 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium flex items-center">
                      <Calendar size={16} className="mr-2" />
                      {new Date(booking.start_time).toLocaleDateString()} {new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    <p className="text-gray-600 flex items-center mt-1">
                      <User size={16} className="mr-2" />
                      {booking.advisor?.name || 'Asesor no asignado'}
                    </p>
                  </div>
                  
                  <div>
                    {booking.status === 'scheduled' && (
                      <button
                        className="text-red-500 hover:text-red-700 text-sm"
                        onClick={() => handleCancelBooking(booking.id)}
                      >
                        Cancelar
                      </button>
                    )}
                    
                    {booking.status === 'completed' && (
                      <span className="text-green-500 flex items-center">
                        <Check size={16} className="mr-1" />
                        Completada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Lista de asesores disponibles */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3">Asesores disponibles</h3>
        
        {advisors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {advisors.map((advisor) => (
              <div key={advisor.id} className="border rounded-md p-4 hover:bg-gray-50">
                <div className="flex items-start">
                  {advisor.photo_url && (
                    <img 
                      src={advisor.photo_url} 
                      alt={advisor.name}
                      className="w-16 h-16 rounded-full mr-4 object-cover"
                    />
                  )}
                  
                  <div className="flex-1">
                    <h4 className="font-medium">{advisor.name}</h4>
                    {advisor.specialty && (
                      <p className="text-sm text-gray-600 mb-1">{advisor.specialty}</p>
                    )}
                    {advisor.bio && (
                      <p className="text-sm text-gray-700 mb-2 line-clamp-2">{advisor.bio}</p>
                    )}
                    
                    <button
                      className="bg-blue-500 hover:bg-blue-700 text-white text-sm py-1 px-3 rounded"
                      onClick={() => handleStartBooking(advisor)}
                      disabled={!canBook}
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600">No hay asesores asignados a tu empresa.</p>
        )}
      </div>
      
      {/* Mensaje si no hay horas suficientes */}
      {!canBook && allocation && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-4">
          <p>No tienes suficientes horas disponibles para agendar esta sesión. Necesitas al menos {session.duration} minutos.</p>
        </div>
      )}
      
      {/* Formulario de reserva */}
      {showBookingForm && selectedAdvisor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Agendar asesoría con {selectedAdvisor.name}</h3>
            
            <AdvisoryBookingForm
              advisor={selectedAdvisor}
              session={session}
              onSubmit={handleCreateBooking}
              onCancel={() => {
                setShowBookingForm(false);
                setSelectedAdvisor(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvisorySessionComponent;
