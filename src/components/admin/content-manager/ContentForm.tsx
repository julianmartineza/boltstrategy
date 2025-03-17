import React, { useState, useEffect } from 'react';
import { StageContent, ActivityData } from './types';

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
  }, [content]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formContent, activityData);
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
            </div>
          ) : (
            <input
              type="text"
              value={formContent.content || ''}
              onChange={(e) => setFormContent({ ...formContent, content: e.target.value })}
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://player.vimeo.com/video/123456789"
              disabled={loading}
              required
            />
          )}
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Orden</label>
          <input
            type="number"
            value={formContent.order_num || 0}
            onChange={(e) => setFormContent({ ...formContent, order_num: parseInt(e.target.value) || 0 })}
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            disabled={loading}
            required
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
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
