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
    loadProgram
  } = useProgramStore();

  const [stageContent, setStageContent] = React.useState<DBStageContent[]>([]);
  const [allStagesContent, setAllStagesContent] = React.useState<Record<string, DBStageContent[]>>({});
  const [loadingContent, setLoadingContent] = React.useState(false);
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
              <StageContentComponent content={stageContent} />


            </>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-center">
              <p className="text-gray-500">Selecciona una etapa para ver su contenido</p>
            </div>
          )}
        </div>
        
        {/* Program Outline - fijo al extremo derecho */}
        <div style={{ width: '25%', minWidth: '250px' }}>
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