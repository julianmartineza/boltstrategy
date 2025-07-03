import React from 'react';
import { Edit, Trash2, ChevronDown, ChevronUp, PlusCircle, Loader2 } from 'lucide-react';
import { Stage } from './types';
import { ActivityContent } from '../../../types/index';
import ModularContentList from './ModularContentList';

interface ModularStageListProps {
  stages: Stage[];
  contents: ActivityContent[];
  expandedStages: Record<string, boolean>;
  onToggleExpand: (stageId: string) => void;
  onEdit: (stage: Stage) => void;
  onDelete: (stageId: string) => void;
  onAddContent: (stageId: string) => void;
  onEditContent: (content: ActivityContent) => void;
  onDeleteContent: (contentId: string) => void;
  contentLoading: boolean;
}

const ModularStageList: React.FC<ModularStageListProps> = ({
  stages,
  contents,
  expandedStages,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddContent,
  onEditContent,
  onDeleteContent,
  contentLoading
}) => {
  if (stages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay etapas disponibles para este programa.
      </div>
    );
  }

  // Función para filtrar contenidos por etapa
  const getStageContents = (stageId: string): ActivityContent[] => {
    return contents.filter(content => {
      // En ActivityContent solo existe stage_id
      return content.stage_id === stageId;
    });
  };

  return (
    <div className="space-y-2">
      {stages.map((stage) => (
        <div key={stage.id} className="border border-gray-200 rounded-md overflow-hidden">
          <div className="flex justify-between items-center p-3 bg-gray-50">
            <div 
              className="font-medium flex-grow cursor-pointer"
              onClick={() => onToggleExpand(stage.id)}
            >
              <div className="flex items-center">
                {expandedStages[stage.id] ? (
                  <ChevronUp className="h-4 w-4 mr-2 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
                )}
                <span className="text-sm">{stage.name}</span>
                <span className="ml-2 text-xs text-gray-500">Orden: {stage.order_num}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onEdit(stage)}
                className="p-1 text-blue-600 hover:text-blue-900"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(stage.id)}
                className="p-1 text-red-600 hover:text-red-900"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {expandedStages[stage.id] && (
            <div className="p-3">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium">Contenido de la Etapa</h4>
                <button
                  onClick={() => onAddContent(stage.id)}
                  className="flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                  disabled={contentLoading}
                >
                  <PlusCircle className="h-3 w-3 mr-1" />
                  Añadir Contenido
                </button>
              </div>
              
              {contentLoading ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                </div>
              ) : (
                <ModularContentList 
                  contents={getStageContents(stage.id)}
                  onEdit={onEditContent}
                  onDelete={onDeleteContent}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ModularStageList;
