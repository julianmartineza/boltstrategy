import React, { useState, useEffect } from 'react';
import { Loader2, X } from 'lucide-react';
import { StageContent, ActivityData } from './types';
import { supabase } from '../../../lib/supabase';

interface ContentFormProps {
  content: Partial<StageContent>;
  onSave: (content: Partial<StageContent>, activityData: ActivityData) => void;
  onCancel: () => void;
  loading: boolean;
  isEditing?: boolean;
}

const ContentForm: React.FC<ContentFormProps> = ({ 
  content, 
  onSave, 
  onCancel, 
  loading, 
  isEditing = false
}) => {
  const [formContent, setFormContent] = useState<Partial<StageContent>>(content);
  const [activityData, setActivityData] = useState<ActivityData>({
    prompt: '',
    initial_message: '',
    system_instructions: '',
    max_exchanges: 5,
    step: 1,
    prompt_section: ''
  });
  const [availableActivities, setAvailableActivities] = useState<{id: string, stage_name: string, title: string}[]>([]);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>([]);
  const [stageName, setStageName] = useState<string>('');

  useEffect(() => {
    // Cargar actividades disponibles para dependencias
    const fetchAvailableActivities = async () => {
      const { data, error } = await supabase
        .from('stage_content')
        .select('id, stage_name, title')
        .eq('content_type', 'activity')
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setAvailableActivities(data);
      }
    };

    fetchAvailableActivities();
  }, []);

  useEffect(() => {
    if (content.activity_data) {
      try {
        const parsedData = typeof content.activity_data === 'string' 
          ? JSON.parse(content.activity_data) 
          : content.activity_data;
        
        setActivityData({
          prompt: parsedData.prompt || '',
          initial_message: parsedData.initial_message || '',
          system_instructions: parsedData.system_instructions || '',
          max_exchanges: parsedData.max_exchanges || 5,
          step: parsedData.step || 1,
          prompt_section: parsedData.prompt_section || ''
        });
      } catch (error) {
        console.error('Error parsing activity data:', error);
      }
    }

    // Cargar dependencias si existen
    if (content.dependencies) {
      setSelectedDependencies(content.dependencies);
    }

    // Cargar stage_name si existe
    if (content.stage_name) {
      setStageName(content.stage_name);
    }
  }, [content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Incluir las dependencias en el objeto formContent
    // Manejar stage_name de forma segura
    const updatedContent = {
      ...formContent,
      dependencies: selectedDependencies
    };
    
    // Solo añadir stage_name si tiene un valor
    if (stageName) {
      // Intentamos añadir stage_name, pero el servicio lo manejará si hay error
      updatedContent.stage_name = stageName;
    }
    
    onSave(updatedContent, activityData);
  };

  const handleAddDependency = (dependencyId: string) => {
    if (!selectedDependencies.includes(dependencyId)) {
      setSelectedDependencies([...selectedDependencies, dependencyId]);
    }
  };

  const handleRemoveDependency = (dependencyId: string) => {
    setSelectedDependencies(selectedDependencies.filter(id => id !== dependencyId));
  };

  return (
    <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
      <h5 className="text-sm font-medium mb-3">
        {isEditing ? 'Editar Contenido' : 'Nuevo Contenido'}
      </h5>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Contenido</label>
          <select
            value={formContent.content_type || 'text'}
            onChange={(e) => setFormContent({ 
              ...formContent, 
              content_type: e.target.value as 'video' | 'text' | 'activity' 
            })}
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
            required
          >
            <option value="text">Texto</option>
            <option value="video">Video</option>
            <option value="activity">Actividad</option>
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

        {/* Campo para stage_name */}
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
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {formContent.content_type === 'video' ? 'URL del Video' : 'Contenido'}
          </label>
          {formContent.content_type === 'text' ? (
            <textarea
              value={formContent.content || ''}
              onChange={(e) => setFormContent({ ...formContent, content: e.target.value })}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={4}
              placeholder="Contenido de texto"
              disabled={loading}
              required
            />
          ) : formContent.content_type === 'activity' ? (
            <div className="space-y-3 border border-gray-200 p-3 rounded-md bg-gray-50">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descripción de la Actividad</label>
                <textarea
                  value={formContent.content || ''}
                  onChange={(e) => setFormContent({ ...formContent, content: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Breve descripción de la actividad"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Prompt para el Asistente IA</label>
                <textarea
                  value={activityData.prompt}
                  onChange={(e) => setActivityData({ ...activityData, prompt: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Instrucciones para el asistente IA sobre cómo evaluar las respuestas del usuario"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Mensaje Inicial</label>
                <textarea
                  value={activityData.initial_message}
                  onChange={(e) => setActivityData({ ...activityData, initial_message: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Mensaje inicial que verá el usuario al comenzar la actividad"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Instrucciones del Sistema</label>
                <textarea
                  value={activityData.system_instructions}
                  onChange={(e) => setActivityData({ ...activityData, system_instructions: e.target.value })}
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="Instrucciones para el sistema sobre el comportamiento del asistente IA"
                  disabled={loading}
                  required
                />
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Dependencias</label>
                <p className="text-xs text-gray-500 mb-2">Selecciona actividades previas cuya información será utilizada como contexto</p>
                
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
                        <option key={activity.id} value={activity.stage_name || activity.id}>
                          {activity.stage_name || activity.title}
                        </option>
                      ))}
                  </select>
                </div>
                
                {/* Lista de dependencias seleccionadas */}
                <div className="space-y-1">
                  {selectedDependencies.map(dependency => {
                    const activityInfo = availableActivities.find(a => a.stage_name === dependency || a.id === dependency);
                    return (
                      <div key={dependency} className="flex items-center justify-between p-2 bg-gray-100 rounded-md">
                        <span className="text-xs">{activityInfo?.stage_name || activityInfo?.title || dependency}</span>
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
          ) : (
            <input
              type="text"
              value={formContent.url || ''}
              onChange={(e) => setFormContent({ ...formContent, url: e.target.value })}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://player.vimeo.com/video/123456789"
              disabled={loading}
              required
            />
          )}
        </div>
        
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
    </div>
  );
};

export default ContentForm;
