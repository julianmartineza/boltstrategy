import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { PlusCircle, Edit, Trash2, Save, X } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

const ProgramsManager: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [newProgram, setNewProgram] = useState<Partial<Program>>({
    name: '',
    description: '',
    status: 'not_started'
  });
  const [isCreating, setIsCreating] = useState(false);

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
      setNewProgram({ name: '', description: '', status: 'not_started' });
      setIsCreating(false);
      setError(null);
    } catch (err) {
      console.error('Error al crear programa:', err);
      setError('Error al crear el programa. Por favor, inténtalo de nuevo.');
    }
  };

  // Actualizar un programa existente
  const handleUpdateProgram = async () => {
    if (!editingProgram) return;

    try {
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
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrograms(programs.filter(p => p.id !== id));
      setError(null);
    } catch (err) {
      console.error('Error al eliminar programa:', err);
      setError('Error al eliminar el programa. Por favor, inténtalo de nuevo.');
    }
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Gestión de Programas</h2>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center text-sm bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Nuevo Programa
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Formulario para crear nuevo programa */}
      {isCreating && (
        <div className="bg-gray-50 p-4 rounded-md mb-6 border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Crear Nuevo Programa</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={newProgram.name || ''}
                onChange={(e) => setNewProgram({ ...newProgram, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={newProgram.description || ''}
                onChange={(e) => setNewProgram({ ...newProgram, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={newProgram.status || 'not_started'}
                onChange={(e) => setNewProgram({ ...newProgram, status: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="not_started">No iniciado</option>
                <option value="in_progress">En progreso</option>
                <option value="completed">Completado</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewProgram({ name: '', description: '', status: 'not_started' });
                  setError(null);
                }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProgram}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Guardar Programa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de programas */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Creación</th>
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
            ) : (
              programs.map((program) => (
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
                        onChange={(e) => setEditingProgram({ ...editingProgram, status: e.target.value })}
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
