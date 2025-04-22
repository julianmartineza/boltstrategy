import React, { useEffect, useState } from 'react';
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
        // Si ya tenemos el contenido en el estado, usarlo
        if (allStagesContent[currentStage.id]) {
          setStageContent(allStagesContent[currentStage.id]);
          return;
        }
        
        // Si no, cargarlo desde la base de datos
        const { data, error } = await supabase
          .from('stage_content')
          .select('*')
          .eq('stage_id', currentStage.id)
          .order('order_num');
          
        if (error) throw error;
        
        const contentData = data || [];
        
        // Actualizar el estado
        setStageContent(contentData);
        setAllStagesContent(prev => ({
          ...prev,
          [currentStage.id]: contentData
        }));
      } catch (error) {
        console.error('Error loading stage content:', error);
        setError('Error al cargar el contenido de la etapa');
      }
    };
    
    fetchStageContent();
  }, [currentStage, allStagesContent]);

  // Cargar contenido de todas las etapas para el esquema
  useEffect(() => {
    if (!currentProgram || !currentProgram.stages || currentProgram.stages.length === 0) return;
    
    const fetchAllStagesContent = async () => {
      try {
        console.log('Cargando contenido de todas las etapas para el esquema...');
        
        // Para cada etapa, cargar su contenido si aún no lo tenemos
        for (const stage of currentProgram.stages) {
          if (allStagesContent[stage.id]) continue;
          
          console.log(`Cargando contenido para la etapa ${stage.id} (${stage.name})...`);
          
          // Primero intentar cargar desde la nueva estructura (content_registry + program_module_contents)
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
            
            // Actualizar el estado con los nuevos contenidos
            setAllStagesContent(prev => {
              const newState = { ...prev };
              newState[stage.id] = formattedContents;
              return newState;
            });
            
            // Si esta es la etapa actual, actualizar también stageContent
            if (currentStage && currentStage.id === stage.id) {
              setStageContent(formattedContents);
            }
            
            continue;  // Pasar a la siguiente etapa
          }
          
          // Si no hay datos en la nueva estructura, intentar con la antigua (stage_content)
          console.log(`No se encontraron contenidos en la nueva estructura para la etapa ${stage.id}, intentando con stage_content...`);
          
          const { data: legacyData, error: legacyError } = await supabase
            .from('stage_content')
            .select('*')
            .eq('stage_id', stage.id)
            .order('order_num');
            
          if (legacyError) {
            console.error('Error al cargar contenidos desde stage_content:', legacyError);
            throw legacyError;
          }
          
          console.log(`Encontrados ${legacyData?.length || 0} contenidos en la estructura antigua para la etapa ${stage.id}`);
          
          // Actualizar el estado con los contenidos antiguos
          setAllStagesContent(prev => {
            const newState = { ...prev };
            newState[stage.id] = legacyData || [];
            return newState;
          });
          
          // Si esta es la etapa actual, actualizar también stageContent
          if (currentStage && currentStage.id === stage.id) {
            setStageContent(legacyData || []);
          }
        }
      } catch (error) {
        console.error('Error loading all stages content:', error);
      }
    };
    
    fetchAllStagesContent();
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
                setCurrentContentIndex(index);
                
                // Marcar el contenido actual como visto
                const contentId = stageContent[index].id;
                setViewedContents(prev => ({
                  ...prev,
                  [contentId]: true
                }));
                
                // Guardar en la base de datos que el usuario ha visto este contenido
                (async () => {
                  if (!user) return;
                  
                  try {
                    // Verificar si ya existe un registro para este contenido
                    const { data: existingData, error: checkError } = await supabase
                      .from('viewed_contents')
                      .select('*')
                      .eq('user_id', user.id)
                      .eq('content_id', contentId)
                      .single();
                    
                    if (checkError && checkError.code !== 'PGRST116') {
                      console.error('Error checking viewed content:', checkError);
                      return;
                    }
                    
                    // Si ya existe, no hacer nada
                    if (existingData) return;
                    
                    // Si no existe, crear un nuevo registro
                    const { error: insertError } = await supabase
                      .from('viewed_contents')
                      .insert({
                        user_id: user.id,
                        content_id: contentId,
                        viewed_at: new Date().toISOString()
                      });
                    
                    if (insertError) {
                      console.error('Error saving viewed content:', insertError);
                    }
                  } catch (error) {
                    console.error('Error in viewed content process:', error);
                  }
                })();
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