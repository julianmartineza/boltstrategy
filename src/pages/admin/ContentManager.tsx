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
import * as contentTransitionService from '../../services/contentTransitionService';

// Extender la interfaz StageContent para incluir propiedades opcionales de video
interface ExtendedStageContent extends StageContent {
  url?: string;
  provider?: string;
}

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
      
      // Intentar cargar primero con la nueva estructura modular
      const modularContents = await contentManagerService.getModuleContents(stageId);
      
      if (modularContents && modularContents.length > 0) {
        console.log('Contenidos cargados desde la estructura modular:', modularContents);
        
        // Convertir los contenidos al formato esperado por el componente
        const adaptedContents = modularContents.map(content => ({
          id: content.id,
          title: content.title,
          content: content.content || '',
          content_type: content.content_type,
          stage_id: stageId,
          order_num: content.position,
          // Mapear otros campos según el tipo de contenido
          url: content.url,
          activity_data: content.activity_data,
          prompt_section: content.prompt_section,
          system_instructions: content.system_instructions
        } as StageContent));
        
        // Actualizar el estado de contenidos
        setContents(prevContents => {
          const otherContents = prevContents.filter(c => c.stage_id !== stageId);
          return [...otherContents, ...adaptedContents];
        });
      } else {
        // Si no hay contenidos en la estructura modular, cargar desde la estructura antigua
        console.log('No se encontraron contenidos en la estructura modular, cargando desde stage_content');
        const legacyContents = await contentManagerService.fetchStageContent(stageId);
        
        // Actualizar el estado de contenidos
        setContents(prevContents => {
          const otherContents = prevContents.filter(c => c.stage_id !== stageId);
          return [...otherContents, ...legacyContents];
        });
      }
      
      setContentLoading(false);
    } catch (error: any) {
      console.error('Error al cargar contenido:', error);
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
        program_id: selectedProgram,
        required_content: '',  // Valor por defecto para required_content
        prompt_template: ''    // Valor por defecto para prompt_template
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
  const handleCreateContent = async (content: Partial<ExtendedStageContent>, activityData?: ActivityData) => {
    if (!selectedStage) {
      setError('Debes seleccionar una etapa primero');
      return;
    }

    try {
      setContentLoading(true);
      
      const contentToCreate = {
        ...content,
        stage_id: selectedStage
      };
      
      // Determinar si se debe usar la estructura modular o la antigua
      let createdContent: StageContent;
      
      if (content.content_type === 'text' && content.content) {
        // Usar la estructura modular para contenido de texto
        try {
          const result = await contentTransitionService.createContentWithNewStructure(
            contentToCreate,
            undefined
          );
          
          if (result) {
            createdContent = result as StageContent;
          } else {
            // Si falla la creación con la nueva estructura, usar la antigua
            createdContent = await contentManagerService.createContent(contentToCreate, activityData);
          }
        } catch (error) {
          console.error('Error al crear contenido con estructura modular:', error);
          // Fallback a la estructura antigua
          createdContent = await contentManagerService.createContent(contentToCreate, activityData);
        }
      } else if (content.content_type === 'video' && content.url) {
        // Usar la estructura modular para contenido de video
        try {
          // Para videos, preparar los datos correctamente para la estructura de la tabla
          const videoContent = {
            ...contentToCreate,
            url: content.url, // URL del video
            provider: content.provider || 'youtube' // Proveedor por defecto (se convertirá a 'source' en el servicio)
          };
          
          console.log('Creando contenido de video con:', videoContent);
          
          const result = await contentTransitionService.createContentWithNewStructure(
            videoContent,
            undefined
          );
          
          if (result) {
            createdContent = result as StageContent;
          } else {
            // Si falla la creación con la nueva estructura, usar la antigua
            createdContent = await contentManagerService.createContent(contentToCreate, activityData);
          }
        } catch (error) {
          console.error('Error al crear contenido con estructura modular:', error);
          // Fallback a la estructura antigua
          createdContent = await contentManagerService.createContent(contentToCreate, activityData);
        }
      } else {
        // Usar la estructura antigua para otros tipos de contenido
        createdContent = await contentManagerService.createContent(contentToCreate, activityData);
      }
      
      // Después de crear el contenido, cargar la lista completa de contenidos para asegurar que se muestre correctamente
      if (selectedStage) {
        await loadStageContent(selectedStage);
      } else {
        // Si no hay etapa seleccionada, agregar el contenido al estado local
        setContents(prev => [...prev, createdContent]);
      }
      
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
  const handleUpdateContent = async (content: Partial<StageContent>, activityData?: ActivityData) => {
    if (!content.id) return;
    
    try {
      setContentLoading(true);
      
      const updatedContent = await contentManagerService.updateContent(content as StageContent, activityData);
      
      // Después de actualizar el contenido, recargar la lista completa para asegurar que se muestre correctamente
      if (content.stage_id) {
        await loadStageContent(content.stage_id);
      } else {
        // Si no hay stage_id, actualizar el contenido en el estado local
        setContents(prev => prev.map(c => c.id === updatedContent.id ? updatedContent : c));
      }
      
      setEditingContent(null);
      
      showSuccessMessage('Contenido actualizado exitosamente');
      setContentLoading(false);
    } catch (error: any) {
      setError(`Error al actualizar contenido: ${error.message}`);
      setContentLoading(false);
    }
  };

  // Eliminar contenido
  const handleDeleteContent = async (contentId: string, stageId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este contenido?')) {
      return;
    }
    
    try {
      setContentLoading(true);
      
      // Intentar eliminar primero con la estructura modular
      let success = false;
      
      try {
        success = await contentTransitionService.deleteContentWithNewStructure(contentId);
      } catch (error) {
        console.error('Error al eliminar contenido con estructura modular:', error);
        // Si falla, intentar con la estructura antigua
        success = false;
      }
      
      if (!success) {
        // Usar la estructura antigua para eliminar el contenido
        const result = await contentManagerService.deleteContent(contentId);
        success = result === true;
      }
      
      if (success) {
        // Después de eliminar el contenido, recargar la lista completa para asegurar que se muestre correctamente
        await loadStageContent(stageId);
        showSuccessMessage('Contenido eliminado exitosamente');
      } else {
        setError('No se pudo eliminar el contenido');
      }
      
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
