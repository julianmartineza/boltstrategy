import React, { useState, useEffect } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { ActivityContent } from '../../../types';

interface ActivityContextListProps {
  onConfigureContext: (activityId: string, title: string) => void;
}

const ActivityContextList: React.FC<ActivityContextListProps> = ({ onConfigureContext }) => {
  const [activities, setActivities] = useState<ActivityContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        
        // Obtener todas las actividades
        const { data, error } = await supabase
          .from('activity_contents')
          .select(`
            id,
            title,
            stage_id,
            stage_name,
            activity_data,
            created_at,
            updated_at
          `)
          .order('updated_at', { ascending: false });
        
        if (error) throw error;
        
        setActivities(data || []);
      } catch (err) {
        console.error('Error al cargar actividades:', err);
        setError('Error al cargar la lista de actividades. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  // Nota: Se eliminó la función hasContextConfig que no se estaba utilizando

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin mr-2" />
        <p className="text-gray-700">Cargando actividades...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <p className="text-yellow-700">No hay actividades disponibles para configurar.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-600 mb-4">
        Selecciona una actividad para configurar su contexto. La configuración de contexto determina qué información
        estará disponible para el modelo de IA al generar respuestas durante la ejecución de la actividad.
      </p>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actividad
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Etapa
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Última actualización
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity) => (
              <tr key={activity.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{activity.title || 'Sin título'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{activity.stage_name || 'Sin etapa'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {new Date(activity.updated_at).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onConfigureContext(activity.id, activity.title || 'Sin título')}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configurar Contexto
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityContextList;
