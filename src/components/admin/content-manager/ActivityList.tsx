import React, { useState, useEffect } from 'react';
import { Settings, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { ActivityContent } from '../../../types';

interface ActivityListProps {
  onConfigureEvaluation: (activityId: string, title: string) => void;
}

const ActivityList: React.FC<ActivityListProps> = ({ onConfigureEvaluation }) => {
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

  // Verificar si una actividad tiene configuración de evaluación
  const hasEvaluationConfig = async (activityId: string) => {
    try {
      // Verificar si hay entregables configurados
      const { count: deliverablesCount, error: deliverablesError } = await supabase
        .from('activity_deliverables')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', activityId);
      
      if (deliverablesError) throw deliverablesError;
      
      // Verificar si hay rúbricas configuradas
      const { count: rubricsCount, error: rubricsError } = await supabase
        .from('evaluation_rubrics')
        .select('id', { count: 'exact', head: true })
        .eq('activity_id', activityId);
      
      if (rubricsError) throw rubricsError;
      
      return (deliverablesCount || 0) > 0 || (rubricsCount || 0) > 0;
    } catch (err) {
      console.error('Error al verificar configuración de evaluación:', err);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Cargando actividades...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 p-8 rounded-md text-center">
        <p className="text-gray-600">No se encontraron actividades en el sistema.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium leading-6 text-gray-900">Listado de Actividades</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configura la evaluación avanzada para cada actividad utilizando entregables y rúbricas.
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Etapa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última actualización</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado de evaluación</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {activities.map((activity) => (
              <ActivityRow 
                key={activity.id} 
                activity={activity} 
                onConfigureEvaluation={onConfigureEvaluation}
                hasEvaluationConfig={hasEvaluationConfig}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface ActivityRowProps {
  activity: ActivityContent;
  onConfigureEvaluation: (activityId: string, title: string) => void;
  hasEvaluationConfig: (activityId: string) => Promise<boolean>;
}

const ActivityRow: React.FC<ActivityRowProps> = ({ activity, onConfigureEvaluation, hasEvaluationConfig }) => {
  const [evaluationConfigured, setEvaluationConfigured] = useState<boolean | null>(null);
  
  useEffect(() => {
    const checkEvaluationConfig = async () => {
      const hasConfig = await hasEvaluationConfig(activity.id);
      setEvaluationConfigured(hasConfig);
    };
    
    checkEvaluationConfig();
  }, [activity.id, hasEvaluationConfig]);
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <tr>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-gray-900">{activity.title}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{activity.stage_name || 'Sin etapa'}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-500">{formatDate(activity.updated_at)}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {evaluationConfigured === null ? (
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />
            <span className="text-sm text-gray-500">Verificando...</span>
          </div>
        ) : evaluationConfigured ? (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Configurada
          </span>
        ) : (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            No configurada
          </span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onConfigureEvaluation(activity.id, activity.title || '')}
          className="text-blue-600 hover:text-blue-900 inline-flex items-center"
          title="Configurar evaluación"
        >
          <Settings className="h-4 w-4 mr-1" />
          <span>Configurar evaluación</span>
        </button>
      </td>
    </tr>
  );
};

export default ActivityList;
