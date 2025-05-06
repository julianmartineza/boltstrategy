import React, { useEffect, useState, useRef } from 'react';
import { useProgramStore } from '../../../store/programStore';
import StrategyProgress from './StrategyProgress';
import { StageContent } from './StageContent';
import ProgramOutline from './ProgramOutline';
import { supabase } from '../../../lib/supabase';
import { AlertCircle, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useParams } from 'react-router-dom';

// Tipo para los datos de contenido de etapa que vienen de la base de datos
type DBStageContent = {
  id: string;
  stage_id: string;
  content_type: 'text' | 'video' | 'activity' | 'advisory_session';
  title: string;
  content: string;
  order_num: number;
  created_at: string;
  metadata: any;
  activity_data: any | null;
  content_metadata?: any;
};

const StrategyProgram: React.FC = () => {
  const { 
    loadProgram, 
    currentProgram, 
    currentStage,
    startStage
  } = useProgramStore();
  const { user } = useAuthStore();
  const { programId } = useParams<{ programId?: string }>();

  const [stageContent, setStageContent] = useState<DBStageContent[]>([]);
  const [allStagesContent, setAllStagesContent] = useState<Record<string, DBStageContent[]>>({});
  const [viewedContents, setViewedContents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentContentIndex, setCurrentContentIndex] = useState<number>(0);
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(0);
  const [showOutline, setShowOutline] = useState(false);

  // Ref para controlar si ya se ha cargado el contenido
  const contentLoadedRef = useRef<Record<string, boolean>>({});
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    const initializeProgram = async () => {
      try {
        setLoading(true);
        let targetProgramId = programId;
        
        // Si no hay un ID de programa en la URL, obtener el programa activo por defecto
        if (!targetProgramId) {
          const { data: programs, error } = await supabase
            .from('programs')
            .select('*')
            .eq('status', 'active')
            .limit(1);

          if (error) {
            console.error('Error loading default program:', error);
            setError('Error al cargar el programa: ' + error.message);
            setLoading(false);
            return;
          }

          if (programs && programs.length > 0) {
            targetProgramId = programs[0].id;
          } else {
            setError('No hay programas activos disponibles.');
            setLoading(false);
            return;
          }
        }
        
        // Cargar el programa específico
        if (targetProgramId) {
          await loadProgram(targetProgramId);
          setError(null);
        } else {
          setError('No se pudo determinar el programa a cargar.');
        }
      } catch (error) {
        console.error('Error initializing program:', error);
        setError('Error al inicializar el programa.');
      } finally {
        setLoading(false);
      }
    };

    initializeProgram();
  }, [programId, loadProgram]);

  // Cargar contenido de la etapa actual cuando cambia
  useEffect(() => {
    if (!currentStage) return;
    
    const fetchStageContent = async () => {
      try {
        console.log(`Intentando cargar contenido para la etapa ${currentStage.id} (${currentStage.name})...`);
        
        // Si ya tenemos el contenido en el estado, usarlo
        if (allStagesContent[currentStage.id] && allStagesContent[currentStage.id].length > 0) {
          console.log(`Usando contenido en caché para la etapa ${currentStage.id}, ${allStagesContent[currentStage.id].length} elementos`);
          setStageContent(allStagesContent[currentStage.id]);
          
          // Asegurarse de que el índice de contenido actual es válido
          if (currentContentIndex >= allStagesContent[currentStage.id].length) {
            setCurrentContentIndex(0);
          }
          return;
        }
        
        // Cargar contenido desde la nueva estructura (content_registry + program_module_contents)
        console.log(`Buscando contenidos en la nueva estructura para la etapa ${currentStage.id}...`);
        const { data: moduleContents, error: moduleError } = await supabase
          .from('program_module_contents')
          .select(`
            content_registry_id,
            position,
            content_registry (
              id,
              title,
              content_type,
              content_table,
              content_id
            )
          `)
          .eq('program_module_id', currentStage.id)
          .order('position');
          
        if (moduleError) {
          console.error('Error al cargar contenidos desde program_module_contents:', moduleError);
          throw moduleError;
        }
        
        if (moduleContents && moduleContents.length > 0) {
          console.log(`Encontrados ${moduleContents.length} contenidos en la nueva estructura para la etapa ${currentStage.id}`);
          
          // Transformar los datos al formato esperado por el componente
          const formattedContents = moduleContents.map(item => {
            // Asegurarnos de que content_registry existe y tiene las propiedades necesarias
            if (!item.content_registry) {
              console.error('Elemento sin content_registry:', item);
              return null;
            }
            
            // Acceder a las propiedades de content_registry de forma segura
            const registry = item.content_registry as unknown as {
              id: string;
              title: string;
              content_type: string;
              content_table: string;
              content_id: string;
            };
            
            return {
              id: registry.id,
              title: registry.title || 'Sin título',
              content_type: (registry.content_type || 'text') as 'text' | 'video' | 'activity' | 'advisory_session',
              stage_id: currentStage.id,
              order_num: item.position,
              content: '',  // Cargaremos el contenido específico a continuación
              created_at: new Date().toISOString(), // Valor predeterminado para cumplir con el tipo
              metadata: {}, // Valor predeterminado para cumplir con el tipo
              activity_data: null, // Valor predeterminado para cumplir con el tipo
              content_metadata: {
                content_registry_id: registry.id,
                content_specific_id: registry.content_id
              }
            };
          }).filter(Boolean) as DBStageContent[];
          
          // Cargar el contenido específico para cada elemento
          for (const content of formattedContents) {
            const registry = moduleContents.find(m => m.content_registry?.id === content.id)?.content_registry as any;
            if (!registry) continue;
            
            try {
              // Cargar el contenido según el tipo
              if (registry.content_type === 'text') {
                console.log(`Cargando contenido de texto para ${registry.content_id}...`);
                try {
                  // Usar un enfoque diferente para la consulta
                  const { data, error } = await supabase
                    .from('text_contents')
                    .select('*')
                    .filter('id', 'eq', registry.content_id)
                    .limit(1);
                  
                  if (error) {
                    console.error(`Error al cargar texto ${registry.content_id}:`, error);
                  } else if (data && data.length > 0) {
                    const textData = data[0];
                    console.log(`Texto cargado para ${registry.content_id}`);
                    content.content = textData.content || '';
                  } else {
                    console.log(`No se encontró el texto con ID ${registry.content_id}`);
                  }
                } catch (textError) {
                  console.error(`Excepción al cargar texto ${registry.content_id}:`, textError);
                }
              } else if (registry.content_type === 'video') {
                console.log(`Cargando contenido de video para ${registry.content_id}...`);
                try {
                  // Usar un enfoque diferente para la consulta
                  const { data, error } = await supabase
                    .from('video_contents')
                    .select('*')
                    .filter('id', 'eq', registry.content_id)
                    .limit(1);
                  
                  if (error) {
                    console.error(`Error al cargar video ${registry.content_id}:`, error);
                  } else if (data && data.length > 0) {
                    const videoData = data[0];
                    console.log(`Video cargado:`, videoData);
                    
                    // Asegurarnos de que el contenido sea la URL del video
                    content.content = videoData.video_url || '';
                    
                    // Preservar la estructura de metadata que espera el componente
                    content.metadata = { 
                      description: videoData.description || '',
                      poster_url: videoData.thumbnail_url || ''
                    };
                    
                    console.log('Contenido de video actualizado:', {
                      content: content.content,
                      metadata: content.metadata
                    });
                  } else {
                    console.log(`No se encontró el video con ID ${registry.content_id}`);
                  }
                } catch (videoError) {
                  console.error(`Excepción al cargar video ${registry.content_id}:`, videoError);
                }
              } else if (registry.content_type === 'advisory_session') {
                console.log(`Cargando contenido de asesoría para ${registry.content_id}...`);
                try {
                  // Usar un enfoque diferente para la consulta
                  const { data, error } = await supabase
                    .from('advisory_sessions')
                    .select('*')
                    .filter('id', 'eq', registry.content_id)
                    .limit(1);
                  
                  if (error) {
                    console.error(`Error al cargar asesoría ${registry.content_id}:`, error);
                  } else if (data && data.length > 0) {
                    const advisoryData = data[0];
                    console.log(`Asesoría cargada:`, advisoryData);
                    content.content = advisoryData.description || '';
                    content.metadata = { duration: advisoryData.duration || 30 };
                  } else {
                    console.log(`No se encontró la asesoría con ID ${registry.content_id}`);
                  }
                } catch (advisoryError) {
                  console.error(`Excepción al cargar asesoría ${registry.content_id}:`, advisoryError);
                }
              } else if (registry.content_type === 'activity') {
                console.log(`Cargando contenido de actividad para ${registry.content_id}...`);
                try {
                  // Cargar datos de la actividad
                  const { data, error } = await supabase
                    .from('activity_contents')
                    .select('*')
                    .filter('id', 'eq', registry.content_id)
                    .limit(1);
                  
                  if (error) {
                    console.error(`Error al cargar actividad ${registry.content_id}:`, error);
                  } else if (data && data.length > 0) {
                    const activityData = data[0];
                    console.log(`Actividad cargada:`, activityData);
                    
                    // Asignar contenido y datos de actividad
                    content.content = activityData.description || '';
                    
                    // Estructura completa requerida por el componente Chat
                    content.activity_data = {
                      prompt: activityData.prompt || '',
                      system_instructions: activityData.system_instructions || '',
                      initial_message: activityData.initial_message || '',
                      max_exchanges: activityData.max_exchanges || 5,
                      type: activityData.type || 'chat',
                      description: activityData.description || '',
                      prompt_template: activityData.prompt_template || '',
                      required_steps: activityData.required_steps || [],
                      completion_criteria: {
                        min_responses: activityData.min_responses || 3,
                        required_topics: activityData.required_topics || []
                      }
                    };
                    
                    console.log('Contenido de actividad actualizado:', {
                      content: content.content,
                      activity_data: content.activity_data
                    });
                  } else {
                    console.log(`No se encontró la actividad con ID ${registry.content_id}`);
                    
                    // Crear datos de actividad por defecto para evitar errores
                    content.activity_data = {
                      prompt: "Actividad no encontrada. Por favor, contacta al administrador.",
                      system_instructions: "",
                      initial_message: "No se pudo cargar esta actividad. Por favor, intenta más tarde.",
                      max_exchanges: 1
                    };
                  }
                } catch (activityError) {
                  console.error(`Excepción al cargar actividad ${registry.content_id}:`, activityError);
                }
              }
            } catch (error) {
              console.error(`Error al cargar contenido específico para ${content.id}:`, error);
            }
          }
          
          console.log('Contenidos formateados:', formattedContents);
          
          // Actualizar el estado
          setStageContent(formattedContents);
          setAllStagesContent(prev => ({
            ...prev,
            [currentStage.id]: formattedContents
          }));
          
          // Agregar logs detallados para depuración
          console.log('========== DATOS DE CONTENIDO ==========');
          console.log('Contenidos formateados completos:', JSON.stringify(formattedContents, null, 2));
          console.log('Primer contenido:', formattedContents[0]);
          if (formattedContents[0]?.content_type === 'video') {
            console.log('Datos de video:', {
              content: formattedContents[0].content,
              metadata: formattedContents[0].metadata
            });
          } else if (formattedContents[0]?.content_type === 'activity') {
            console.log('Datos de actividad:', {
              content: formattedContents[0].content,
              activity_data: formattedContents[0].activity_data
            });
          }
          console.log('========================================');
          
          // Asegurarse de que el índice de contenido actual es válido
          if (currentContentIndex >= formattedContents.length) {
            setCurrentContentIndex(0);
          }
        } else {
          // Si no hay contenidos, dejar el estado vacío
          setStageContent([]);
          setAllStagesContent(prev => ({
            ...prev,
            [currentStage.id]: []
          }));
          if (currentContentIndex !== 0) setCurrentContentIndex(0);
        }
      } catch (error) {
        console.error('Error loading stage content:', error);
        setError('Error al cargar el contenido de la etapa');
      }
    };
    
    // Verificar si ya se ha cargado el contenido para esta etapa
    if (!contentLoadedRef.current[currentStage.id]) {
      fetchStageContent();
      contentLoadedRef.current[currentStage.id] = true;
    }
  }, [currentStage, allStagesContent]);

  // Cargar contenido de todas las etapas para el esquema
  useEffect(() => {
    if (!currentProgram || !currentProgram.stages || currentProgram.stages.length === 0) return;
    
    const fetchAllStagesContent = async () => {
      try {
        console.log('Cargando contenido de todas las etapas para el esquema...');
        
        // Crear una copia local para acumular todos los resultados
        const newStagesContent: Record<string, DBStageContent[]> = {};
        
        // Para cada etapa, cargar su contenido
        for (const stage of currentProgram.stages) {
          // Verificar si ya tenemos el contenido en el estado
          if (allStagesContent[stage.id] && allStagesContent[stage.id].length > 0) {
            console.log(`Ya tenemos el contenido para la etapa ${stage.id} (${stage.name}), omitiendo...`);
            newStagesContent[stage.id] = allStagesContent[stage.id];
            continue;
          }
          
          console.log(`Cargando contenido para la etapa ${stage.id} (${stage.name})...`);
          
          // Cargar contenido desde la nueva estructura (content_registry + program_module_contents)
          const { data: moduleContents, error: moduleError } = await supabase
            .from('program_module_contents')
            .select(`
              content_registry_id,
              position,
              content_registry (
                id,
                title,
                content_type,
                content_table,
                content_id
              )
            `)
            .eq('program_module_id', stage.id)
            .order('position');
            
          if (moduleError) {
            console.error('Error al cargar contenidos desde program_module_contents:', moduleError);
            throw moduleError;
          }
          
          if (moduleContents && moduleContents.length > 0) {
            console.log(`Encontrados ${moduleContents.length} contenidos en la nueva estructura para la etapa ${stage.id}`);
            
            // Transformar los datos al formato esperado por el componente
            const formattedContents = moduleContents.map(item => {
              // Asegurarnos de que content_registry existe y tiene las propiedades necesarias
              if (!item.content_registry) {
                console.error('Elemento sin content_registry:', item);
                return null;
              }
              
              // Acceder a las propiedades de content_registry de forma segura
              const registry = item.content_registry as unknown as {
                id: string;
                title: string;
                content_type: string;
                content_table: string;
                content_id: string;
              };
              
              return {
                id: registry.id,
                title: registry.title || 'Sin título',
                content_type: (registry.content_type || 'text') as 'text' | 'video' | 'activity' | 'advisory_session',
                stage_id: stage.id,
                order_num: item.position,
                content: '',  // No necesitamos el contenido para el esquema
                created_at: new Date().toISOString(), // Valor predeterminado para cumplir con el tipo
                metadata: {}, // Valor predeterminado para cumplir con el tipo
                activity_data: null, // Valor predeterminado para cumplir con el tipo
                content_metadata: {
                  content_registry_id: registry.id,
                  content_specific_id: registry.content_id
                }
              };
            }).filter(Boolean) as DBStageContent[]; // Filtrar elementos nulos y asegurar el tipo
            
            // Guardar en nuestra copia local
            newStagesContent[stage.id] = formattedContents;
            
            // Si esta es la etapa actual, actualizar también stageContent
            if (currentStage && currentStage.id === stage.id) {
              setStageContent(formattedContents);
            }
            
            continue;  // Pasar a la siguiente etapa
          }
          // Si no hay contenidos, dejar el estado vacío
          newStagesContent[stage.id] = [];
          if (currentStage && currentStage.id === stage.id) {
            setStageContent([]);
          }
        }
        
        // Actualizar el estado una sola vez con todos los resultados
        setAllStagesContent(prev => ({
          ...prev,
          ...newStagesContent
        }));
      } catch (error) {
        console.error('Error loading all stages content:', error);
      }
    };
    
    // Verificar si ya se ha realizado la carga inicial
    if (!initialLoadDoneRef.current) {
      fetchAllStagesContent();
      initialLoadDoneRef.current = true;
    }
  }, [currentProgram, currentStage]);

  // Actualizar el índice de la etapa actual cuando cambia
  useEffect(() => {
    if (!currentProgram || !currentStage) return;
    
    const index = currentProgram.stages.findIndex(s => s.id === currentStage.id);
    if (index !== -1) {
      setCurrentStageIndex(index);
    }
  }, [currentStage, currentProgram]);

  // Escuchar el evento personalizado para seleccionar contenido específico
  useEffect(() => {
    const handleSelectContent = (event: CustomEvent<{stageId: string, contentIndex: number}>) => {
      const { stageId, contentIndex } = event.detail;
      
      // Verificar que estamos en la etapa correcta
      if (currentStage && currentStage.id === stageId) {
        // Establecer el índice de contenido
        setCurrentContentIndex(contentIndex);
      }
    };

    // Añadir el event listener
    window.addEventListener('select-content', handleSelectContent as EventListener);
    
    // Limpiar el event listener al desmontar
    return () => {
      window.removeEventListener('select-content', handleSelectContent as EventListener);
    };
  }, [currentStage]);

  // Función para guardar el contenido visto
  const saveViewedContent = async (contentId: string) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!user) {
        console.log('No hay usuario autenticado, no se puede guardar el contenido visto');
        return;
      }
      
      // Verificar si el contenido existe en content_registry
      const { data: contentExists, error: contentError } = await supabase
        .from('content_registry')
        .select('id')
        .eq('id', contentId)
        .maybeSingle();
      
      if (contentError) {
        console.error('Error al verificar si el contenido existe:', contentError);
      }
      
      // Si el contenido no existe en content_registry, solo actualizar el estado local
      if (!contentExists) {
        console.log('El contenido no existe en content_registry, solo se actualizará el estado local:', contentId);
        setViewedContents(prev => ({
          ...prev,
          [contentId]: true
        }));
        return;
      }
      
      // Verificar si ya existe un registro para este contenido
      const { data: existingView, error: viewError } = await supabase
        .from('viewed_contents')
        .select('*')
        .eq('user_id', user.id)
        .eq('content_id', contentId)
        .maybeSingle();
      
      if (viewError && viewError.code !== 'PGRST116') {
        console.error('Error al verificar si el contenido ya ha sido visto:', viewError);
        return;
      }
      
      // Si ya existe, no hacer nada
      if (existingView) {
        console.log('El contenido ya ha sido marcado como visto anteriormente:', contentId);
        return;
      }
      
      // Si no existe, crear un nuevo registro
      const { error: insertError } = await supabase
        .from('viewed_contents')
        .insert({
          user_id: user.id,
          content_id: contentId,
          viewed_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error al guardar contenido visto:', insertError);
        
        // Actualizar solo el estado local en caso de error
        console.log('No se pudo guardar en la base de datos, pero se actualizará el estado local');
        setViewedContents(prev => ({
          ...prev,
          [contentId]: true
        }));
      } else {
        console.log('Contenido marcado como visto correctamente:', contentId);
        // Actualizar el estado local
        setViewedContents(prev => ({
          ...prev,
          [contentId]: true
        }));
      }
    } catch (error) {
      console.error('Error en el proceso de contenido visto:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-24 w-24 sm:h-32 sm:w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!currentProgram) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Programa no disponible</h2>
        <p className="text-gray-600">
          {error || "No se encontró ningún programa activo. Por favor, intenta recargar la página o contacta al administrador."}
        </p>
      </div>
    );
  }

  // Calculate current phase
  const currentPhase = currentStage 
    ? Math.floor(currentProgram.stages.findIndex(s => s.id === currentStage.id) / 4)
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Botón de menú móvil para mostrar/ocultar el esquema */}
      <div className="md:hidden px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <button 
          onClick={() => setShowOutline(!showOutline)}
          className="flex items-center text-sm font-medium text-blue-600"
        >
          {showOutline ? (
            <>
              <X className="h-4 w-4 mr-1" />
              <span>Cerrar esquema</span>
            </>
          ) : (
            <>
              <Menu className="h-4 w-4 mr-1" />
              <span>Ver esquema del programa</span>
            </>
          )}
        </button>
        
        {currentStage && (
          <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]">
            {currentStage.name}
          </span>
        )}
      </div>

      {/* Contenedor principal con flexbox */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Content Area - Siempre visible */}
        <div className="flex-1 p-2 sm:p-4 overflow-y-auto z-10">
          {currentStage && stageContent.length > 0 ? (
            <StageContent 
              content={stageContent}
              currentIndex={currentContentIndex}
              onChangeContent={(index) => {
                if (!user) return;
                
                // Usar la función saveViewedContent
                saveViewedContent(stageContent[index].id);
                
                setCurrentContentIndex(index);
              }}
              viewedContents={viewedContents}
              hasNextStage={currentStageIndex < currentProgram.stages.length - 1}
              hasPreviousStage={currentStageIndex > 0}
              onNavigateToNextStage={() => {
                const nextStageIndex = currentStageIndex + 1;
                if (nextStageIndex < currentProgram.stages.length) {
                  // Guardar el ID de la siguiente etapa
                  const nextStageId = currentProgram.stages[nextStageIndex].id;
                  
                  // Actualizar la etapa actual
                  startStage(nextStageId);
                  
                  // Resetear el índice de contenido
                  setCurrentContentIndex(0);
                  
                  // Registrar en consola para depuración
                  console.log(`Navegando a la siguiente etapa: ${nextStageId}, índice: ${nextStageIndex}`);
                }
              }}
              onNavigateToPreviousStage={() => {
                const prevStageIndex = currentStageIndex - 1;
                if (prevStageIndex >= 0) {
                  // Guardar el ID de la etapa anterior
                  const prevStageId = currentProgram.stages[prevStageIndex].id;
                  
                  // Actualizar la etapa actual
                  startStage(prevStageId);
                  
                  // Si hay contenido en la etapa anterior, seleccionar el último
                  const prevStageContent = allStagesContent[prevStageId] || [];
                  if (prevStageContent.length > 0) {
                    setCurrentContentIndex(prevStageContent.length - 1);
                  } else {
                    setCurrentContentIndex(0);
                  }
                  
                  // Registrar en consola para depuración
                  console.log(`Navegando a la etapa anterior: ${prevStageId}, índice: ${prevStageIndex}`);
                }
              }}
            />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="text-red-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-gray-500 text-center">Selecciona una etapa del programa para comenzar.</p>
            </div>
          )}
        </div>

        {/* Program Outline - Adaptado para móvil y desktop */}
        <div 
          className={`bg-white border-l border-gray-200 overflow-hidden
                     md:w-[315px] md:flex md:flex-col md:flex-shrink-0 md:h-full md:static md:z-0
                     transition-all duration-300 ease-in-out
                     ${showOutline 
                       ? 'fixed inset-y-0 right-0 w-3/4 max-w-xs z-20' 
                       : 'fixed -right-full w-0 md:static md:w-[315px] md:right-0'}`}
        >
          {/* Barra de progreso compacta en la parte superior del esquema */}
          {currentProgram && (
            <StrategyProgress 
              stages={currentProgram.stages}
              currentPhase={currentPhase}
              isVertical={true}
            />
          )}
          
          <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Esquema del Programa</h3>
            <button onClick={() => setShowOutline(false)}>
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <ProgramOutline 
              stages={currentProgram.stages}
              currentStageId={currentStage?.id}
              onSelectStage={(stageId) => {
                startStage(stageId);
                setCurrentContentIndex(0);
                if (window.innerWidth < 768) {
                  setShowOutline(false);
                }
              }}
              viewedContents={viewedContents}
              allStagesContent={allStagesContent}
            />
          </div>
        </div>

        {/* Overlay para móvil cuando el outline está abierto - ahora detrás del contenido principal */}
        {showOutline && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden" 
            onClick={() => setShowOutline(false)}
          />
        )}
      </div>
    </div>
  );
}

export default StrategyProgram;