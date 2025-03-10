import React from 'react';
import { Program, Stage } from '../../../types';
import { ChevronDown, ChevronRight, CheckCircle, Circle, FileText, Video, MessageSquare } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';

// Tipo para los datos de contenido de etapa que vienen de la base de datos
type DBStageContent = Database['public']['Tables']['stage_content']['Row'];

interface ProgramOutlineProps {
  program: Program;
  currentStage: Stage | null;
  currentContentId?: string;
  viewedContents?: Record<string, boolean>;
  onSelectStage?: (stageId: string) => void;
  onSelectContent?: (stageId: string, contentId: string) => void;
}

export default function ProgramOutline({ 
  program, 
  currentStage, 
  currentContentId,
  viewedContents = {},
  onSelectStage,
  onSelectContent
}: ProgramOutlineProps) {
  // Inicializar con la etapa actual expandida
  const [expandedStages, setExpandedStages] = React.useState<Record<string, boolean>>(
    currentStage ? { [currentStage.id]: true } : {}
  );
  const [stageContents, setStageContents] = React.useState<Record<string, DBStageContent[]>>({});
  const [loading, setLoading] = React.useState<Record<string, boolean>>({});

  // Inicializar la etapa actual como expandida y cargar el contenido de todas las etapas
  React.useEffect(() => {
    // Expandir la etapa actual
    if (currentStage) {
      setExpandedStages(prev => ({
        ...prev,
        [currentStage.id]: true
      }));
    }
    
    // Cargar el contenido de todas las etapas
    program.stages.forEach(stage => {
      if (!stageContents[stage.id] && !loading[stage.id]) {
        loadStageContent(stage.id);
      }
    });
  }, [currentStage?.id, program.stages]);
  
  // Función para cargar el contenido de una etapa
  const loadStageContent = async (stageId: string) => {
    if (loading[stageId] || stageContents[stageId]) return;
    
    setLoading(prev => ({ ...prev, [stageId]: true }));
    
    try {
      const { data, error } = await supabase
        .from('stage_content')
        .select('*')
        .eq('stage_id', stageId)
        .order('order_num');
        
      if (error) throw error;
      
      // Siempre guardar el resultado, incluso si es un array vacío
      setStageContents(prev => ({
        ...prev,
        [stageId]: data || []
      }));
    } catch (error) {
      console.error(`Error cargando contenido para la etapa ${stageId}:`, error);
      // En caso de error, establecer un array vacío para evitar intentos repetidos
      setStageContents(prev => ({
        ...prev,
        [stageId]: []
      }));
    } finally {
      setLoading(prev => ({ ...prev, [stageId]: false }));
    }
  };

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const handleStageClick = (stageId: string) => {
    if (onSelectStage) {
      onSelectStage(stageId);
    }
    toggleStage(stageId);
    
    // Cargar el contenido de la etapa si aún no lo tenemos
    if (!stageContents[stageId]) {
      loadStageContent(stageId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Contenido del Programa</h3>
      
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        {program.stages.map((stage) => {
          const isCurrentStage = currentStage?.id === stage.id;
          const isExpanded = expandedStages[stage.id];
          const isCompleted = stage.status === 'completed';
          // Eliminamos isActive ya que no se utiliza
          const isLocked = stage.status === 'locked';

          return (
            <div key={stage.id} className="border rounded-md overflow-hidden">
              <button
                onClick={() => handleStageClick(stage.id)}
                className={`w-full flex items-center justify-between p-3 text-left ${
                  isCurrentStage 
                    ? 'bg-blue-50 text-blue-700' 
                    : isCompleted 
                      ? 'bg-green-50 text-green-700' 
                      : isLocked 
                        ? 'bg-gray-100 text-gray-500' 
                        : 'bg-white text-gray-700'
                }`}
                disabled={isLocked}
              >
                <div className="flex items-center space-x-2">
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : isCurrentStage ? (
                    <Circle className="h-5 w-5 text-blue-500 fill-blue-100" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-300" />
                  )}
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              
              {isExpanded && (
                <div className="bg-gray-50 p-3 border-t">
                  {loading[stage.id] ? (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                    </div>
                  ) : stageContents[stage.id] ? (
                    stageContents[stage.id].length > 0 ? (
                      <ul className="space-y-2">
                        {stageContents[stage.id].map((content, index) => {
                          const isCurrentContent = content.id === currentContentId;
                          const isViewed = viewedContents[content.id] === true;
                          
                          return (
                            <li key={content.id} className="text-sm pl-7 py-1">
                              <button 
                                onClick={() => onSelectContent && onSelectContent(stage.id, content.id)}
                                className={`w-full flex items-start ${isCurrentContent ? 'bg-blue-50 rounded-md p-1' : 'p-1'}`}
                              >
                                <span className={`text-xs ${isViewed ? 'bg-green-200 text-green-700' : 'bg-gray-200 text-gray-700'} rounded-full h-5 w-5 flex items-center justify-center mr-2`}>
                                  {isViewed ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    index + 1
                                  )}
                                </span>
                                <div className="flex items-center">
                                  {content.content_type === 'text' && (
                                    <FileText className={`h-4 w-4 ${isCurrentContent ? 'text-blue-600' : 'text-blue-500'} mr-2`} />
                                  )}
                                  {content.content_type === 'video' && (
                                    <Video className={`h-4 w-4 ${isCurrentContent ? 'text-red-600' : 'text-red-500'} mr-2`} />
                                  )}
                                  {content.content_type === 'activity' && (
                                    <MessageSquare className={`h-4 w-4 ${isCurrentContent ? 'text-green-600' : 'text-green-500'} mr-2`} />
                                  )}
                                  <span className={`${isCurrentContent ? 'text-blue-700 font-medium' : isViewed ? 'text-green-700' : 'text-gray-700'}`}>
                                    {content.title}
                                  </span>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 pl-7">No hay contenido disponible para esta etapa</p>
                    )
                  ) : (
                    <p className="text-sm text-gray-500 pl-7">Cargando contenido...</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
