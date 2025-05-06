import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PlusCircle, Edit, Trash2, Save, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

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
  // Estados para datos
  const [stages, setStages] = useState<Stage[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  
  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [stageLoading, setStageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para gestión de etapas
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [newStage, setNewStage] = useState<Partial<Stage>>({ name: '', order_num: 0 });
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  
  // Estados para selección
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);

  // Función para mostrar mensajes de éxito temporales
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000); // Desaparece después de 3 segundos
  };

  // Limpiar mensaje de error
  const clearError = () => {
    setError(null);
  };

  // Cargar programas
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        clearError();
        
        const { data, error } = await supabase
          .from('programs')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setPrograms(data || []);
        if (data && data.length > 0) {
          setSelectedProgram(data[0].id);
        }
      } catch (err: any) {
        console.error('Error al cargar programas:', err);
        setError(`Error al cargar los programas: ${err.message || 'Inténtalo de nuevo'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // Cargar etapas cuando se selecciona un programa
  useEffect(() => {
    const fetchStages = async () => {
      if (!selectedProgram) return;

      try {
        setStageLoading(true);
        clearError();
        
        const { data, error } = await supabase
          .from('strategy_stages')
          .select('id, name, order_num, program_id')
          .eq('program_id', selectedProgram)
          .order('order_num');

        if (error) throw error;
        setStages(data || []);
      } catch (err: any) {
        console.error('Error al cargar etapas:', err);
        setError(`Error al cargar las etapas: ${err.message || 'Inténtalo de nuevo'}`);
      } finally {
        setStageLoading(false);
      }
    };

    fetchStages();
  }, [selectedProgram]);

  // Crear nueva etapa
  const handleCreateStage = async () => {
    if (!selectedProgram) {
      setError('Debes seleccionar un programa para añadir una etapa.');
      return;
    }

    try {
      clearError();
      setStageLoading(true);
      
      if (!newStage.name) {
        setError('El nombre de la etapa es obligatorio.');
        setStageLoading(false);
        return;
      }

      // Determinar el orden para la nueva etapa (último + 1)
      const orderNum = stages.length > 0 
        ? Math.max(...stages.map(s => s.order_num)) + 1 
        : 1;

      const { data, error } = await supabase
        .from('strategy_stages')
        .insert({
          name: newStage.name,
          program_id: selectedProgram,
          order_num: orderNum
        })
        .select();

      if (error) throw error;

      // Actualizar la lista de etapas
      if (data && data.length > 0) {
        setStages([...stages, data[0]]);
        
        // Limpiar el formulario
        setNewStage({ name: '', order_num: 0 });
        setIsCreatingStage(false);
        
        showSuccessMessage('Etapa creada correctamente.');
      }
    } catch (err: any) {
      console.error('Error al crear etapa:', err);
      setError(`Error al crear la etapa: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setStageLoading(false);
    }
  };

  // Actualizar etapa existente
  const handleUpdateStage = async () => {
    if (!editingStage) {
      setError('No hay etapa seleccionada para editar.');
      return;
    }

    try {
      clearError();
      setStageLoading(true);
      
      if (!editingStage.name) {
        setError('El nombre de la etapa es obligatorio.');
        setStageLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('strategy_stages')
        .update({
          name: editingStage.name,
          order_num: editingStage.order_num
        })
        .eq('id', editingStage.id)
        .select();

      if (error) throw error;

      // Actualizar la lista de etapas
      if (data && data.length > 0) {
        setStages(stages.map(stage => 
          stage.id === editingStage.id ? data[0] : stage
        ));
        
        // Limpiar el formulario de edición
        setEditingStage(null);
        setIsEditingStage(false);
        
        showSuccessMessage('Etapa actualizada correctamente.');
      }
    } catch (err: any) {
      console.error('Error al actualizar etapa:', err);
      setError(`Error al actualizar la etapa: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setStageLoading(false);
    }
  };

  // Eliminar etapa
  const handleDeleteStage = async (stageId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta etapa?')) {
      return;
    }

    try {
      clearError();
      setStageLoading(true);
      
      const { error } = await supabase
        .from('strategy_stages')
        .delete()
        .eq('id', stageId);

      if (error) throw error;

      // Actualizar la lista de etapas
      setStages(stages.filter(stage => stage.id !== stageId));
      
      showSuccessMessage('Etapa eliminada correctamente.');
    } catch (err: any) {
      console.error('Error al eliminar etapa:', err);
      setError(`Error al eliminar la etapa: ${err.message || 'Inténtalo de nuevo'}`);
    } finally {
      setStageLoading(false);
    }
  };

  if (loading && programs.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Gestión de Contenido</h2>
      </div>

      {/* Mensajes de error y éxito */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
          <button 
            onClick={clearError} 
            className="ml-auto text-red-700 hover:text-red-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Selección de programa */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Programa</label>
        <div className="relative">
          <select
            value={selectedProgram || ''}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
            disabled={loading}
          >
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
          {loading && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            </div>
          )}
        </div>
      </div>

      {/* Lista de etapas */}
      {stageLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : stages.length > 0 ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Etapas del Programa</h3>
            <button
              onClick={() => {
                setIsCreatingStage(true);
                setIsEditingStage(false);
                setEditingStage(null);
                setNewStage({ name: '', order_num: 0 });
              }}
              className="flex items-center text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
              disabled={isCreatingStage}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Añadir Etapa
            </button>
          </div>
          
          {/* Formulario para crear nueva etapa */}
          {isCreatingStage && (
            <div className="bg-green-50 p-4 rounded-md mb-4 border border-green-200">
              <h5 className="text-sm font-medium mb-3 text-green-800">Nueva Etapa</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de la Etapa</label>
                  <input
                    type="text"
                    value={newStage.name || ''}
                    onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Ingresa el nombre de la etapa"
                    disabled={stageLoading}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2 mt-3">
                  <button
                    onClick={() => setIsCreatingStage(false)}
                    className="px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
                    disabled={stageLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateStage}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                    disabled={stageLoading}
                  >
                    {stageLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Formulario para editar etapa */}
          {isEditingStage && editingStage && (
            <div className="bg-blue-50 p-4 rounded-md mb-4 border border-blue-200">
              <h5 className="text-sm font-medium mb-3 text-blue-800">Editar Etapa</h5>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nombre de la Etapa</label>
                  <input
                    type="text"
                    value={editingStage.name || ''}
                    onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                    className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ingresa el nombre de la etapa"
                    disabled={stageLoading}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2 mt-3">
                  <button
                    onClick={() => {
                      setIsEditingStage(false);
                      setEditingStage(null);
                    }}
                    className="px-3 py-1 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
                    disabled={stageLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleUpdateStage}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    disabled={stageLoading}
                  >
                    {stageLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                    Actualizar
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            {stages.map((stage) => (
              <div key={stage.id} className="border border-gray-200 rounded-md overflow-hidden">
                <div className="flex justify-between items-center p-3 bg-gray-50">
                  <div className="font-medium flex-grow">{stage.name}</div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsEditingStage(true);
                        setIsCreatingStage(false);
                        setEditingStage(stage);
                      }}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Editar etapa"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStage(stage.id);
                      }}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Eliminar etapa"
                      disabled={stageLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
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
