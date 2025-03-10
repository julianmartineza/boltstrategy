import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PlusCircle, Edit, Trash2, Save, X } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'archived';
  created_at: string;
  updated_at?: string;
  user_count?: number;
}

const ProgramsManager: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [newProgram, setNewProgram] = useState<Partial<Program>>({
    name: '',
    description: '',
    status: 'not_started' as const
  });
  const [isCreating, setIsCreating] = useState(false);
  const [sortField, setSortField] = useState<keyof Program>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Cargar programas
  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('programs')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setPrograms(data || []);
      } catch (err) {
        console.error('Error al cargar programas:', err);
        setError('Error al cargar los programas. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  // Crear un nuevo programa
  const handleCreateProgram = async () => {
    try {
      if (!newProgram.name || !newProgram.description) {
        setError('El nombre y la descripción son obligatorios.');
        return;
      }

      const { data, error } = await supabase
        .from('programs')
        .insert([newProgram])
        .select();

      if (error) throw error;

      setPrograms([...(data || []), ...programs]);
      setNewProgram({ name: '', description: '', status: 'not_started' as const });
      setIsCreating(false);
      setError(null);
      setSuccess('Programa creado exitosamente.');
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al crear programa:', err);
      setError('Error al crear el programa. Por favor, inténtalo de nuevo.');
    }
  };

  // Actualizar un programa existente
  const handleUpdateProgram = async () => {
    if (!editingProgram) return;

    try {
      if (!editingProgram.name || !editingProgram.description) {
        setError('El nombre y la descripción son obligatorios.');
        return;
      }

      const { error } = await supabase
        .from('programs')
        .update({
          name: editingProgram.name,
          description: editingProgram.description,
          status: editingProgram.status
        })
        .eq('id', editingProgram.id);

      if (error) throw error;

      setPrograms(programs.map(p => 
        p.id === editingProgram.id ? editingProgram : p
      ));
      setEditingProgram(null);
      setError(null);
      setSuccess('Programa actualizado exitosamente.');
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al actualizar programa:', err);
      setError('Error al actualizar el programa. Por favor, inténtalo de nuevo.');
    }
  };

  // Eliminar un programa
  const handleDeleteProgram = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este programa? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      // Primero verificar si hay etapas asociadas a este programa
      const { data: stages, error: stagesError } = await supabase
        .from('strategy_stages')
        .select('id')
        .eq('program_id', id);
      
      if (stagesError) throw stagesError;
      
      if (stages && stages.length > 0) {
        setError(`No se puede eliminar este programa porque tiene ${stages.length} etapa(s) asociada(s). Elimina primero las etapas.`);
        return;
      }

      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrograms(programs.filter(p => p.id !== id));
      setError(null);
      setSuccess('Programa eliminado exitosamente.');
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al eliminar programa:', err);
      setError('Error al eliminar el programa. Por favor, inténtalo de nuevo.');
    }
  };

  // Ordenar programas
  const sortedPrograms = [...programs].sort((a, b) => {
    if (sortField === 'created_at') {
      const dateA = new Date(a[sortField]).getTime();
      const dateB = new Date(b[sortField]).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    } else {
      const valueA = a[sortField] || '';
      const valueB = b[sortField] || '';
      return sortDirection === 'asc' 
        ? valueA.toString().localeCompare(valueB.toString()) 
        : valueB.toString().localeCompare(valueA.toString());
    }
  });

  // Cambiar el orden
  const toggleSort = (field: keyof Program) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Obtener el ícono de ordenación
  const getSortIcon = (field: keyof Program) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Gestión de Programas</h2>
          <p className="text-sm text-gray-500 mt-1">Administra los programas de estrategia disponibles</p>
        </div>
        {!isCreating && (
          <button
            onClick={() => {
              setIsCreating(true);
              setError(null);
              setSuccess(null);
            }}
            className="flex items-center text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nuevo Programa
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 flex items-start">
          <X className="h-5 w-5 mr-2 flex-shrink-0 text-red-500" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4 flex items-start">
          <Save className="h-5 w-5 mr-2 flex-shrink-0 text-green-500" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Formulario para crear nuevo programa */}
      {isCreating && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-800">Crear Nuevo Programa</h3>
            <button 
              onClick={() => {
                setIsCreating(false);
                setNewProgram({ name: '', description: '', status: 'not_started' as const });
                setError(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Programa</label>
              <input
                type="text"
                value={newProgram.name || ''}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Ej: Estrategia de Crecimiento 2025"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={newProgram.description || ''}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                rows={3}
                placeholder="Describe el propósito y objetivos del programa..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={newProgram.status || 'not_started'}
                onChange={(e) => setNewProgram({ ...newProgram, status: e.target.value as Program['status'] })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="not_started">No iniciado</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProgram({ name: '', description: '', status: 'not_started' as const });
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProgram}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <Save size={16} />
                <span>Guardar Programa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de programas */}
      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSort('name')}
              >
                Nombre {getSortIcon('name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSort('status')}
              >
                Estado {getSortIcon('status')}
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleSort('created_at')}
              >
                Fecha de Creación {getSortIcon('created_at')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {programs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  No hay programas disponibles. Crea uno nuevo para empezar.
                </td>
              </tr>
            ) : loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Cargando programas...</span>
                  </div>
                </td>
              </tr>
            ) : (
              sortedPrograms.map((program) => (
                <tr key={program.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProgram?.id === program.id ? (
                      <input
                        type="text"
                        value={editingProgram.name}
                        onChange={(e) => setEditingProgram({ ...editingProgram, name: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded-md"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{program.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingProgram?.id === program.id ? (
                      <textarea
                        value={editingProgram.description}
                        onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded-md"
                        rows={2}
                      />
                    ) : (
                      <div className="text-sm text-gray-500 max-w-md truncate">{program.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProgram?.id === program.id ? (
                      <select
                        value={editingProgram.status}
                        onChange={(e) => setEditingProgram({ ...editingProgram, status: e.target.value as Program['status'] })}
                        className="w-full p-1 border border-gray-300 rounded-md"
                      >
                        <option value="not_started">No iniciado</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completado</option>
                      </select>
                    ) : (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${program.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          program.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}
                      >
                        {program.status === 'completed' ? 'Completado' : 
                         program.status === 'in_progress' ? 'En progreso' : 
                         'No iniciado'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(program.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingProgram?.id === program.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleUpdateProgram}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Save className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setEditingProgram(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingProgram(program)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProgram(program.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
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
  );
};

export default ProgramsManager;
