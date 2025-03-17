import React, { useState, useEffect } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';

// Importar componentes refactorizados
import ProgramSelector from '../../components/admin/content-manager/ProgramSelector';
import StageList from '../../components/admin/content-manager/StageList';
import StageForm from '../../components/admin/content-manager/StageForm';
import ContentForm from '../../components/admin/content-manager/ContentForm';
import Notification from '../../components/admin/content-manager/Notification';

// Importar tipos y servicios
import { Program, Stage, StageContent, ActivityData } from '../../components/admin/content-manager/types';
import * as contentManagerService from '../../components/admin/content-manager/contentManagerService';

const ContentManager: React.FC = () => {
  // Estados para datos
  const [stages, setStages] = useState<Stage[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [contents, setContents] = useState<StageContent[]>([]);
  
  // Estados para UI
  const [loading, setLoading] = useState(true);
  const [stageLoading, setStageLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para gestión de etapas
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [isEditingStage, setIsEditingStage] = useState(false);
  const [newStage, setNewStage] = useState<Partial<Stage>>({ name: '', order_num: 0 });
  const [editingStage, setEditingStage] = useState<Stage | null>(null);
  
  // Estados para selección y edición
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  
  // Estados para gestión de contenido
  const [isCreating, setIsCreating] = useState(false);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [newContent, setNewContent] = useState<Partial<StageContent>>({
    title: '',
    content: '',
    content_type: 'text',
    order_num: 0
  });
  const [editingContent, setEditingContent] = useState<StageContent | null>(null);
  
  // Mostrar mensaje de éxito
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  // Limpiar mensaje de error
  const clearError = () => {
    setError(null);
  };

  // Cargar programas
  useEffect(() => {
    const fetchProgramsData = async () => {
      try {
        setLoading(true);
        const data = await contentManagerService.fetchPrograms();
        setPrograms(data);
        setLoading(false);
      } catch (error: any) {
        setError(`Error al cargar programas: ${error.message}`);
        setLoading(false);
      }
    };

    fetchProgramsData();
  }, []);

  // Cargar etapas cuando se selecciona un programa
  useEffect(() => {
    if (!selectedProgram) {
      setStages([]);
      return;
    }

    const fetchStagesData = async () => {
      try {
        setStageLoading(true);
        const data = await contentManagerService.fetchStages(selectedProgram);
        setStages(data);
        setStageLoading(false);
      } catch (error: any) {
        setError(`Error al cargar etapas: ${error.message}`);
        setStageLoading(false);
      }
    };

    fetchStagesData();
  }, [selectedProgram]);

  // Cargar contenido cuando se expande una etapa
  const loadStageContent = async (stageId: string) => {
    try {
      setContentLoading(true);
      const data = await contentManagerService.fetchStageContent(stageId);
      
      // Actualizar el estado de contenidos, manteniendo los contenidos de otras etapas
      setContents(prevContents => {
        const otherContents = prevContents.filter(c => c.stage_id !== stageId);
        return [...otherContents, ...data];
      });
      
      setContentLoading(false);
    } catch (error: any) {
      setError(`Error al cargar contenido: ${error.message}`);
      setContentLoading(false);
    }
  };

  // Alternar la expansión de una etapa
  const toggleStageExpansion = (stageId: string) => {
    setExpandedStages(prev => {
      const newState = { ...prev, [stageId]: !prev[stageId] };
      
      // Si se está expandiendo y no hay contenidos cargados para esta etapa, cargarlos
      if (newState[stageId] && !contents.some(c => c.stage_id === stageId)) {
        loadStageContent(stageId);
      }
      
      return newState;
    });
  };

  // Crear nueva etapa
  const handleCreateStage = async (stage: Partial<Stage>) => {
    if (!selectedProgram) {
      setError('Debes seleccionar un programa primero');
      return;
    }

    try {
      setStageLoading(true);
      
      const newStageData = {
        ...stage,
        program_id: selectedProgram
      };
      
      const createdStage = await contentManagerService.createStage(newStageData);
      
      setStages(prev => [...prev, createdStage]);
      setIsCreatingStage(false);
      setNewStage({ name: '', order_num: 0 });
      showSuccessMessage('Etapa creada exitosamente');
      setStageLoading(false);
    } catch (error: any) {
      setError(`Error al crear etapa: ${error.message}`);
      setStageLoading(false);
    }
  };

  // Actualizar etapa existente
  const handleUpdateStage = async (stage: Partial<Stage>) => {
    if (!editingStage) return;
    
    try {
      setStageLoading(true);
      
      const updatedStage = await contentManagerService.updateStage({
        ...editingStage,
        ...stage
      });
      
      setStages(prev => prev.map(s => s.id === updatedStage.id ? updatedStage : s));
      setIsEditingStage(false);
      setEditingStage(null);
      showSuccessMessage('Etapa actualizada exitosamente');
      setStageLoading(false);
    } catch (error: any) {
      setError(`Error al actualizar etapa: ${error.message}`);
      setStageLoading(false);
    }
  };

  // Eliminar etapa
  const handleDeleteStage = async (stageId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta etapa? Esta acción eliminará también todo el contenido asociado.')) {
      return;
    }
    
    try {
      setStageLoading(true);
      
      await contentManagerService.deleteStage(stageId);
      
      setStages(prev => prev.filter(s => s.id !== stageId));
      setContents(prev => prev.filter(c => c.stage_id !== stageId));
      setExpandedStages(prev => {
        const newState = { ...prev };
        delete newState[stageId];
        return newState;
      });
      
      showSuccessMessage('Etapa eliminada exitosamente');
      setStageLoading(false);
    } catch (error: any) {
      setError(`Error al eliminar etapa: ${error.message}`);
      setStageLoading(false);
    }
  };

  // Crear nuevo contenido
  const handleCreateContent = async (content: Partial<StageContent>, activityData: ActivityData) => {
    if (!selectedStage) return;
    
    try {
      setContentLoading(true);
      
      const contentToCreate = {
        ...content,
        stage_id: selectedStage
      };
      
      const createdContent = await contentManagerService.createContent(contentToCreate, 
        content.content_type === 'activity' ? activityData : undefined);
      
      setContents(prev => [...prev, createdContent]);
      setIsCreating(false);
      setSelectedStage(null);
      setNewContent({
        title: '',
        content: '',
        content_type: 'text',
        order_num: 0
      });
      
      showSuccessMessage('Contenido creado exitosamente');
      setContentLoading(false);
    } catch (error: any) {
      setError(`Error al crear contenido: ${error.message}`);
      setContentLoading(false);
    }
  };

  // Actualizar contenido existente
  const handleUpdateContent = async (content: Partial<StageContent>, activityData: ActivityData) => {
    if (!content.id) return;
    
    try {
      setContentLoading(true);
      
      const updatedContent = await contentManagerService.updateContent(content as StageContent, 
        content.content_type === 'activity' ? activityData : undefined);
      
      setContents(prev => prev.map(c => c.id === updatedContent.id ? updatedContent : c));
      setEditingContent(null);
      
      showSuccessMessage('Contenido actualizado exitosamente');
      setContentLoading(false);
    } catch (error: any) {
      setError(`Error al actualizar contenido: ${error.message}`);
      setContentLoading(false);
    }
  };

  // Eliminar contenido
  const handleDeleteContent = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este contenido?')) {
      return;
    }
    
    try {
      setContentLoading(true);
      
      await contentManagerService.deleteContent(id);
      
      setContents(prev => prev.filter(c => c.id !== id));
      showSuccessMessage('Contenido eliminado exitosamente');
      setContentLoading(false);
    } catch (error: any) {
      setError(`Error al eliminar contenido: ${error.message}`);
      setContentLoading(false);
    }
  };

  // Iniciar creación de contenido
  const startContentCreation = (stageId: string) => {
    setSelectedStage(stageId);
    setIsCreating(true);
    setNewContent({
      title: '',
      content: '',
      content_type: 'text',
      order_num: contents.filter(c => c.stage_id === stageId).length
    });
  };

  // Iniciar edición de contenido
  const startContentEditing = (content: StageContent) => {
    setEditingContent(content);
  };

  // Iniciar creación de etapa
  const startStageCreation = () => {
    setIsCreatingStage(true);
    setNewStage({
      name: '',
      order_num: stages.length
    });
  };

  // Iniciar edición de etapa
  const startStageEditing = (stage: Stage) => {
    setIsEditingStage(true);
    setEditingStage(stage);
  };

  // Cancelar creación/edición de etapa
  const cancelStageForm = () => {
    setIsCreatingStage(false);
    setIsEditingStage(false);
    setEditingStage(null);
  };

  // Cancelar creación/edición de contenido
  const cancelContentForm = () => {
    setIsCreating(false);
    setEditingContent(null);
    setSelectedStage(null);
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

      {error && (
        <Notification 
          type="error" 
          message={error} 
          onClose={clearError} 
        />
      )}

      {successMessage && (
        <Notification 
          type="success" 
          message={successMessage} 
          onClose={() => setSuccessMessage(null)} 
        />
      )}

      <ProgramSelector 
        programs={programs}
        selectedProgram={selectedProgram}
        onSelectProgram={setSelectedProgram}
        loading={loading}
      />

      {stageLoading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : selectedProgram ? (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Etapas del Programa</h3>
            <button
              onClick={startStageCreation}
              className="flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
              disabled={stageLoading || isCreatingStage || isEditingStage}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Añadir Etapa
            </button>
          </div>

          {isCreatingStage && (
            <StageForm 
              stage={newStage}
              onSave={handleCreateStage}
              onCancel={cancelStageForm}
              loading={stageLoading}
            />
          )}

          {isEditingStage && editingStage && (
            <StageForm 
              stage={editingStage}
              onSave={handleUpdateStage}
              onCancel={cancelStageForm}
              loading={stageLoading}
              isEditing
            />
          )}

          {isCreating && selectedStage && (
            <ContentForm 
              content={newContent}
              onSave={handleCreateContent}
              onCancel={cancelContentForm}
              loading={contentLoading}
            />
          )}

          {editingContent && (
            <ContentForm 
              content={editingContent}
              onSave={handleUpdateContent}
              onCancel={cancelContentForm}
              loading={contentLoading}
              isEditing
            />
          )}

          <StageList 
            stages={stages}
            contents={contents}
            expandedStages={expandedStages}
            onToggleStage={toggleStageExpansion}
            onEditStage={startStageEditing}
            onDeleteStage={handleDeleteStage}
            onAddContent={startContentCreation}
            onEditContent={startContentEditing}
            onDeleteContent={handleDeleteContent}
            loading={stageLoading}
            contentLoading={contentLoading}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Selecciona un programa para ver sus etapas.
        </div>
      )}
    </div>
  );
};

export default ContentManager;
