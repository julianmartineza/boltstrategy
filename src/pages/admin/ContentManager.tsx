import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PlusCircle, Edit, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

interface StageContent {
  id: string;
  stage_id: string;
  content_type: 'video' | 'text' | 'activity';
  title: string;
  content: string;
  order_num: number;
  created_at: string;
  metadata: any;
  activity_data: any;
}

interface Stage {
  id: string;
  name: string;
  order_num: number;
  program_id: string | null;
}

interface Program {
  id: string;
  name: string;
}

const ContentManager: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [contents, setContents] = useState<StageContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<StageContent | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newContent, setNewContent] = useState<Partial<StageContent>>({
    content_type: 'text',
    title: '',
    content: '',
    order_num: 0
  });
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  // Cargar programas
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase
          .from('programs')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setPrograms(data || []);
        if (data && data.length > 0) {
          setSelectedProgram(data[0].id);
        }
      } catch (err) {
        console.error('Error al cargar programas:', err);
        setError('Error al cargar los programas. Por favor, inténtalo de nuevo.');
      }
    };

    fetchPrograms();
  }, []);

  // Cargar etapas cuando se selecciona un programa
  useEffect(() => {
    const fetchStages = async () => {
      if (!selectedProgram) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('strategy_stages')
          .select('id, name, order_num, program_id')
          .eq('program_id', selectedProgram)
          .order('order_num');

        if (error) throw error;
        setStages(data || []);
        
        // Inicializar el estado expandido para cada etapa
        const expanded: Record<string, boolean> = {};
        data?.forEach(stage => {
          expanded[stage.id] = false;
        });
        setExpandedStages(expanded);
        
        setSelectedStage(null);
        setContents([]);
      } catch (err) {
        console.error('Error al cargar etapas:', err);
        setError('Error al cargar las etapas. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchStages();
  }, [selectedProgram]);

  // Cargar contenido cuando se expande una etapa
  const loadStageContent = async (stageId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stage_content')
        .select('*')
        .eq('stage_id', stageId)
        .order('order_num');

      if (error) throw error;
      setContents(prevContents => {
        // Filtrar contenidos existentes de esta etapa
        const filteredContents = prevContents.filter(c => c.stage_id !== stageId);
        // Añadir los nuevos contenidos
        return [...filteredContents, ...(data || [])];
      });
    } catch (err) {
      console.error('Error al cargar contenido:', err);
      setError('Error al cargar el contenido. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Alternar la expansión de una etapa
  const toggleStageExpansion = (stageId: string) => {
    setExpandedStages(prev => {
      const newState = { ...prev, [stageId]: !prev[stageId] };
      
      // Si estamos expandiendo, cargar el contenido
      if (newState[stageId]) {
        loadStageContent(stageId);
      }
      
      return newState;
    });
  };

  // Crear nuevo contenido
  const handleCreateContent = async () => {
    if (!selectedStage) {
      setError('Debes seleccionar una etapa para añadir contenido.');
      return;
    }

    try {
      if (!newContent.title || !newContent.content) {
        setError('El título y el contenido son obligatorios.');
        return;
      }

      const contentToCreate = {
        ...newContent,
        stage_id: selectedStage
      };

      const { data, error } = await supabase
        .from('stage_content')
        .insert([contentToCreate])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setContents([...contents, data[0]]);
      }
      
      setNewContent({
        content_type: 'text',
        title: '',
        content: '',
        order_num: 0
      });
      setIsCreating(false);
      setError(null);
    } catch (err) {
      console.error('Error al crear contenido:', err);
      setError('Error al crear el contenido. Por favor, inténtalo de nuevo.');
    }
  };

  // Actualizar contenido existente
  const handleUpdateContent = async () => {
    if (!editingContent) return;

    try {
      const { error } = await supabase
        .from('stage_content')
        .update({
          title: editingContent.title,
          content: editingContent.content,
          content_type: editingContent.content_type,
          order_num: editingContent.order_num
        })
        .eq('id', editingContent.id);

      if (error) throw error;

      setContents(contents.map(c => 
        c.id === editingContent.id ? editingContent : c
      ));
      setEditingContent(null);
      setError(null);
    } catch (err) {
      console.error('Error al actualizar contenido:', err);
      setError('Error al actualizar el contenido. Por favor, inténtalo de nuevo.');
    }
  };

  // Eliminar contenido
  const handleDeleteContent = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este contenido? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stage_content')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setContents(contents.filter(c => c.id !== id));
      setError(null);
    } catch (err) {
      console.error('Error al eliminar contenido:', err);
      setError('Error al eliminar el contenido. Por favor, inténtalo de nuevo.');
    }
  };

  if (loading && programs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Gestión de Contenido</h2>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Selección de programa */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Programa</label>
        <select
          value={selectedProgram || ''}
          onChange={(e) => setSelectedProgram(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          {programs.map((program) => (
            <option key={program.id} value={program.id}>
              {program.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de etapas */}
      {stages.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">Etapas del Programa</h3>
          <div className="space-y-2">
            {stages.map((stage) => (
              <div key={stage.id} className="border border-gray-200 rounded-md overflow-hidden">
                <div 
                  className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer"
                  onClick={() => toggleStageExpansion(stage.id)}
                >
                  <div className="font-medium">{stage.name}</div>
                  <button className="text-gray-500">
                    {expandedStages[stage.id] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>
                
                {expandedStages[stage.id] && (
                  <div className="p-3">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium">Contenido de la Etapa</h4>
                      <button
                        onClick={() => {
                          setSelectedStage(stage.id);
                          setIsCreating(true);
                        }}
                        className="flex items-center text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                      >
                        <PlusCircle className="h-3 w-3 mr-1" />
                        Añadir Contenido
                      </button>
                    </div>
                    
                    {/* Formulario para crear nuevo contenido */}
                    {isCreating && selectedStage === stage.id && (
                      <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
                        <h5 className="text-sm font-medium mb-3">Nuevo Contenido</h5>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Tipo de Contenido</label>
                            <select
                              value={newContent.content_type || 'text'}
                              onChange={(e) => setNewContent({ 
                                ...newContent, 
                                content_type: e.target.value as 'text' | 'video' | 'activity' 
                              })}
                              className="w-full p-2 text-sm border border-gray-300 rounded-md"
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
                              value={newContent.title || ''}
                              onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                              className="w-full p-2 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {newContent.content_type === 'video' ? 'URL del Video' : 'Contenido'}
                            </label>
                            {newContent.content_type === 'text' || newContent.content_type === 'activity' ? (
                              <textarea
                                value={newContent.content || ''}
                                onChange={(e) => setNewContent({ ...newContent, content: e.target.value })}
                                className="w-full p-2 text-sm border border-gray-300 rounded-md"
                                rows={4}
                              />
                            ) : (
                              <input
                                type="text"
                                value={newContent.content || ''}
                                onChange={(e) => setNewContent({ ...newContent, content: e.target.value })}
                                className="w-full p-2 text-sm border border-gray-300 rounded-md"
                                placeholder="https://player.vimeo.com/video/123456789"
                              />
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Orden</label>
                            <input
                              type="number"
                              value={newContent.order_num || 0}
                              onChange={(e) => setNewContent({ 
                                ...newContent, 
                                order_num: parseInt(e.target.value) || 0 
                              })}
                              className="w-full p-2 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setIsCreating(false);
                                setNewContent({
                                  content_type: 'text',
                                  title: '',
                                  content: '',
                                  order_num: 0
                                });
                              }}
                              className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-100"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleCreateContent}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                              Guardar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Lista de contenidos */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contenido</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {contents.filter(content => content.stage_id === stage.id).length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-2 text-center text-xs text-gray-500">
                                No hay contenido disponible para esta etapa.
                              </td>
                            </tr>
                          ) : (
                            contents
                              .filter(content => content.stage_id === stage.id)
                              .sort((a, b) => a.order_num - b.order_num)
                              .map((content) => (
                                <tr key={content.id}>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {editingContent?.id === content.id ? (
                                      <input
                                        type="number"
                                        value={editingContent.order_num}
                                        onChange={(e) => setEditingContent({ 
                                          ...editingContent, 
                                          order_num: parseInt(e.target.value) || 0 
                                        })}
                                        className="w-16 p-1 text-xs border border-gray-300 rounded-md"
                                      />
                                    ) : (
                                      <div className="text-xs text-gray-900">{content.order_num}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap">
                                    {editingContent?.id === content.id ? (
                                      <select
                                        value={editingContent.content_type}
                                        onChange={(e) => setEditingContent({ 
                                          ...editingContent, 
                                          content_type: e.target.value as 'text' | 'video' | 'activity' 
                                        })}
                                        className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                      >
                                        <option value="text">Texto</option>
                                        <option value="video">Video</option>
                                        <option value="activity">Actividad</option>
                                      </select>
                                    ) : (
                                      <span className={`px-2 py-1 inline-flex text-xs leading-4 font-semibold rounded-full 
                                        ${content.content_type === 'video' ? 'bg-purple-100 text-purple-800' : 
                                          content.content_type === 'activity' ? 'bg-yellow-100 text-yellow-800' : 
                                          'bg-blue-100 text-blue-800'}`}
                                      >
                                        {content.content_type === 'video' ? 'Video' : 
                                         content.content_type === 'activity' ? 'Actividad' : 
                                         'Texto'}
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {editingContent?.id === content.id ? (
                                      <input
                                        type="text"
                                        value={editingContent.title}
                                        onChange={(e) => setEditingContent({ ...editingContent, title: e.target.value })}
                                        className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                      />
                                    ) : (
                                      <div className="text-xs font-medium text-gray-900">{content.title}</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    {editingContent?.id === content.id ? (
                                      editingContent.content_type === 'video' ? (
                                        <input
                                          type="text"
                                          value={editingContent.content}
                                          onChange={(e) => setEditingContent({ ...editingContent, content: e.target.value })}
                                          className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                        />
                                      ) : (
                                        <textarea
                                          value={editingContent.content}
                                          onChange={(e) => setEditingContent({ ...editingContent, content: e.target.value })}
                                          className="w-full p-1 text-xs border border-gray-300 rounded-md"
                                          rows={3}
                                        />
                                      )
                                    ) : (
                                      <div className="text-xs text-gray-500 max-w-xs truncate">
                                        {content.content_type === 'video' 
                                          ? content.content 
                                          : content.content.length > 100 
                                            ? content.content.substring(0, 100) + '...' 
                                            : content.content}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-medium">
                                    {editingContent?.id === content.id ? (
                                      <div className="flex justify-end space-x-2">
                                        <button
                                          onClick={handleUpdateContent}
                                          className="text-green-600 hover:text-green-900"
                                        >
                                          <Save className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => setEditingContent(null)}
                                          className="text-gray-600 hover:text-gray-900"
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex justify-end space-x-2">
                                        <button
                                          onClick={() => setEditingContent(content)}
                                          className="text-blue-600 hover:text-blue-900"
                                        >
                                          <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteContent(content.id)}
                                          className="text-red-600 hover:text-red-900"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          {selectedProgram 
            ? 'No hay etapas disponibles para este programa.' 
            : 'Selecciona un programa para ver sus etapas.'}
        </div>
      )}
    </div>
  );
};

export default ContentManager;
