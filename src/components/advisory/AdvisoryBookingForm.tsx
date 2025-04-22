import React, { useState, useEffect } from 'react';
import { Loader2, Calendar, Clock, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { advisoryService } from './advisoryService';
import { Advisor, AdvisorySession, TimeSlot, AvailabilityDay } from './types';

interface AdvisoryBookingFormProps {
  advisor: Advisor;
  session: AdvisorySession;
  onSubmit: (booking: {
    advisorId: string;
    startTime: Date;
    endTime: Date;
  }) => void;
  onCancel: () => void;
}

const AdvisoryBookingForm: React.FC<AdvisoryBookingFormProps> = ({
  advisor,
  session,
  onSubmit,
  onCancel
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar disponibilidad para el mes actual
  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        
        // Generar días del mes actual
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const days: AvailabilityDay[] = [];
        
        // Solo cargamos disponibilidad para días futuros
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, month, day);
          
          // Omitir días pasados y fines de semana
          if (date < today || date.getDay() === 0 || date.getDay() === 6) {
            continue;
          }
          
          // Cargar disponibilidad para este día
          const slots = await advisoryService.getAdvisorAvailability(advisor.id, date);
          
          days.push({
            date,
            slots
          });
        }
        
        setAvailabilityDays(days);
      } catch (err) {
        console.error('Error al cargar disponibilidad:', err);
        setError('Error al cargar la disponibilidad. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAvailability();
  }, [advisor.id, currentDate]);
  
  // Cambiar al mes anterior
  const handlePreviousMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    setCurrentDate(prevMonth);
    setSelectedDate(null);
    setSelectedSlot(null);
  };
  
  // Cambiar al mes siguiente
  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentDate(nextMonth);
    setSelectedDate(null);
    setSelectedSlot(null);
  };
  
  // Seleccionar un día
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };
  
  // Seleccionar un horario
  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };
  
  // Confirmar la reserva
  const handleConfirmBooking = () => {
    if (!selectedSlot) return;
    
    // Calcular la hora de fin sumando la duración de la sesión
    const endTime = new Date(selectedSlot.end);
    
    onSubmit({
      advisorId: advisor.id,
      startTime: selectedSlot.start,
      endTime
    });
  };
  
  // Obtener nombre del mes
  const getMonthName = (date: Date) => {
    return date.toLocaleString('es-ES', { month: 'long' });
  };
  
  // Obtener días disponibles para el mes actual
  const getAvailableDays = () => {
    return availabilityDays.filter(day => {
      // Verificar si hay al menos un slot disponible
      return day.slots.some(slot => slot.available);
    });
  };
  
  // Obtener slots disponibles para el día seleccionado
  const getAvailableSlots = () => {
    if (!selectedDate) return [];
    
    const day = availabilityDays.find(day => 
      day.date.getDate() === selectedDate.getDate() &&
      day.date.getMonth() === selectedDate.getMonth() &&
      day.date.getFullYear() === selectedDate.getFullYear()
    );
    
    return day ? day.slots.filter(slot => slot.available) : [];
  };
  
  // Formatear hora
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Selector de mes */}
      <div className="flex justify-between items-center mb-4">
        <button
          className="p-2 rounded-full hover:bg-gray-100"
          onClick={handlePreviousMonth}
          disabled={loading}
        >
          <ChevronLeft size={20} />
        </button>
        
        <h4 className="font-medium capitalize">
          {getMonthName(currentDate)} {currentDate.getFullYear()}
        </h4>
        
        <button
          className="p-2 rounded-full hover:bg-gray-100"
          onClick={handleNextMonth}
          disabled={loading}
        >
          <ChevronRight size={20} />
        </button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <Loader2 size={30} className="animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Selector de día */}
          <div className="mb-4">
            <h4 className="font-medium mb-2 flex items-center">
              <Calendar size={18} className="mr-2" />
              Selecciona un día
            </h4>
            
            {getAvailableDays().length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {getAvailableDays().map((day) => (
                  <button
                    key={day.date.toISOString()}
                    className={`p-2 rounded text-center ${
                      selectedDate && 
                      selectedDate.getDate() === day.date.getDate() &&
                      selectedDate.getMonth() === day.date.getMonth()
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    onClick={() => handleSelectDate(day.date)}
                  >
                    <div className="font-medium">{day.date.getDate()}</div>
                    <div className="text-xs">
                      {day.date.toLocaleDateString('es-ES', { weekday: 'short' })}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No hay días disponibles en este mes.</p>
            )}
          </div>
          
          {/* Selector de horario */}
          {selectedDate && (
            <div className="mb-6">
              <h4 className="font-medium mb-2 flex items-center">
                <Clock size={18} className="mr-2" />
                Selecciona un horario
              </h4>
              
              {getAvailableSlots().length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {getAvailableSlots().map((slot, index) => (
                    <button
                      key={index}
                      className={`p-2 rounded text-center ${
                        selectedSlot === slot
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      onClick={() => handleSelectSlot(slot)}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No hay horarios disponibles para este día.</p>
              )}
            </div>
          )}
          
          {/* Resumen de la reserva */}
          {selectedSlot && (
            <div className="bg-blue-50 p-4 rounded-md mb-6">
              <h4 className="font-medium mb-2">Resumen de la reserva</h4>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Asesor:</span>
                  <span className="font-medium">{advisor.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de sesión:</span>
                  <span className="font-medium">{session.title}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">
                    {selectedDate?.toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">
                    {formatTime(selectedSlot.start)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Duración:</span>
                  <span className="font-medium">{session.duration} minutos</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Botones de acción */}
      <div className="flex justify-end space-x-3 mt-4">
        <button
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          onClick={onCancel}
        >
          Cancelar
        </button>
        
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleConfirmBooking}
          disabled={!selectedSlot || loading}
        >
          <Check size={18} className="mr-2" />
          Confirmar
        </button>
      </div>
    </div>
  );
};

export default AdvisoryBookingForm;
