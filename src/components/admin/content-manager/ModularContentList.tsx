import React from 'react';
import { Edit, Trash2, Video, FileText, MessageSquare } from 'lucide-react';
import { ActivityContent } from '../../../types/index';

interface ModularContentListProps {
  contents: ActivityContent[];
  onEdit: (content: ActivityContent) => void;
  onDelete: (contentId: string) => void;
}

const ModularContentList: React.FC<ModularContentListProps> = ({
  contents,
  onEdit,
  onDelete
}) => {
  // Función para ordenar contenidos por posición/orden
  const sortedContents = [...contents].sort((a, b) => {
    // Usar order_num si está disponible, de lo contrario usar order
    const orderA = 'order_num' in a && a.order_num !== undefined ? Number(a.order_num) : 
                  ('order' in a && a.order !== undefined ? Number(a.order) : 0);
    const orderB = 'order_num' in b && b.order_num !== undefined ? Number(b.order_num) : 
                  ('order' in b && b.order !== undefined ? Number(b.order) : 0);
    return orderA - orderB;
  });

  if (sortedContents.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        No hay contenido disponible para esta etapa.
      </div>
    );
  }

  // Función para obtener el icono según el tipo de contenido
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4 text-blue-500" />;
      case 'text':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'activity':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  // Función para obtener el título del contenido
  const getContentTitle = (content: ActivityContent) => {
    return content.title;
  };

  // Función para obtener el ID del contenido
  const getContentId = (content: ActivityContent) => {
    return content.id;
  };

  // Función para obtener el orden o posición
  const getContentOrder = (content: ActivityContent) => {
    if ('order_num' in content && content.order_num !== undefined) {
      return `Orden: ${content.order_num}`;
    } else if ('order' in content && content.order !== undefined) {
      return `Posición: ${content.order}`;
    }
    return 'Sin orden';
  };

  // Función para determinar si es estructura nueva o antigua
  const isNewStructure = (content: ActivityContent) => {
    // En ActivityContent no existe registry_id, usamos otra propiedad para determinar
    return 'content_metadata' in content && content.content_metadata !== undefined;
  };

  return (
    <div className="space-y-2">
      {sortedContents.map((content) => (
        <div 
          key={getContentId(content)} 
          className="flex justify-between items-center p-2 border border-gray-200 rounded-md hover:bg-gray-50"
        >
          <div className="flex items-center space-x-2">
            {getContentIcon(content.content_type)}
            <span className="text-sm">{getContentTitle(content)}</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {content.content_type}
            </span>
            <span className="text-xs text-gray-500">
              {getContentOrder(content)}
            </span>
            
            {/* Mostrar información sobre la estructura de datos */}
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full ml-2">
              {isNewStructure(content) ? 'Estructura nueva' : 'Estructura antigua'}
            </span>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onEdit(content)}
              className="p-1 text-blue-600 hover:text-blue-900"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(getContentId(content))}
              className="p-1 text-red-600 hover:text-red-900"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModularContentList;
