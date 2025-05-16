import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Check, X, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { advisoryService } from './advisoryService';
import googleCalendarService from './googleCalendarService';
import { Advisor, TimeSlot, AvailabilityDay } from './types';

interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  colorId?: string;
}

interface GoogleCalendarEvent {
  id?: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  colorId?: string;
}

const AdvisorAvailabilityManager: React.FC = () => {
  const { user } = useAuthStore();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [calendarConnected, setCalendarConnected] = useState(false);

  // Cargar datos del asesor
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const advisorData = await advisoryService.getAdvisorByUserId(user.id);
        if (advisorData) {
          setAdvisor(advisorData);
          setCalendarConnected(!!advisorData.calendar_sync_token);
        }
      } catch (err) {
        console.error('Error al cargar datos del asesor:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Cargar eventos del calendario y disponibilidad
  useEffect(() => {
    if (!advisor || !calendarConnected) return;
    
    fetchCalendarEvents();
  }, [advisor, calendarConnected, selectedDate]);

  const fetchCalendarEvents = async () => {
    if (!advisor) return;
    
    setSyncingCalendar(true);
    setError(null);
    
    try {
      // Calcular rango de fechas (una semana a partir de la fecha seleccionada)
      const startDate = new Date(selectedDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(selectedDate);
      endDate.setDate(endDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      
      // Obtener eventos del calendario
      const calendarEvents = await googleCalendarService.listEvents({
        advisorId: advisor.id,
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString()
      });
      
      if (calendarEvents) {
        const formattedEvents: CalendarEvent[] = calendarEvents.map((event: GoogleCalendarEvent) => ({
          id: event.id || '',
          summary: event.summary || 'Sin título',
          start: new Date(event.start.dateTime || event.start.date || ''),
          end: new Date(event.end.dateTime || event.end.date || ''),
          colorId: event.colorId
        }));
        
        setEvents(formattedEvents);
        
        // Generar disponibilidad basada en los eventos
        await generateAvailability(startDate, endDate, formattedEvents);
      }
      
      setSuccess('Calendario sincronizado correctamente');
    } catch (err) {
      console.error('Error al sincronizar el calendario:', err);
      setError('Error al sincronizar el calendario. Por favor, inténtalo de nuevo.');
    } finally {
      setSyncingCalendar(false);
    }
  };

  const generateAvailability = async (
    startDate: Date,
    endDate: Date,
    calendarEvents: CalendarEvent[]
  ) => {
    const days: AvailabilityDay[] = [];
    const currentDate = new Date(startDate);
    
    // Generar disponibilidad para cada día en el rango
    while (currentDate <= endDate) {
      const dayDate = new Date(currentDate);
      
      // Horario de trabajo (9 AM a 5 PM)
      const startHour = 9;
      const endHour = 17;
      const slotDuration = 60; // 60 minutos por slot
      
      const slots: TimeSlot[] = [];
      
      // Crear slots de tiempo para este día
      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = new Date(dayDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(dayDate);
        slotEnd.setHours(hour, slotDuration, 0, 0);
        
        // Verificar si el slot está disponible (no hay eventos que se solapen)
        const isAvailable = !calendarEvents.some(event => {
          return (
            (slotStart >= event.start && slotStart < event.end) ||
            (slotEnd > event.start && slotEnd <= event.end) ||
            (slotStart <= event.start && slotEnd >= event.end)
          );
        });
        
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: isAvailable
        });
      }
      
      days.push({
        date: dayDate,
        slots
      });
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setAvailabilityDays(days);
  };

  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!advisor) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          No eres un asesor
        </h3>
        <p className="text-yellow-700">
          Para gestionar tu disponibilidad, primero debes registrarte como asesor.
        </p>
      </div>
    );
  }

  if (!calendarConnected) {
    return (
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-medium text-blue-800 mb-2">
          Conecta tu Google Calendar
        </h3>
        <p className="text-blue-700 mb-4">
          Para gestionar tu disponibilidad, primero debes conectar tu cuenta de Google Calendar en tu perfil de asesor.
        </p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          onClick={() => window.location.href = '/dashboard/profile'}
        >
          <Calendar size={18} className="mr-2" />
          Ir a mi perfil
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Disponibilidad</h2>
        <button
          className={`flex items-center px-4 py-2 rounded ${
            syncingCalendar 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
          onClick={fetchCalendarEvents}
          disabled={syncingCalendar}
        >
          <RefreshCw size={18} className={`mr-2 ${syncingCalendar ? 'animate-spin' : ''}`} />
          {syncingCalendar ? 'Sincronizando...' : 'Sincronizar Calendario'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <button
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center"
            onClick={handlePreviousWeek}
          >
            &larr; Semana anterior
          </button>
          <h3 className="text-lg font-medium">
            Semana del {selectedDate.toLocaleDateString('es-ES')}
          </h3>
          <button
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded flex items-center"
            onClick={handleNextWeek}
          >
            Semana siguiente &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-full">
            {availabilityDays.length > 0 ? (
              <div className="grid grid-cols-7 gap-4">
                {availabilityDays.map((day, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="font-medium text-center mb-2 capitalize">
                      {formatDate(day.date)}
                    </div>
                    <div className="space-y-2">
                      {day.slots.map((slot, slotIndex) => (
                        <div 
                          key={slotIndex} 
                          className={`p-2 rounded-md flex items-center justify-between ${
                            slot.available 
                              ? 'bg-green-50 border border-green-200' 
                              : 'bg-red-50 border border-red-200'
                          }`}
                        >
                          <div className="flex items-center">
                            <Clock size={16} className="mr-1" />
                            <span>{formatTime(slot.start)} - {formatTime(slot.end)}</span>
                          </div>
                          <div>
                            {slot.available ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <X size={16} className="text-red-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 rounded-lg">
                <CalendarIcon size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  {syncingCalendar 
                    ? 'Cargando tu disponibilidad...' 
                    : 'No hay datos de disponibilidad para mostrar. Haz clic en "Sincronizar Calendario" para cargar tu disponibilidad.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-medium mb-4">Eventos del Calendario</h3>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map(event => (
              <div 
                key={event.id} 
                className="p-4 bg-gray-50 border rounded-lg flex items-start"
              >
                <div className="mr-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Calendar size={24} className="text-blue-600" />
                  </div>
                </div>
                <div className="flex-grow">
                  <h4 className="font-medium">{event.summary}</h4>
                  <p className="text-sm text-gray-600">
                    {formatDate(event.start)} • {formatTime(event.start)} - {formatTime(event.end)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 bg-gray-50 rounded-lg">
            <CalendarIcon size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              {syncingCalendar 
                ? 'Cargando eventos...' 
                : 'No hay eventos para mostrar en el rango de fechas seleccionado.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvisorAvailabilityManager;
