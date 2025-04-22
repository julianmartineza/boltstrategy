import React, { useState, useEffect } from 'react';
import { Loader2, Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { advisoryService } from './advisoryService';
import { AdvisoryBooking } from './types';

interface AdvisoryReportFormProps {
  bookingId: string;
  onSubmit: (report: {
    bookingId: string;
    notes: string;
    commitments: string;
    submitted: boolean;
  }) => void;
  onCancel: () => void;
}

const AdvisoryReportForm: React.FC<AdvisoryReportFormProps> = ({
  bookingId,
  onSubmit,
  onCancel
}) => {
  const [booking, setBooking] = useState<AdvisoryBooking | null>(null);
  const [notes, setNotes] = useState('');
  const [commitments, setCommitments] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar datos de la reserva y reporte existente
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar detalles de la reserva
        const { data: bookingData, error: bookingError } = await supabase
          .from('advisory_bookings')
          .select(`
            *,
            session:session_id (
              id,
              title,
              session_type
            ),
            company:company_id (
              id,
              name
            )
          `)
          .eq('id', bookingId)
          .single();
        
        if (bookingError) throw bookingError;
        
        // Verificar si ya existe un reporte
        const reportData = await advisoryService.getReportByBookingId(bookingId);
        
        setBooking(bookingData);
        
        // Si existe un reporte, cargar sus datos
        if (reportData) {
          setNotes(reportData.notes || '');
          setCommitments(reportData.commitments || '');
        }
      } catch (err) {
        console.error('Error al cargar datos del reporte:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [bookingId]);
  
  // Manejar envío del formulario
  const handleSubmit = (submitted: boolean) => {
    if (!booking) return;
    
    onSubmit({
      bookingId,
      notes,
      commitments,
      submitted
    });
  };
  
  // Formatear fecha y hora
  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 size={30} className="animate-spin text-blue-500" />
      </div>
    );
  }
  
  if (!booking) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <p>{error || 'No se encontró la reserva solicitada.'}</p>
        <button
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={onCancel}
        >
          Cerrar
        </button>
      </div>
    );
  }
  
  return (
    <div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Información de la sesión */}
      <div className="mb-4 p-3 bg-gray-50 rounded-md">
        <h4 className="font-medium">{booking.session?.title || 'Sesión sin título'}</h4>
        <p className="text-sm text-gray-600">
          {formatDateTime(booking.start_time)}
        </p>
        <p className="text-sm text-gray-600">
          Empresa: {booking.company?.name || 'Empresa no asignada'}
        </p>
      </div>
      
      {/* Formulario */}
      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 mb-2">
            Notas de la sesión
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded"
            rows={5}
            placeholder="Describe los temas tratados durante la sesión..."
          />
        </div>
        
        <div>
          <label className="block text-gray-700 mb-2">
            Compromisos y próximos pasos
          </label>
          <textarea
            value={commitments}
            onChange={(e) => setCommitments(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Enumera los compromisos adquiridos y próximos pasos..."
          />
        </div>
      </div>
      
      {/* Botones de acción */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center"
          onClick={onCancel}
        >
          <X size={18} className="mr-2" />
          Cancelar
        </button>
        
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center"
          onClick={() => handleSubmit(false)}
          disabled={loading}
        >
          <Save size={18} className="mr-2" />
          Guardar Borrador
        </button>
        
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
          onClick={() => handleSubmit(true)}
          disabled={loading || !notes || !commitments}
        >
          <Save size={18} className="mr-2" />
          Enviar Acta
        </button>
      </div>
    </div>
  );
};

export default AdvisoryReportForm;
