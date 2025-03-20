import React, { useEffect, useState } from 'react';
import { useProgramStore } from '../../../store/programStore';
import StrategyProgress from './StrategyProgress';
import { StageContent } from './StageContent';
import ProgramOutline from './ProgramOutline';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import { AlertCircle, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

// Tipo para los datos de contenido de etapa que vienen de la base de datos
type DBStageContent = Database['public']['Tables']['stage_content']['Row'];

const StrategyProgram: React.FC = () => {
  const { 
    loadProgram, 
    currentProgram, 
    currentStage,
    startStage
  } = useProgramStore();
  const { user } = useAuthStore();

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
      // Obtener el programa activo
      const { data: programs, error } = await supabase
        .from('programs')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error loading program:', error);
        setError('Error al cargar el programa: ' + error.message);
        setLoading(false);
        return;
      }

      if (programs && programs.length > 0) {
        try {
          await loadProgram(programs[0].id);
          setError(null);
        } catch (error) {
          console.error('Error initializing program:', error);
          setError('Error al inicializar el programa');
        }
      } else {
        setError('No se encontró ningún programa activo');
      }
      
      setLoading(false);
    };

    initializeProgram();
  }, [loadProgram]);

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
        // Para cada etapa, cargar su contenido si aún no lo tenemos
        for (const stage of currentProgram.stages) {
          if (allStagesContent[stage.id]) continue;
          
          const { data, error } = await supabase
            .from('stage_content')
            .select('*')
            .eq('stage_id', stage.id)
            .order('order_num');
            
          if (error) throw error;
          
          setAllStagesContent(prev => ({
            ...prev,
            [stage.id]: data || []
          }));
        }
      } catch (error) {
        console.error('Error loading all stages content:', error);
      }
    };
    
    fetchAllStagesContent();
  }, [currentProgram, allStagesContent]);

  // Actualizar el índice de la etapa actual cuando cambia
  useEffect(() => {
    if (!currentProgram || !currentStage) return;
    
    const index = currentProgram.stages.findIndex(s => s.id === currentStage.id);
    if (index !== -1) {
      setCurrentStageIndex(index);
    }
  }, [currentStage, currentProgram]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowOutline(false);
      } else {
        setShowOutline(true);
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
                  startStage(currentProgram.stages[nextStageIndex].id);
                  setCurrentContentIndex(0);
                }
              }}
              onNavigateToPreviousStage={() => {
                const prevStageIndex = currentStageIndex - 1;
                if (prevStageIndex >= 0) {
                  startStage(currentProgram.stages[prevStageIndex].id);
                  setCurrentContentIndex(0);
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
          ) : loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
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