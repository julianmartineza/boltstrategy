import React, { useEffect, useState } from 'react';
import { useProgramStore } from '../../../store/programStore';
import StrategyProgress from './StrategyProgress';
import StageContentComponent from './StageContent';
import ProgramOutline from './ProgramOutline';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import { AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';

// Tipo para los datos de contenido de etapa que vienen de la base de datos
type DBStageContent = Database['public']['Tables']['stage_content']['Row'];

const StrategyProgram: React.FC = () => {
  const { 
    currentProgram, 
    currentStage,
    loadProgram,
    startStage
  } = useProgramStore();
  const { user } = useAuthStore();

  const [stageContent, setStageContent] = useState<DBStageContent[]>([]);
  const [allStagesContent, setAllStagesContent] = useState<Record<string, DBStageContent[]>>({});
  const [viewedContents, setViewedContents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentContentIndex, setCurrentContentIndex] = useState<number>(0);

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
        console.warn('No active programs found');
        setError('No hay programas activos disponibles. Por favor, contacta al administrador.');
      }
      setLoading(false);
    };

    initializeProgram();
  }, [loadProgram]);

  useEffect(() => {
    const loadStageContent = async () => {
      if (!currentStage) return;

      setLoading(true);
      try {
        // Si ya tenemos el contenido de esta etapa en caché, usarlo
        if (allStagesContent[currentStage.id]) {
          setStageContent(allStagesContent[currentStage.id]);
        } else {
          // Si no, cargarlo desde la base de datos
          const { data, error } = await supabase
            .from('stage_content')
            .select('*')
            .eq('stage_id', currentStage.id)
            .order('order_num', { ascending: true });

          if (error) throw error;

          if (data) {
            // Actualizar el estado local y la caché
            setStageContent(data);
            setAllStagesContent(prev => ({
              ...prev,
              [currentStage.id]: data
            }));
          }
          
          // Resetear el índice de contenido al cambiar de etapa
          setCurrentContentIndex(0);
        }
        setError(null);
      } catch (error) {
        console.error('Error loading stage content:', error);
        setError('Failed to load stage content');
      } finally {
        setLoading(false);
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
              .order('order_num', { ascending: true });

            if (error) throw error;

            if (data) {
              setAllStagesContent(prev => ({
                ...prev,
                [stage.id]: data
              }));
            }
          }
        }
      } catch (error) {
        console.error('Error loading all stages content:', error);
      }
    };
    
    loadAllStagesContent();
  }, [currentProgram, allStagesContent]);

  // Cargar el registro de contenidos vistos
  useEffect(() => {
    const loadViewedContents = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('viewed_contents')
          .select('content_id')
          .eq('user_id', user.id);

        if (error) throw error;

        if (data) {
          const viewedMap: Record<string, boolean> = {};
          data.forEach(item => {
            viewedMap[item.content_id] = true;
          });
          setViewedContents(viewedMap);
        }
      } catch (error) {
        console.error('Error loading viewed contents:', error);
      }
    };
    
    loadViewedContents();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg flex items-center space-x-3">
        <AlertCircle className="text-red-500" />
        <p className="text-red-700">{error}</p>
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
    <div className="flex flex-col h-full">
      {/* Progress Overview */}
      <StrategyProgress 
        stages={currentProgram.stages}
        currentPhase={currentPhase}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 p-4 overflow-y-auto">
          {currentStage && stageContent.length > 0 ? (
            <StageContentComponent 
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
                
                // Guardar en la base de datos que el contenido ha sido visto
                if (user) {
                  try {
                    // Usar una función async inmediatamente invocada
                    (async () => {
                      try {
                        // Primero verificamos si ya existe el registro
                        const { data: existingView } = await supabase
                          .from('viewed_contents')
                          .select('*')
                          .eq('content_id', contentId)
                          .eq('user_id', user.id)
                          .maybeSingle();
                        
                        if (existingView) {
                          // Si existe, actualizamos solo la fecha
                          await supabase
                            .from('viewed_contents')
                            .update({ viewed_at: new Date().toISOString() })
                            .eq('content_id', contentId)
                            .eq('user_id', user.id);
                        } else {
                          // Si no existe, lo insertamos
                          await supabase
                            .from('viewed_contents')
                            .insert({ 
                              content_id: contentId, 
                              user_id: user.id, 
                              viewed_at: new Date().toISOString() 
                            });
                        }
                      } catch (innerErr) {
                        console.error('Error al procesar el contenido visto:', innerErr);
                      }
                    })();
                  } catch (err) {
                    console.error('Error de conexión al guardar contenido visto:', err);
                  }
                }
              }}
              viewedContents={viewedContents}
            />
          ) : (
            <div className="p-4">
              Select a stage to view content.
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
            onSelectContent={(stageId, contentId) => {
              // Implementar la navegación directa a un contenido específico
              if (stageId === currentStage?.id) {
                // Si es la etapa actual, solo cambiar el índice
                const index = stageContent.findIndex(c => c.id === contentId);
                if (index !== -1) {
                  setCurrentContentIndex(index);
                  
                  // Marcar como visto
                  setViewedContents(prev => ({
                    ...prev,
                    [contentId]: true
                  }));
                  
                  // Guardar en la base de datos
                  if (user) {
                    try {
                      // Usar una función async inmediatamente invocada
                      (async () => {
                        try {
                          // Primero verificamos si ya existe el registro
                          const { data: existingView } = await supabase
                            .from('viewed_contents')
                            .select('*')
                            .eq('content_id', contentId)
                            .eq('user_id', user.id)
                            .maybeSingle();
                          
                          if (existingView) {
                            // Si existe, actualizamos solo la fecha
                            await supabase
                              .from('viewed_contents')
                              .update({ viewed_at: new Date().toISOString() })
                              .eq('content_id', contentId)
                              .eq('user_id', user.id);
                          } else {
                            // Si no existe, lo insertamos
                            await supabase
                              .from('viewed_contents')
                              .insert({ 
                                content_id: contentId, 
                                user_id: user.id, 
                                viewed_at: new Date().toISOString() 
                              });
                          }
                        } catch (innerErr) {
                          console.error('Error al procesar el contenido visto:', innerErr);
                        }
                      })();
                    } catch (err) {
                      console.error('Error de conexión al guardar contenido visto:', err);
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StrategyProgram;