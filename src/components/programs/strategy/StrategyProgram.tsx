import React, { useEffect } from 'react';
import { useProgramStore } from '../../../store/programStore';
import StrategyProgress from './StrategyProgress';
import ActivityView from './ActivityView';
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
    currentActivity,
    loading,
    error,
    loadProgram,
    // Eliminamos startStage ya que no se utiliza
    startActivity 
  } = useProgramStore();

  const [stageContent, setStageContent] = React.useState<DBStageContent[]>([]);
  const [allStagesContent, setAllStagesContent] = React.useState<Record<string, DBStageContent[]>>({});
  const [loadingContent, setLoadingContent] = React.useState(false);
  const [startingActivity, setStartingActivity] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

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
      } catch (error) {
        console.error('Error loading all stages content:', error);
      }
    };
    
    loadAllStagesContent();
  }, [currentProgram]);

  const handleStartActivity = async () => {
    // Verificamos si hay actividades disponibles
    const { data: activities } = await supabase
      .from('activities')
      .select('id')
      .eq('stage_id', currentStage?.id || '')
      .limit(1);
    
    if (!activities || activities.length === 0) {
      setLocalError('No activity available to start');
      return;
    }

    setStartingActivity(true);
    setLocalError(null);
    try {
      await startActivity(activities[0].id);
    } catch (error) {
      console.error('Error starting activity:', error);
      setLocalError(error instanceof Error ? error.message : 'Failed to start activity');
    } finally {
      setStartingActivity(false);
    }
  };

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
      <div className="mt-8 grid grid-cols-3 gap-6">
        {/* Contenido principal - 2/3 del ancho */}
        <div className="col-span-2">
          {currentStage ? (
            <>
              {/* Stage Content */}
              <StageContentComponent content={stageContent} />

              {/* Activity View */}
              {currentActivity && (
                <div className="mt-8 h-[600px]">
                  <ActivityView 
                    activity={currentActivity}
                    stage={currentStage}
                  />
                </div>
              )}
              
              {/* Start Activity Button */}
              {!currentActivity && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={handleStartActivity}
                    disabled={startingActivity}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {startingActivity ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Iniciando Actividad...
                      </>
                    ) : (
                      'Iniciar Actividad'
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center">
              <p className="text-gray-500">Selecciona una etapa para ver su contenido</p>
            </div>
          )}
        </div>
        
        {/* Program Outline - 1/3 del ancho, siempre visible */}
        <div className="col-span-1">
          <ProgramOutline 
            program={currentProgram} 
            currentStage={currentStage} 
            onSelectStage={(stageId) => {
              // Aquí podríamos implementar la navegación entre etapas
              console.log(`Seleccionada etapa: ${stageId}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}