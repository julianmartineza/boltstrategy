import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PlusCircle, Edit, Trash2, Save, X } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'archived' | 'active';
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

  // Activar/desactivar un programa
  const toggleProgramStatus = async (program: Program) => {
    try {
      const newStatus = program.status === 'active' ? 'not_started' : 'active';
      
      // Si estamos activando este programa, primero desactivamos cualquier otro programa activo
      if (newStatus === 'active') {
        const { error: updateError } = await supabase
          .from('programs')
          .update({ status: 'not_started' })
          .eq('status', 'active');
        
        if (updateError) throw updateError;
      }
      
      // Actualizar el estado del programa seleccionado
      const { error } = await supabase
        .from('programs')
        .update({ status: newStatus })
        .eq('id', program.id);

      if (error) throw error;

      // Actualizar la lista de programas
      setPrograms(programs.map(p => 
        p.id === program.id 
          ? { ...p, status: newStatus } 
          : (newStatus === 'active' && p.status === 'active' ? { ...p, status: 'not_started' } : p)
      ));
      
      setError(null);
      setSuccess(`Programa ${newStatus === 'active' ? 'activado' : 'desactivado'} exitosamente.`);
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al cambiar el estado del programa:', err);
      setError('Error al cambiar el estado del programa. Por favor, inténtalo de nuevo.');
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
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusCircle size={16} />
          <span>Nuevo Programa</span>
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
          <X size={18} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      {isCreating && (
        <div className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50">
          <h3 className="text-lg font-medium mb-3">Nuevo Programa</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={newProgram.name}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nombre del programa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={newProgram.description}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                placeholder="Descripción del programa"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={newProgram.status}
                onChange={(e) => setNewProgram({ 
                  ...newProgram, 
                  status: e.target.value as 'not_started' | 'in_progress' | 'completed' | 'archived' | 'active' 
                })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="not_started">No iniciado</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completado</option>
                <option value="archived">Archivado</option>
                <option value="active">Activo</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProgram({
                    name: '',
                    description: '',
                    status: 'not_started'
                  });
                }}
                className="px-3 py-1 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProgram}
                className="px-3 py-1 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                disabled={!newProgram.name || !newProgram.description}
              >
                Crear Programa
              </button>
            </div>
          </div>
        </div>
      )}

      {programs.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay programas disponibles. Crea un nuevo programa para comenzar.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Nombre {getSortIcon('name')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Estado {getSortIcon('status')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleSort('created_at')}
                >
                  <div className="flex items-center gap-1">
                    Creado {getSortIcon('created_at')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPrograms.map((program) => (
                <tr key={program.id} className={program.status === 'active' ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProgram && editingProgram.id === program.id ? (
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
                    {editingProgram && editingProgram.id === program.id ? (
                      <textarea
                        value={editingProgram.description}
                        onChange={(e) => setEditingProgram({ ...editingProgram, description: e.target.value })}
                        className="w-full p-1 border border-gray-300 rounded-md"
                        rows={2}
                      />
                    ) : (
                      <div className="text-sm text-gray-500 line-clamp-2">{program.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingProgram && editingProgram.id === program.id ? (
                      <select
                        value={editingProgram.status}
                        onChange={(e) => setEditingProgram({ 
                          ...editingProgram, 
                          status: e.target.value as 'not_started' | 'in_progress' | 'completed' | 'archived' | 'active'
                        })}
                        className="w-full p-1 border border-gray-300 rounded-md"
                      >
                        <option value="not_started">No iniciado</option>
                        <option value="in_progress">En progreso</option>
                        <option value="completed">Completado</option>
                        <option value="archived">Archivado</option>
                        <option value="active">Activo</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        program.status === 'not_started' ? 'bg-gray-100 text-gray-800' :
                        program.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        program.status === 'completed' ? 'bg-green-100 text-green-800' :
                        program.status === 'active' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {program.status === 'not_started' ? 'No iniciado' :
                         program.status === 'in_progress' ? 'En progreso' :
                         program.status === 'completed' ? 'Completado' :
                         program.status === 'active' ? 'Activo' :
                         'Archivado'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(program.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingProgram && editingProgram.id === program.id ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingProgram(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X size={18} />
                        </button>
                        <button
                          onClick={() => handleUpdateProgram()}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Save size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => toggleProgramStatus(program)}
                          className={`text-sm ${program.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-purple-600 hover:text-purple-900'}`}
                        >
                          {program.status === 'active' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => setEditingProgram(program)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProgram(program.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ProgramsManager;
