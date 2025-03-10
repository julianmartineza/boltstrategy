import React, { useEffect } from 'react';
import { useProgramStore } from '../../../store/programStore';
import StrategyProgress from './StrategyProgress';
import StageContentComponent from './StageContent';
import ProgramOutline from './ProgramOutline';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import { AlertCircle } from 'lucide-react';
// Eliminamos importaciones no utilizadas

// Tipo para los datos de contenido de etapa que vienen de la base de datos
type DBStageContent = Database['public']['Tables']['stage_content']['Row'];

export default function StrategyProgram() {
  const { 
    currentProgram, 
    currentStage,
    loading,
    error,
    loadProgram,
    startStage
  } = useProgramStore();

  const [stageContent, setStageContent] = React.useState<DBStageContent[]>([]);
  const [allStagesContent, setAllStagesContent] = React.useState<Record<string, DBStageContent[]>>({});
  const [loadingContent, setLoadingContent] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [currentContentIndex, setCurrentContentIndex] = React.useState<number>(0);
  const [viewedContents, setViewedContents] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    const initializeProgram = async () => {
      const { data: programs, error } = await supabase
        .from('programs')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading program:', error);
        setLocalError('Failed to load program');
        return;
      }

      if (programs) {
        try {
          await loadProgram(programs.id);
          setLocalError(null);
        } catch (error) {
          console.error('Error initializing program:', error);
          setLocalError('Failed to initialize program');
        }
      }
    };

    initializeProgram();
  }, [loadProgram]);

  // Cargar el contenido de la etapa actual
  useEffect(() => {
    const loadStageContent = async () => {
      if (!currentStage) return;

      setLoadingContent(true);
      try {
        // Si ya tenemos el contenido de esta etapa en caché, usarlo
        if (allStagesContent[currentStage.id]) {
          setStageContent(allStagesContent[currentStage.id]);
          // Resetear el índice de contenido al cambiar de etapa
          setCurrentContentIndex(0);
        } else {
          const { data, error } = await supabase
            .from('stage_content')
            .select('*')
            .eq('stage_id', currentStage.id)
            .order('order_num');

          if (error) throw error;
          setStageContent(data || []);
          
          // Actualizar la caché de contenido
          setAllStagesContent(prev => ({
            ...prev,
            [currentStage.id]: data || []
          }));
          
          // Resetear el índice de contenido al cambiar de etapa
          setCurrentContentIndex(0);
        }
        setLocalError(null);
      } catch (error) {
        console.error('Error loading stage content:', error);
        setLocalError('Failed to load stage content');
      } finally {
        setLoadingContent(false);
      }
    };

    loadStageContent();
  }, [currentStage, allStagesContent]);
  
  // Cargar el contenido de todas las etapas para el ProgramOutline
  useEffect(() => {
    const loadAllStagesContent = async () => {
      if (!currentProgram) return;
      
      try {
        // Para cada etapa, cargar su contenido si aún no lo tenemos
        for (const stage of currentProgram.stages) {
          if (!allStagesContent[stage.id]) {
            const { data, error } = await supabase
              .from('stage_content')
              .select('*')
              .eq('stage_id', stage.id)
              .order('order_num');
              
            if (error) throw error;
            
            // Actualizar la caché de contenido
            setAllStagesContent(prev => ({
              ...prev,
              [stage.id]: data || []
            }));
          }
        }
        
        // Cargar los contenidos vistos desde la base de datos
        loadViewedContents();
      } catch (error) {
        console.error('Error loading all stages content:', error);
      }
    };
    
    // Función para cargar los contenidos vistos
    const loadViewedContents = async () => {
      try {
        const { data, error } = await supabase
          .from('viewed_contents')
          .select('content_id');
          
        if (error) throw error;
        
        // Crear un objeto con los IDs de contenidos vistos
        const viewedMap: Record<string, boolean> = {};
        if (data) {
          data.forEach(item => {
            viewedMap[item.content_id] = true;
          });
        }
        
        setViewedContents(viewedMap);
      } catch (error) {
        console.error('Error loading viewed contents:', error);
      }
    };
    
    loadAllStagesContent();
  }, [currentProgram]);



  if (loading || loadingContent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  const displayError = error || localError;
  if (displayError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg flex items-center space-x-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <p className="text-red-700">{displayError}</p>
      </div>
    );
  }

  if (!currentProgram) {
    return (
      <div className="p-4">
        No program found. Please try refreshing the page.
      </div>
    );
  }

  // Calculate current phase
  const currentPhase = currentStage 
    ? Math.floor(currentProgram.stages.findIndex(s => s.id === currentStage.id) / 4)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Progress Overview */}
      <StrategyProgress 
        stages={currentProgram.stages}
        currentPhase={currentPhase}
      />

      {/* Main Content Area con ProgramOutline siempre visible */}
      <div className="mt-8 flex">
        {/* Contenido principal - ocupa el espacio disponible (flex-grow) */}
        <div className="flex-grow pr-6" style={{ width: '75%' }}>
          {currentStage ? (
            <>
              {/* Stage Content */}
              <StageContentComponent 
                content={stageContent} 
                currentIndex={currentContentIndex}
                onChangeContent={(index: number) => {
                  setCurrentContentIndex(index);
                  
                  // Marcar el contenido como visto
                  if (stageContent[index]) {
                    const contentId = stageContent[index].id;
                    
                    // Actualizar el estado local
                    setViewedContents(prev => ({
                      ...prev,
                      [contentId]: true
                    }));
                    
                    // Guardar en la base de datos que el contenido ha sido visto
                    supabase
                      .from('viewed_contents')
                      .upsert({ content_id: contentId, viewed_at: new Date().toISOString() })
                      .then(({ error }) => {
                        if (error) {
                          console.error('Error al guardar contenido visto:', error);
                        }
                      });
                  }
                }}
                viewedContents={viewedContents}
              />


            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center">
              <p className="text-gray-500">Selecciona una etapa para ver su contenido</p>
            </div>
          )}
        </div>
        
        {/* Program Outline - fijo al extremo derecho con altura ajustada a la navegación inferior */}
        <div style={{ width: '25%', minWidth: '250px', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
          <ProgramOutline 
            program={currentProgram} 
            currentStage={currentStage} 
            currentContentId={stageContent[currentContentIndex]?.id}
            viewedContents={viewedContents}
            onSelectStage={(stageId) => {
              // Implementar la navegación entre etapas
              const stage = currentProgram.stages.find(s => s.id === stageId);
              if (stage) {
                // Actualizar el estado en el store
                startStage(stageId);
              }
            }}
            onSelectContent={(stageId: string, contentId: string) => {
              // Implementar la navegación entre contenidos
              if (currentStage?.id === stageId && allStagesContent[stageId]) {
                const contentIndex = allStagesContent[stageId].findIndex(content => content.id === contentId);
                if (contentIndex >= 0) {
                  setCurrentContentIndex(contentIndex);
                  
                  // Marcar el contenido como visto
                  setViewedContents(prev => ({
                    ...prev,
                    [contentId]: true
                  }));
                  
                  // Guardar en la base de datos
                  supabase
                    .from('viewed_contents')
                    .upsert({ content_id: contentId, viewed_at: new Date().toISOString() })
                    .then(({ error }) => {
                      if (error) {
                        console.error('Error al guardar contenido visto:', error);
                      }
                    });
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}