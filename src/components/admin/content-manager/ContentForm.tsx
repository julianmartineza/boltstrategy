import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { ActivityData } from './types';
import { ActivityContent } from '../../../types';
import { supabase } from '../../../lib/supabase';
import { AdvisoryAllocationForm } from '../../advisory';
import InfoCallout from './InfoCallout';

interface ContentFormProps {
  content: Partial<ActivityContent>;
  onSave: (content: Partial<ActivityContent>, activityData: ActivityData) => void;
  onCancel: () => void;
  loading: boolean;
  isEditing?: boolean;
  moduleId?: string;
}

const ContentForm: React.FC<ContentFormProps> = ({
  content,
  onSave,
  onCancel,
  loading,
  isEditing = false,
  moduleId
}) => {
  const [formContent, setFormContent] = useState<Partial<ActivityContent>>(content);
  const [error, setError] = useState<string | null>(null);
  const [activityData, setActivityData] = useState<ActivityData>({
    prompt: '',
    initial_message: '',
    system_instructions: '',
    max_exchanges: 5,
    step: 1,
    prompt_section: '',
    dependencies: []
  });
  const [availableActivities, setAvailableActivities] = useState<{id: string, content_id: string, stage_name: string, title: string}[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [stageName, setStageName] = useState<string>('');
  const [contentType, setContentType] = useState<string>(formContent.content_type || 'text');
  const [contentData, setContentData] = useState<{duration: number, session_type: string}>({duration: 60, session_type: 'individual'});
  const [showAdvisoryAllocationForm, setShowAdvisoryAllocationForm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    // Cargar actividades disponibles para dependencias
    const fetchActivities = async () => {
      try {
        // Consulta mejorada para obtener más información sobre las actividades
        const { data, error } = await supabase
          .from('content_registry')
          .select(`
            id,
            title,
            content_id,
            content_type
          `)
          .eq('content_type', 'activity');
        
        if (error) throw error;
        
        if (data) {
          // Obtener información adicional de activity_contents
          const activityIds = data.map((item: any) => item.content_id);
          const { data: activityContentsData, error: activityContentsError } = await supabase
            .from('activity_contents')
            .select('id, title, stage_name')
            .in('id', activityIds);
          
          if (activityContentsError) throw activityContentsError;
          
          // Combinar los datos para tener información completa
          const formattedData = data.map((item: any) => {
            const activityContent = activityContentsData?.find((ac: any) => ac.id === item.content_id);
            return {
              id: item.id, // ID del registro, que es lo que se guarda en dependencies
              content_id: item.content_id, // ID real de la actividad
              stage_name: activityContent?.stage_name || 'Actividad', // Usar stage_name de activity_contents si está disponible
              title: item.title || activityContent?.title || 'Sin título'
            };
          });
          
          setAvailableActivities(formattedData);
        }
      } catch (err) {
        console.error('Error al cargar actividades:', err);
      }
    };

    // Cargar actividades disponibles cuando el tipo seleccionado sea 'activity'
    // o cuando el contenido existente sea de tipo 'activity'
    if (contentType === 'activity' || formContent.content_type === 'activity') {
      fetchActivities();
    }
  }, [contentType, formContent.content_type]);

  useEffect(() => {
    // Inicializar el tipo de contenido
    if (content.content_type) {
      setContentType(content.content_type);
    }
    
    // Si hay datos de actividad, cargarlos
    if (content.activity_data) {
      try {
        let parsedData;
        if (typeof content.activity_data === 'string') {
          parsedData = JSON.parse(content.activity_data);
        } else {
          parsedData = content.activity_data;
        }
        
        console.log('Datos de actividad cargados del contenido:', parsedData);
        
        setActivityData({
          prompt: parsedData.prompt || '',
          initial_message: parsedData.initial_message || '',
          system_instructions: parsedData.system_instructions || '',
          max_exchanges: parsedData.max_exchanges || 5,
          step: parsedData.step || 1,
          prompt_section: parsedData.prompt_section || '',
          dependencies: parsedData.dependencies || []
        });
      } catch (error) {
        console.error('Error al parsear los datos de actividad:', error);
      }
    }

    // Cargar dependencias si existen
    if (content.dependencies && Array.isArray(content.dependencies)) {
      setSelectedDependencies(content.dependencies);
      
      // Si estamos editando, verificar las dependencias en la base de datos
      if (isEditing && content.id) {
        const fetchDependenciesFromDB = async () => {
          try {
            // Obtener el content_id de content_registry
            const { data: registryData, error: registryError } = await supabase
              .from('content_registry')
              .select('content_id')
              .eq('id', content.id)
              .single();
            
            if (registryError || !registryData?.content_id) {
              console.error('Error o no se encontró content_id:', registryError);
              return;
            }
            
            // Obtener dependencias usando content_id
            const { data, error } = await supabase
              .from('activity_contents')
              .select('dependencies')
              .eq('id', registryData.content_id)
              .single();
            
            if (error) {
              console.error('Error al obtener dependencias:', error);
              return;
            }
            
            if (data?.dependencies && Array.isArray(data.dependencies)) {
              setSelectedDependencies(data.dependencies);
            }
          } catch (err) {
            console.error('Error general:', err);
          }
        };
        
        fetchDependenciesFromDB();
      }
    }

    // Cargar stage_name si existe
    if (content.stage_name) {
      setStageName(content.stage_name);
    }
  }, [content, isEditing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validar que el título no esté vacío
    if (!formContent.title || formContent.title.trim() === '') {
      alert('El título es obligatorio');
      return;
    }

    try {
      // Incluir las dependencias en el objeto formContent
      // Manejar stage_name de forma segura
      const updatedContent: Partial<ActivityContent> = {
        ...formContent,
        dependencies: selectedDependencies,
        // Asegurarse de que el tipo de contenido sea el seleccionado
        content_type: contentType as 'text' | 'video' | 'activity' | 'advisory_session'
      };
      
      // Solo añadir stage_name si tiene un valor
      if (stageName) {
        updatedContent.stage_name = stageName;
      }
      
      // Si es una sesión de asesoría, procesar los datos específicos
      if (contentType === 'advisory_session') {
        updatedContent.content_type = 'advisory_session';
        updatedContent.content_metadata = {
          duration: contentData.duration,
          session_type: contentData.session_type
        };
      }

      // Si es una actividad, asegurarse de que se guarde como tipo 'activity'
      // y que los datos de actividad estén completos
      if (contentType === 'activity') {
        updatedContent.content_type = 'activity';
        
        // Asegurarnos de que los datos de actividad estén completos
        const completeActivityData = {
          ...activityData,
          prompt: activityData.prompt || '',
          initial_message: activityData.initial_message || '',
          system_instructions: activityData.system_instructions || '',
          max_exchanges: activityData.max_exchanges || 5,
          step: activityData.step || 1,
          prompt_section: activityData.prompt_section || '',
          dependencies: selectedDependencies || []
        };
        
        console.log('Enviando datos de actividad completos:', completeActivityData);
        
        // Guardar también los campos específicos en el objeto principal
        updatedContent.prompt_section = completeActivityData.prompt_section;
        updatedContent.system_instructions = completeActivityData.system_instructions;
        updatedContent.step = completeActivityData.step;
        
        // Llamar a onSave con los datos completos
        onSave(updatedContent, completeActivityData);
        return;
      }

      // Para otros tipos de contenido
      onSave(updatedContent, activityData);
    } catch (err) {
      console.error('Error al procesar el formulario:', err);
      setError('Error al procesar el formulario. Por favor, inténtalo de nuevo.');
    }
  };

  const handleAddDependency = (dependencyId: string) => {
    if (!dependencyId) return;
    
    if (!selectedDependencies.includes(dependencyId)) {
      const newDependencies = [...selectedDependencies, dependencyId];
      setSelectedDependencies(newDependencies);
      
      // Si estamos editando, actualizar también en la base de datos
      if (isEditing && content.id) {
        updateDependenciesInDB(newDependencies);
      }
    }
  };

  const handleRemoveDependency = (dependencyId: string) => {
    const newDependencies = selectedDependencies.filter(id => id !== dependencyId);
    setSelectedDependencies(newDependencies);
    
    // Si estamos editando, actualizar también en la base de datos
    if (isEditing && content.id) {
      updateDependenciesInDB(newDependencies);
    }
  };
  
  // Función para actualizar las dependencias directamente en la base de datos
  const updateDependenciesInDB = async (dependencies: string[]) => {
    if (!content.id) return;
    
    try {
      // Primero obtenemos el content_id de content_registry
      const { data: registryData, error: registryError } = await supabase
        .from('content_registry')
        .select('content_id')
        .eq('id', content.id)
        .single();
      
      if (registryError || !registryData?.content_id) {
        console.error('Error o no se encontró content_id:', registryError);
        return;
      }
      
      const contentId = registryData.content_id;
      
      // Actualizar en activity_contents usando el content_id
      const { error: activityError } = await supabase
        .from('activity_contents')
        .update({ dependencies })
        .eq('id', contentId);
      
      if (activityError) {
        console.error('Error al actualizar dependencias en activity_contents:', activityError);
      } else {
        // Mostrar mensaje de éxito
        setSuccessMessage('Dependencias actualizadas correctamente');
        setShowSuccessMessage(true);
        
        // Ocultar el mensaje después de 3 segundos
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 3000);
      }
    } catch (err) {
      console.error('Error al actualizar dependencias:', err);
    }
  };

  const contentTypes = [
    { value: 'text', label: 'Texto' },
    { value: 'video', label: 'Video' },
    { value: 'document', label: 'Documento' },
    { value: 'quiz', label: 'Cuestionario' },
    { value: 'activity', label: 'Actividad' },
    { value: 'advisory_session', label: 'Sesión de Asesoría' }
  ];

  return (
    <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
      <h5 className="text-sm font-medium mb-3">
        {isEditing ? 'Editar Contenido' : 'Nuevo Contenido'}
      </h5>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Contenido</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            required
          >
            {contentTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
          <input
            type="text"
            value={formContent.title || ''}
            onChange={(e) => setFormContent({ ...formContent, title: e.target.value })}
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Título del contenido"
            disabled={loading}
            required
          />
        </div>

        {/* Campo para stage_name - Solo mostrar si no estamos en una etapa existente */}
        {!content.stage_id && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de la Etapa</label>
            <input
              type="text"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre descriptivo de la etapa (ej: Identificación de Paradigmas)"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Este nombre se utilizará para referenciar esta actividad en dependencias</p>
          </div>
        )}
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {contentType === 'video' ? 'URL del Video' : 'Contenido'}
          </label>
          {contentType === 'text' ? (
            <textarea
              value={formContent.content || ''}
              onChange={(e) => setFormContent({ ...formContent, content: e.target.value })}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Contenido de texto"
              disabled={loading}
              required
            />
          ) : contentType === 'activity' ? (
            <div className="space-y-3 border border-gray-200 p-3 rounded-md bg-gray-50">
              {/* Eliminamos el campo de descripción ya que no es útil para las actividades */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="text-xs font-medium text-gray-700">Prompt para el Asistente IA</label>
                  <InfoCallout 
                    title="Prompt para el Asistente IA" 
                    description="Define el objetivo específico de la actividad y guía el comportamiento del asistente."
                    example="ayuda al emprendedor a identificar el problema"
                  />
                </div>
                <textarea
                  value={activityData.prompt}
                  onChange={(e) => setActivityData({ ...activityData, prompt: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Instrucciones para el asistente IA sobre cómo evaluar las respuestas del usuario"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Se incluye en el contexto enviado a la IA como parte del mensaje de sistema y orienta la conversación hacia un objetivo específico.</p>
              </div>
              <div>
                <div className="flex items-center mb-1">
                  <label className="text-xs font-medium text-gray-700">Mensaje Inicial</label>
                  <InfoCallout 
                    title="Mensaje Inicial" 
                    description="Define el primer mensaje que enviará el asistente cuando el usuario inicie la conversación."
                    example="hola, dime tu idea para saber tu problema"
                  />
                </div>
                <textarea
                  value={activityData.initial_message}
                  onChange={(e) => setActivityData({ ...activityData, initial_message: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Mensaje inicial que verá el usuario al comenzar la actividad"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Se muestra cuando el usuario hace clic en "Iniciar conversación" y ayuda a guiar al usuario desde el principio.</p>
              </div>
              <div>
                <div className="flex items-center mb-1">
                  <label className="text-xs font-medium text-gray-700">Instrucciones del Sistema</label>
                  <InfoCallout 
                    title="Instrucciones del Sistema" 
                    description="Proporciona instrucciones detalladas sobre cómo debe comportarse el asistente, qué enfoque debe tomar y qué tipo de respuestas debe dar."
                    example="actúa como experto en emprendimiento para identificar problemas"
                  />
                </div>
                <textarea
                  value={activityData.system_instructions}
                  onChange={(e) => setActivityData({ ...activityData, system_instructions: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Instrucciones para el sistema sobre el comportamiento del asistente IA"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Se utiliza como el mensaje de sistema principal enviado a la IA y define la "personalidad" del asistente.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Máximo de Intercambios</label>
                <input
                  type="number"
                  value={activityData.max_exchanges}
                  onChange={(e) => setActivityData({ ...activityData, max_exchanges: parseInt(e.target.value) || 5 })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="10"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Número de Paso</label>
                <input
                  type="number"
                  value={activityData.step}
                  onChange={(e) => setActivityData({ ...activityData, step: parseInt(e.target.value) || 1 })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sección del Prompt</label>
                <input
                  type="text"
                  value={activityData.prompt_section}
                  onChange={(e) => setActivityData({ ...activityData, prompt_section: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sección del prompt (ej: introducción, análisis, conclusión)"
                  disabled={loading}
                />
              </div>
              
              {/* Sección de dependencias */}
              <div>
                <div className="flex items-center mb-1">
                  <label className="text-xs font-medium text-gray-700">Dependencias</label>
                  <InfoCallout 
                    title="Dependencias" 
                    description="Define qué actividades previas deben completarse antes de esta actividad y cuyos resultados pueden ser relevantes."
                  />
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Permite al sistema cargar información de actividades anteriores, proporcionando contexto adicional 
                  al asistente sobre el progreso del usuario y ayudando a crear una experiencia de aprendizaje coherente.
                </p>
                
                <div className="mb-2">
                  <select
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onChange={(e) => e.target.value && handleAddDependency(e.target.value)}
                    value=""
                    disabled={loading}
                  >
                    <option value="">Seleccionar actividad...</option>
                    {availableActivities
                      .filter(activity => activity.id !== formContent.id) // No permitir dependencia circular
                      .map(activity => (
                        <option key={activity.id} value={activity.id}>
                          {activity.stage_name}: {activity.title}
                        </option>
                      ))}
                  </select>
                </div>
                
                {/* Lista de dependencias seleccionadas */}
                <div className="space-y-1">
                  {selectedDependencies.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No hay dependencias seleccionadas</p>
                  )}
                  {selectedDependencies.map(dependency => {
                    const activityInfo = availableActivities.find(a => a.id === dependency);
                    return (
                      <div key={dependency} className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                        <span className="text-xs">
                          {activityInfo 
                            ? `${activityInfo.stage_name || 'Actividad'}: ${activityInfo.title}` 
                            : `ID: ${dependency} (No encontrada)`}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependency(dependency)}
                          className="text-red-500 hover:text-red-700"
                          disabled={loading}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : contentType === 'advisory_session' ? (
            <div className="mt-4 p-4 border rounded-md bg-blue-50">
              <h3 className="text-lg font-medium mb-2">Configuración de Sesión de Asesoría</h3>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  Duración (minutos)
                </label>
                <input
                  type="number"
                  value={contentData.duration}
                  onChange={(e) => setContentData({
                    ...contentData,
                    duration: parseInt(e.target.value) || 60
                  })}
                  className="w-full p-2 border rounded"
                  min="15"
                  step="15"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Duración recomendada: 60 minutos (1 hora), 30 minutos (media hora), etc.
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  Tipo de sesión
                </label>
                <select
                  value={contentData.session_type}
                  onChange={(e) => setContentData({
                    ...contentData,
                    session_type: e.target.value
                  })}
                  className="w-full p-2 border rounded"
                >
                  <option value="individual">Individual (1 empresa)</option>
                  <option value="group">Grupal (varias empresas)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">
                  Descripción
                </label>
                <textarea
                  value={formContent.content || ''}
                  onChange={(e) => setFormContent({ ...formContent, content: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows={3}
                  placeholder="Describe el propósito y objetivos de esta sesión de asesoría..."
                />
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={formContent.content || ''}
              onChange={(e) => setFormContent({ ...formContent, content: e.target.value })}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={contentType === 'video' ? 'URL del video (YouTube, Vimeo, etc.)' : 'Contenido'}
              disabled={loading}
              required
            />
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {showSuccessMessage && successMessage && (
          <div className="mt-4 p-2 bg-green-100 text-green-700 rounded-md text-sm">
            {successMessage}
          </div>
        )}
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 size={14} className="animate-spin mr-1" />
                Guardando...
              </span>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </form>
      
      {/* Botón para asignar horas de asesoría si estamos editando una sesión de asesoría */}
      {isEditing && contentType === 'advisory_session' && moduleId && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowAdvisoryAllocationForm(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Asignar Horas de Asesoría
          </button>
        </div>
      )}
      
      {/* Modal para asignar horas de asesoría */}
      {showAdvisoryAllocationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <AdvisoryAllocationForm
              programModuleId={moduleId || ''}
              onSubmit={() => {
                setShowAdvisoryAllocationForm(false);
                setSuccessMessage('Horas de asesoría asignadas correctamente');
                setShowSuccessMessage(true);
                setTimeout(() => setShowSuccessMessage(false), 3000);
              }}
              onCancel={() => setShowAdvisoryAllocationForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentForm;
