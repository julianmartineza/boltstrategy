import React, { useState, useEffect } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Importar componentes refactorizados
import ProgramSelector from '../../components/admin/content-manager/ProgramSelector';
import StageList from '../../components/admin/content-manager/StageList';
import StageForm from '../../components/admin/content-manager/StageForm';
import ContentForm from '../../components/admin/content-manager/ContentForm';
import Notification from '../../components/admin/content-manager/Notification';
import ConfirmDialog from '../../components/common/ConfirmDialog';

// Importar tipos y servicios
import { Program, Stage, ActivityData } from '../../components/admin/content-manager/types';
import { ActivityContent } from '../../types/index';
import * as contentManagerService from '../../components/admin/content-manager/contentManagerService';
import * as contentTransitionService from '../../services/contentTransitionService';
import { debugAdvisorySessions } from '../../services/debugAdvisoryService';
import { debugVideoContents } from '../../services/debugVideoService';
import { debugTextContents } from '../../services/debugTextService';

const ContentManager: React.FC = () => {
  // Estados para datos
  const [stages, setStages] = useState<Stage[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [contents, setContents] = useState<ActivityContent[]>([]);
  
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
  const [newContent, setNewContent] = useState<Partial<ActivityContent>>({
    title: '',
    content: '',
    content_type: 'text',
    order: 0,
    stage_id: '',
    id: '',
    created_at: '',
    updated_at: ''
  });
  const [editingContent, setEditingContent] = useState<ActivityContent | null>(null);
  
  // Estados para el diálogo de confirmación
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    contentId: '',
    stageId: ''
  });

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
      const data = await contentTransitionService.getModuleContents(stageId);
      
      if (data && data.length > 0) {
        if (import.meta.env.DEV) {
          console.log('Contenidos obtenidos:', data);
        }
        
        // Adaptar los contenidos al formato esperado por ContentList
        const adaptedContents = data.map(content => {
          return {
            id: content.registry_id || content.id,
            title: content.title,
            content: content.content || '',
            content_type: content.content_type,
            stage_id: stageId,
            order: content.position,
            created_at: content.created_at || new Date().toISOString(),
            updated_at: content.updated_at || new Date().toISOString(),
            url: content.url,
            provider: content.provider,
            activity_data: content.activity_data,
            prompt_section: content.prompt_section,
            system_instructions: content.system_instructions,
            duration: content.duration,
            session_type: content.session_type,
            dependencies: content.dependencies || []
          } as ActivityContent;
        });
        
        if (import.meta.env.DEV) {
          console.log('Contenidos adaptados para ContentList:', adaptedContents);
        }
        
        setContents(adaptedContents);
      } else {
        if (import.meta.env.DEV) {
          console.log('No se encontraron contenidos para la etapa:', stageId);
        }
        setContents([]);
      }
      
      setContentLoading(false);
    } catch (error) {
      console.error('Error al cargar contenidos:', error);
      setError(`Error al cargar contenidos: ${error instanceof Error ? error.message : String(error)}`);
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
  const handleCreateContent = async (content: Partial<ActivityContent>, activityData?: ActivityData) => {
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
      let createdContent: ActivityContent;
      
      if (content.content_type === 'text' && content.content) {
        // Usar la estructura modular para contenido de texto
        try {
          const result = await contentTransitionService.createContent(
            contentToCreate,
            undefined
          );
          
          if (result) {
            createdContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo crear el contenido de texto');
          }
        } catch (error) {
          console.error('Error al crear contenido de texto:', error);
          setError(`Error al crear contenido de texto: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      } else if (content.content_type === 'video' && content.url) {
        // Usar la estructura modular para contenido de video
        try {
          // Para videos, preparar los datos correctamente para la estructura de la tabla
          const videoContent = {
            ...contentToCreate,
            url: content.content, // Usar content.content como URL del video
            provider: content.provider || 'youtube' // Proveedor por defecto (se convertirá a 'source' en el servicio)
          };
          
          console.log('Creando contenido de video con:', videoContent);
          
          const result = await contentTransitionService.createContent(
            videoContent,
            undefined
          );
          
          if (result) {
            createdContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo crear el contenido de video');
          }
        } catch (error) {
          console.error('Error al crear contenido de video:', error);
          setError(`Error al crear contenido de video: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      } else if (content.content_type === 'advisory_session') {
        // Para sesiones de asesoría, usar siempre la estructura modular
        try {
          const result = await contentTransitionService.createContent(
            contentToCreate,
            undefined
          );
          
          if (result) {
            createdContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo crear la sesión de asesoría');
          }
        } catch (error) {
          console.error('Error al crear sesión de asesoría:', error);
          setError(`Error al crear sesión de asesoría: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      } else if (content.content_type === 'activity') {
        // Para actividades, usar siempre la estructura modular
        try {
          const result = await contentTransitionService.createContent(
            contentToCreate,
            activityData
          );
          
          if (result) {
            createdContent = result as ActivityContent;
            console.log('Actividad creada con estructura modular:', createdContent);
          } else {
            throw new Error('No se pudo crear la actividad');
          }
        } catch (error) {
          console.error('Error al crear actividad:', error);
          setError(`Error al crear actividad: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      } else {
        // Para otros tipos de contenido, usar la estructura modular genérica
        try {
          const result = await contentTransitionService.createContent(
            contentToCreate,
            undefined
          );
          
          if (result) {
            createdContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo crear el contenido');
          }
        } catch (error) {
          console.error('Error al crear contenido:', error);
          setError(`Error al crear contenido: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
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
        order: 0,
        stage_id: '',
        id: '',
        created_at: '',
        updated_at: ''
      });
      showSuccessMessage('Contenido creado exitosamente');
      setContentLoading(false);
    } catch (error: any) {
      console.error('Error al crear contenido:', error);
      setError(`Error al crear contenido: ${error.message}`);
      setContentLoading(false);
    }
  };

  // Actualizar contenido existente
  const handleUpdateContent = async (content: ActivityContent, activityData?: ActivityData) => {
    try {
      setContentLoading(true);
      
      // Determinar si se debe usar la estructura modular o la antigua
      let updatedContent: ActivityContent;
      
      if (content.content_type === 'advisory_session') {
        // Para sesiones de asesoría, usar siempre la estructura modular
        try {
          const result = await contentTransitionService.updateContent(
            content,
            undefined
          );
          
          if (result) {
            updatedContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo actualizar la sesión de asesoría');
          }
        } catch (error) {
          console.error('Error al actualizar sesión de asesoría:', error);
          setError(`Error al actualizar sesión de asesoría: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      } else if (content.content_type === 'text') {
        // Para contenido de texto, usar la estructura modular
        try {
          const result = await contentTransitionService.updateContent(
            content,
            undefined
          );
          
          if (result) {
            updatedContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo actualizar el contenido de texto');
          }
        } catch (error) {
          console.error('Error al actualizar contenido de texto:', error);
          setError(`Error al actualizar contenido de texto: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      } else if (content.content_type === 'video') {
        // Para contenido de video, usar la estructura modular
        try {
          // Asegurarse de que la URL esté correctamente asignada
          const videoContent = {
            ...content,
            url: content.content // Usar content.content como URL del video
          };
          
          const result = await contentTransitionService.updateContent(
            videoContent,
            undefined
          );
          
          if (result) {
            updatedContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo actualizar el contenido de video');
          }
        } catch (error) {
          console.error('Error al actualizar contenido de video:', error);
          setError(`Error al actualizar contenido de video: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      } else if (content.content_type === 'activity') {
        // Para actividades, usar la estructura modular
        try {
          const result = await contentTransitionService.updateContent(
            content,
            activityData
          );
          
          if (result) {
            updatedContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo actualizar la actividad');
          }
        } catch (error) {
          console.error('Error al actualizar actividad:', error);
          setError(`Error al actualizar actividad: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      } else {
        // Para otros tipos, usar la estructura modular genérica
        try {
          const result = await contentTransitionService.updateContent(
            content,
            undefined
          );
          
          if (result) {
            updatedContent = result as ActivityContent;
          } else {
            throw new Error('No se pudo actualizar el contenido');
          }
        } catch (error) {
          console.error('Error al actualizar contenido:', error);
          setError(`Error al actualizar contenido: ${error instanceof Error ? error.message : String(error)}`);
          setContentLoading(false);
          return;
        }
      }
      
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
      console.error('Error al actualizar contenido:', error);
      setError(`Error al actualizar contenido: ${error.message}`);
      setContentLoading(false);
    }
  };

  // Eliminar contenido
  const handleDeleteContent = async (contentId: string, stageId: string) => {
    try {
      setConfirmDialog({
        ...confirmDialog,
        isOpen: false
      });
      
      setContentLoading(true);
      
      // Usar el servicio de transición para eliminar contenido
      const success = await contentTransitionService.deleteContent(contentId);
      
      if (success) {
        showSuccessMessage('Contenido eliminado exitosamente');
        await loadStageContent(stageId);
      } else {
        setError('No se pudo eliminar el contenido');
      }
      
      setContentLoading(false);
    } catch (error) {
      console.error('Error al eliminar contenido:', error);
      setError(`Error al eliminar contenido: ${error instanceof Error ? error.message : String(error)}`);
      setContentLoading(false);
    }
  };

  // Función para confirmar la eliminación del contenido
  const confirmDeleteContent = async () => {
    const { contentId, stageId } = confirmDialog;
    
    // Cerrar el diálogo
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      contentId: '',
      stageId: ''
    });
    
    console.log('confirmDeleteContent llamado con contentId:', contentId, 'stageId:', stageId);
    
    try {
      setContentLoading(true);
      
      // Usar el servicio de transición para eliminar contenido
      const success = await contentTransitionService.deleteContent(contentId);
      
      if (success) {
        showSuccessMessage('Contenido eliminado exitosamente');
        await loadStageContent(stageId);
      } else {
        setError('No se pudo eliminar el contenido');
      }
      
      setContentLoading(false);
    } catch (error) {
      console.error('Error al eliminar contenido:', error);
      setError(`Error al eliminar contenido: ${error instanceof Error ? error.message : String(error)}`);
      setContentLoading(false);
    }
  };
  
  // Función para cancelar la eliminación del contenido
  const cancelDeleteContent = () => {
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      contentId: '',
      stageId: ''
    });
  };

  // Iniciar creación de contenido
  const startContentCreation = (stageId: string) => {
    setSelectedStage(stageId);
    setIsCreating(true);
    setNewContent({
      title: '',
      content: '',
      content_type: 'text',
      order: 0,
      stage_id: stageId,
      id: '',
      created_at: '',
      updated_at: ''
    });
  };

  // Iniciar edición de contenido
  const startContentEditing = async (content: ActivityContent) => {
    // Si es una sesión de asesoría, cargar los detalles completos
    if (content.content_type === 'advisory_session') {
      setContentLoading(true);
      
      // Ejecutar la función de depuración para verificar las sesiones de asesoría
      await debugAdvisorySessions();
      
      try {
        // Buscar el ID correcto en content_registry
        const { data: registryData, error: registryError } = await supabase
          .from('content_registry')
          .select('*')
          .eq('content_type', 'advisory_session');
          
        if (registryError) {
          console.error('Error al buscar en content_registry:', registryError);
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        // Encontrar el registro que coincide con la sesión que queremos editar
        const registryItem = registryData.find((item: any) => 
          item.content_id === content.id || 
          item.id === content.id
        );
        
        if (!registryItem) {
          console.warn('No se encontró el registro en content_registry para:', content.id);
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        console.log('Registro encontrado en content_registry:', registryItem);
        
        // Obtener los detalles de la sesión de asesoría
        const { data: sessionData, error: sessionError } = await supabase
          .from('advisory_sessions')
          .select('*')
          .eq('id', registryItem.content_id)
          .single();
          
        if (sessionError) {
          console.error('Error al obtener datos de advisory_sessions:', sessionError);
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        console.log('Datos de la sesión de asesoría:', sessionData);
        
        // Construir el objeto ActivityContent con los datos correctos
        const advisorySessionDetails: ActivityContent = {
          id: registryItem.id,
          title: registryItem.title,
          content: sessionData.description || '',
          content_type: 'advisory_session',
          stage_id: content.stage_id,
          order: content.order || 0,
          created_at: registryItem.created_at || new Date().toISOString(),
          updated_at: registryItem.updated_at || new Date().toISOString(),
          duration: sessionData.duration || 60,
          session_type: sessionData.session_type || 'individual',
        };
        
        console.log('Detalles de la sesión de asesoría construidos:', advisorySessionDetails);
        setEditingContent(advisorySessionDetails);
      } catch (error) {
        console.error('Error al cargar detalles de la sesión de asesoría:', error);
        setEditingContent(content);
      }
      setContentLoading(false);
    } 
    // Si es un contenido de texto, cargar los detalles completos
    else if (content.content_type === 'text') {
      setContentLoading(true);
      
      // Ejecutar la función de depuración para verificar los contenidos de texto
      await debugTextContents();
      
      try {
        // Buscar el ID correcto en content_registry
        const { data: registryData, error: registryError } = await supabase
          .from('content_registry')
          .select('*')
          .eq('content_type', 'text');
          
        if (registryError) {
          console.error('Error al buscar en content_registry:', registryError);
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        // Encontrar el registro que coincide con el texto que queremos editar
        const registryItem = registryData.find((item: any) => 
          item.content_id === content.id || 
          item.id === content.id
        );
        
        if (!registryItem) {
          console.warn('No se encontró el registro en content_registry para:', content.id);
          
          // Si no se encuentra en content_registry, podría ser un contenido antiguo en stage_content
          // En este caso, usamos directamente el contenido que se pasó
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        console.log('Registro encontrado en content_registry:', registryItem);
        
        // Obtener los detalles del texto
        const { data: textData, error: textError } = await supabase
          .from('text_contents')
          .select('*')
          .eq('id', registryItem.content_id)
          .single();
          
        if (textError) {
          console.error('Error al obtener datos de text_contents:', textError);
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        console.log('Datos del texto:', textData);
        
        // Construir el objeto ActivityContent con los datos correctos
        const textDetails: ActivityContent = {
          id: registryItem.id,
          title: registryItem.title || textData.title || 'Sin título',
          content: textData.content || '',
          content_type: 'text',
          stage_id: content.stage_id,
          order: content.order || 0,
          created_at: registryItem.created_at || new Date().toISOString(),
          updated_at: registryItem.updated_at || new Date().toISOString(),
        };
        
        console.log('Detalles del texto construidos:', textDetails);
        setEditingContent(textDetails);
      } catch (error) {
        console.error('Error al cargar detalles del texto:', error);
        setEditingContent(content);
      }
      setContentLoading(false);
    } 
    // Si es un contenido de video, cargar los detalles completos
    else if (content.content_type === 'video') {
      setContentLoading(true);
      
      // Ejecutar la función de depuración para verificar los contenidos de video
      await debugVideoContents();
      
      try {
        // Buscar el ID correcto en content_registry
        const { data: registryData, error: registryError } = await supabase
          .from('content_registry')
          .select('*')
          .eq('content_type', 'video');
          
        if (registryError) {
          console.error('Error al buscar en content_registry:', registryError);
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        // Encontrar el registro que coincide con el video que queremos editar
        const registryItem = registryData.find((item: any) => 
          item.content_id === content.id || 
          item.id === content.id
        );
        
        if (!registryItem) {
          console.warn('No se encontró el registro en content_registry para:', content.id);
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        console.log('Registro encontrado en content_registry:', registryItem);
        
        // Obtener los detalles del video
        const { data: videoData, error: videoError } = await supabase
          .from('video_contents')
          .select('*')
          .eq('id', registryItem.content_id)
          .single();
          
        if (videoError) {
          console.error('Error al obtener datos de video_contents:', videoError);
          setEditingContent(content);
          setContentLoading(false);
          return;
        }
        
        console.log('Datos del video:', videoData);
        
        // Construir el objeto ActivityContent con los datos correctos
        const videoDetails: ActivityContent = {
          id: registryItem.id,
          title: registryItem.title,
          content: videoData.video_url || '',
          content_type: 'video',
          stage_id: content.stage_id,
          order: content.order || 0,
          created_at: registryItem.created_at || new Date().toISOString(),
          updated_at: registryItem.updated_at || new Date().toISOString(),
          url: videoData.video_url || '',
          provider: videoData.source || 'youtube'
        };
        
        console.log('Detalles del video construidos:', videoDetails);
        setEditingContent(videoDetails);
      } catch (error) {
        console.error('Error al cargar detalles del video:', error);
        setEditingContent(content);
      }
      setContentLoading(false);
    } 
    else {
      setEditingContent(content);
    }
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
              onSave={(content, activityData) => handleCreateContent(content, activityData)}
              onCancel={cancelContentForm}
              loading={contentLoading}
              moduleId={selectedProgram}
            />
          )}

          {editingContent && (
            <ContentForm 
              content={editingContent}
              onSave={(content, activityData) => handleUpdateContent(content as ActivityContent, activityData)}
              onCancel={cancelContentForm}
              loading={contentLoading}
              isEditing
              moduleId={selectedProgram}
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
      
      {/* Renderizar el diálogo de confirmación */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDeleteContent}
        onCancel={cancelDeleteContent}
      />
    </div>
  );
};

export default ContentManager;
