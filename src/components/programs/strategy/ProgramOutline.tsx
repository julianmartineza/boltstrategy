import React from 'react';
import { ChevronDown, ChevronRight, CheckCircle, Circle, FileText, Video, MessageSquare } from 'lucide-react';

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

// Definir el tipo Stage localmente ya que no está disponible en types
interface Stage {
  id: string;
  name: string;
  order_num: number;
  status: 'locked' | 'active' | 'completed';
}

interface ProgramOutlineProps {
  stages: Stage[];
  currentStageId?: string;
  viewedContents?: Record<string, boolean>;
  allStagesContent?: Record<string, DBStageContent[]>;
  onSelectStage?: (stageId: string) => void;
}

export default function ProgramOutline({ 
  stages, 
  currentStageId,
  viewedContents = {},
  allStagesContent = {},
  onSelectStage
}: ProgramOutlineProps) {
  // Inicializar con la etapa actual expandida
  const [expandedStages, setExpandedStages] = React.useState<Record<string, boolean>>(
    currentStageId ? { [currentStageId]: true } : {}
  );

  // Actualizar expandedStages cuando cambia la etapa actual
  React.useEffect(() => {
    if (currentStageId) {
      setExpandedStages(prev => ({
        ...prev,
        [currentStageId]: true
      }));
    }
  }, [currentStageId]);

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const handleSelectStage = (stageId: string) => {
    if (onSelectStage) {
      onSelectStage(stageId);
    }
  };

  // Agrupar etapas por fase
  const phases: Record<number, Stage[]> = {};
  stages.forEach((stage, index) => {
    const phaseIndex = Math.floor(index / 4);
    if (!phases[phaseIndex]) {
      phases[phaseIndex] = [];
    }
    phases[phaseIndex].push(stage);
  });

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-900 p-4 border-b border-gray-200 hidden md:block">
        Esquema del Programa
      </h2>
      
      <div className="flex-1 overflow-y-auto p-4">
        {Object.entries(phases).map(([phaseIndex, phaseStages]) => (
          <div key={phaseIndex} className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">
              Fase {parseInt(phaseIndex) + 1}
            </h3>
            
            <div className="space-y-2">
              {phaseStages.map(stage => {
                const isExpanded = expandedStages[stage.id] || false;
                const isCurrentStage = stage.id === currentStageId;
                const stageContents = allStagesContent[stage.id] || [];
                
                return (
                  <div key={stage.id} className="border border-gray-200 rounded-md overflow-hidden">
                    <button 
                      className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                        isCurrentStage ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleStage(stage.id)}
                    >
                      <div className="flex items-center">
                        {isExpanded ? 
                          <ChevronDown className="h-4 w-4 text-gray-400 mr-2" /> : 
                          <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                        }
                        <span className={`text-sm font-medium ${isCurrentStage ? 'text-blue-700' : 'text-gray-700'}`}>
                          {stage.name}
                        </span>
                      </div>
                      
                      {/* Indicador de progreso */}
                      <div className="flex items-center">
                        {stageContents.length > 0 && (
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">
                              {Object.keys(viewedContents).filter(id => 
                                stageContents.some(content => content.id === id)
                              ).length} / {stageContents.length}
                            </span>
                            {Object.keys(viewedContents).filter(id => 
                              stageContents.some(content => content.id === id)
                            ).length === stageContents.length ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                    
                    {isExpanded && stageContents.length > 0 && (
                      <div className="border-t border-gray-200 bg-gray-50 p-2 max-h-[200px] overflow-y-auto">
                        <ul className="space-y-1">
                          {stageContents.map(content => {
                            const isViewed = viewedContents[content.id] || false;
                            
                            return (
                              <li key={content.id}>
                                <button
                                  className={`w-full flex items-center p-2 rounded-md text-left text-sm ${
                                    isViewed ? 'text-gray-500' : 'text-gray-700'
                                  } hover:bg-gray-100`}
                                  onClick={() => {
                                    handleSelectStage(stage.id);
                                    // Encontrar el índice del contenido dentro de la etapa
                                    const contentIndex = stageContents.findIndex(c => c.id === content.id);
                                    if (contentIndex !== -1 && onSelectStage) {
                                      // Usar setTimeout para asegurar que primero se cambie la etapa
                                      setTimeout(() => {
                                        // Emitir un evento personalizado para indicar qué contenido seleccionar
                                        const event = new CustomEvent('select-content', { 
                                          detail: { stageId: stage.id, contentIndex } 
                                        });
                                        window.dispatchEvent(event);
                                      }, 50);
                                    }
                                  }}
                                  data-component-name="ProgramOutline"
                                >
                                  {content.content_type === 'video' ? (
                                    <Video className="h-4 w-4 mr-2 flex-shrink-0" />
                                  ) : content.content_type === 'activity' ? (
                                    <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                                  ) : (
                                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                                  )}
                                  <span className="truncate">{content.title}</span>
                                  {isViewed && (
                                    <CheckCircle className="h-3 w-3 text-green-500 ml-auto flex-shrink-0" />
                                  )}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
