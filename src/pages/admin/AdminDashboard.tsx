import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// Implementación real del gestor de programas
const ProgramsManager = () => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProgram, setNewProgram] = useState({ name: '', description: '' });
  const [editingProgram, setEditingProgram] = useState<any>(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrograms(data || []);
    } catch (error) {
      console.error('Error al cargar programas:', error);
      alert('Error al cargar programas. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    try {
      if (!newProgram.name.trim()) {
        alert('El nombre del programa es obligatorio');
        return;
      }

      const { data, error } = await supabase
        .from('programs')
        .insert([{
          name: newProgram.name,
          description: newProgram.description
        }])
        .select();

      if (error) throw error;
      
      setPrograms([...(data || []), ...programs]);
      setNewProgram({ name: '', description: '' });
      await fetchPrograms(); // Recargar la lista completa
    } catch (error) {
      console.error('Error al crear programa:', error);
      alert('Error al crear programa. Por favor, intenta de nuevo.');
    }
  };

  const handleUpdateProgram = async () => {
    if (!editingProgram) return;
    
    try {
      const { error } = await supabase
        .from('programs')
        .update({
          name: editingProgram.name,
          description: editingProgram.description
        })
        .eq('id', editingProgram.id);

      if (error) throw error;
      
      setPrograms(programs.map(p => p.id === editingProgram.id ? editingProgram : p));
      setEditingProgram(null);
    } catch (error) {
      console.error('Error al actualizar programa:', error);
      alert('Error al actualizar programa. Por favor, intenta de nuevo.');
    }
  };

  const handleDeleteProgram = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este programa? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPrograms(programs.filter(p => p.id !== id));
    } catch (error) {
      console.error('Error al eliminar programa:', error);
      alert('Error al eliminar programa. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Gestor de Programas</h2>
      
      {/* Formulario para crear nuevo programa */}
      <div className="mb-6 p-4 border border-gray-200 rounded-md">
        <h3 className="text-lg font-medium mb-3">Crear Nuevo Programa</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              value={newProgram.name}
              onChange={(e) => setNewProgram({...newProgram, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nombre del programa"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={newProgram.description}
              onChange={(e) => setNewProgram({...newProgram, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Descripción del programa"
              rows={3}
            />
          </div>
          <button
            onClick={handleCreateProgram}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Crear Programa
          </button>
        </div>
      </div>
      
      {/* Lista de programas */}
      <div>
        <h3 className="text-lg font-medium mb-3">Programas Existentes</h3>
        {loading ? (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Cargando programas...</p>
          </div>
        ) : programs.length === 0 ? (
          <p className="text-gray-500 py-4 text-center">No hay programas disponibles.</p>
        ) : (
          <div className="space-y-4">
            {programs.map((program) => (
              <div key={program.id} className="border border-gray-200 rounded-md p-4">
                {editingProgram && editingProgram.id === program.id ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={editingProgram.name}
                        onChange={(e) => setEditingProgram({...editingProgram, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                      <textarea
                        value={editingProgram.description}
                        onChange={(e) => setEditingProgram({...editingProgram, description: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleUpdateProgram}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingProgram(null)}
                        className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="text-lg font-medium">{program.name}</h4>
                    <p className="text-gray-600 mt-1">{program.description || 'Sin descripción'}</p>
                    <div className="flex space-x-2 mt-3">
                      <button
                        onClick={() => setEditingProgram(program)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProgram(program.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Implementación real del gestor de contenido
const ContentManager = () => {
  const [stages, setStages] = useState<any[]>([]);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [newContent, setNewContent] = useState({ title: '', content_type: 'text', content_data: '', order: 0 });
  const [editingContent, setEditingContent] = useState<any>(null);

  useEffect(() => {
    fetchStages();
  }, []);

  useEffect(() => {
    if (selectedStage) {
      fetchContents(selectedStage);
    }
  }, [selectedStage]);

  const fetchStages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('strategy_stages')
        .select('*')
        .order('order', { ascending: true });

      if (error) throw error;
      setStages(data || []);
      if (data && data.length > 0 && !selectedStage) {
        setSelectedStage(data[0].id);
      }
    } catch (error) {
      console.error('Error al cargar etapas:', error);
      alert('Error al cargar etapas. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const fetchContents = async (stageId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stage_content')
        .select('*')
        .eq('stage_id', stageId)
        .order('order', { ascending: true });

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error al cargar contenidos:', error);
      alert('Error al cargar contenidos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContent = async () => {
    if (!selectedStage) return;
    
    try {
      if (!newContent.title.trim()) {
        alert('El título del contenido es obligatorio');
        return;
      }

      const { data, error } = await supabase
        .from('stage_content')
        .insert([{
          stage_id: selectedStage,
          title: newContent.title,
          content_type: newContent.content_type,
          content_data: newContent.content_data,
          order: newContent.order
        }])
        .select();

      if (error) throw error;
      
      setContents([...contents, ...(data || [])]);
      setNewContent({ title: '', content_type: 'text', content_data: '', order: contents.length });
    } catch (error) {
      console.error('Error al crear contenido:', error);
      alert('Error al crear contenido. Por favor, intenta de nuevo.');
    }
  };

  const handleUpdateContent = async () => {
    if (!editingContent) return;
    
    try {
      const { error } = await supabase
        .from('stage_content')
        .update({
          title: editingContent.title,
          content_type: editingContent.content_type,
          content_data: editingContent.content_data,
          order: editingContent.order
        })
        .eq('id', editingContent.id);

      if (error) throw error;
      
      setContents(contents.map(c => c.id === editingContent.id ? editingContent : c));
      setEditingContent(null);
    } catch (error) {
      console.error('Error al actualizar contenido:', error);
      alert('Error al actualizar contenido. Por favor, intenta de nuevo.');
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este contenido? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('stage_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setContents(contents.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error al eliminar contenido:', error);
      alert('Error al eliminar contenido. Por favor, intenta de nuevo.');
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Gestor de Contenido</h2>
      
      {/* Selector de etapa */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Etapa</label>
        <select
          value={selectedStage || ''}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Selecciona una etapa</option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>
      
      {selectedStage && (
        <>
          {/* Formulario para crear nuevo contenido */}
          <div className="mb-6 p-4 border border-gray-200 rounded-md">
            <h3 className="text-lg font-medium mb-3">Añadir Nuevo Contenido</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={newContent.title}
                  onChange={(e) => setNewContent({...newContent, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Título del contenido"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contenido</label>
                <select
                  value={newContent.content_type}
                  onChange={(e) => setNewContent({...newContent, content_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="text">Texto</option>
                  <option value="video">Video</option>
                  <option value="image">Imagen</option>
                  <option value="quiz">Cuestionario</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
                <textarea
                  value={newContent.content_data}
                  onChange={(e) => setNewContent({...newContent, content_data: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Contenido (texto, URL de video/imagen, o JSON para cuestionarios)"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                <input
                  type="number"
                  value={newContent.order}
                  onChange={(e) => setNewContent({...newContent, order: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <button
                onClick={handleCreateContent}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Añadir Contenido
              </button>
            </div>
          </div>
          
          {/* Lista de contenidos */}
          <div>
            <h3 className="text-lg font-medium mb-3">Contenidos Existentes</h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="mt-2 text-gray-600">Cargando contenidos...</p>
              </div>
            ) : contents.length === 0 ? (
              <p className="text-gray-500 py-4 text-center">No hay contenidos disponibles para esta etapa.</p>
            ) : (
              <div className="space-y-4">
                {contents.map((content) => (
                  <div key={content.id} className="border border-gray-200 rounded-md p-4">
                    {editingContent && editingContent.id === content.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                          <input
                            type="text"
                            value={editingContent.title}
                            onChange={(e) => setEditingContent({...editingContent, title: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Contenido</label>
                          <select
                            value={editingContent.content_type}
                            onChange={(e) => setEditingContent({...editingContent, content_type: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="text">Texto</option>
                            <option value="video">Video</option>
                            <option value="image">Imagen</option>
                            <option value="quiz">Cuestionario</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Contenido</label>
                          <textarea
                            value={editingContent.content_data}
                            onChange={(e) => setEditingContent({...editingContent, content_data: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={4}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                          <input
                            type="number"
                            value={editingContent.order}
                            onChange={(e) => setEditingContent({...editingContent, order: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            min="0"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleUpdateContent}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingContent(null)}
                            className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-lg font-medium">{content.title}</h4>
                            <p className="text-sm text-gray-500 mt-1">Tipo: {content.content_type} | Orden: {content.order}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingContent(content)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteContent(content.id)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-gray-700 whitespace-pre-wrap">{content.content_data}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

interface AdminDashboardProps {
  activeTab?: 'programs' | 'content';
}

// Componentes de pestañas implementados directamente
const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab = 'programs' }) => {
  const [currentTab, setCurrentTab] = useState<string>(activeTab);
  const { isAdmin } = useAuthStore();

  // Redirigir si el usuario no es administrador
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }

  // Renderizar los componentes basados en la pestaña seleccionada
  const renderContent = () => {
    switch (currentTab) {
      case 'programs':
        return <ProgramsManager />;
      case 'content':
        return <ContentManager />;
      default:
        return <ProgramsManager />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Panel de Administración</h1>
      
      <div className="w-full">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500 mb-6">
          <button
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${currentTab === 'programs' ? 'bg-white text-blue-700 shadow-sm' : ''}`}
            onClick={() => setCurrentTab('programs')}
          >
            Gestión de Programas
          </button>
          <button
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 ${currentTab === 'content' ? 'bg-white text-blue-700 shadow-sm' : ''}`}
            onClick={() => setCurrentTab('content')}
          >
            Gestión de Contenido
          </button>
        </div>
        
        <div className="mt-2">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
