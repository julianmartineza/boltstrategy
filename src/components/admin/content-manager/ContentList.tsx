import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { StageContent } from './types';

interface ContentListProps {
  contents: StageContent[];
  stageId: string;
  onEdit: (content: StageContent) => void;
  onDelete: (contentId: string, stageId: string) => void;
  loading: boolean;
}

const ContentList: React.FC<ContentListProps> = ({ 
  contents, 
  stageId, 
  onEdit, 
  onDelete, 
  loading 
}) => {
  const stageContents = contents.filter(content => content.stage_id === stageId)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  if (stageContents.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-gray-500">
        No hay contenido disponible para esta etapa.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contenido</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {stageContents.map((content) => (
            <tr key={content.id}>
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="text-xs text-gray-900">{content.order_num}</div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${content.content_type === 'video' ? 'bg-purple-100 text-purple-800' : 
                    content.content_type === 'activity' ? 'bg-green-100 text-green-800' : 
                    'bg-blue-100 text-blue-800'}`}
                >
                  {content.content_type === 'video' ? 'Video' : 
                   content.content_type === 'activity' ? 'Actividad' : 'Texto'}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="text-xs font-medium text-gray-900">{content.title}</div>
              </td>
              <td className="px-4 py-2">
                <div className="text-xs text-gray-500 max-w-xs truncate">
                  {content.content_type === "video" 
                    ? content.content 
                    : content.content.length > 100 
                      ? content.content.substring(0, 100) + "..." 
                      : content.content}
                </div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-medium">
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => onEdit(content)}
                    className="text-blue-600 hover:text-blue-900"
                    disabled={loading}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(content.id, stageId)}
                    className="text-red-600 hover:text-red-900"
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContentList;
