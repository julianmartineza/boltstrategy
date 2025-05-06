import React, { useEffect } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { ActivityContent } from '../../../types/index';
import { debugContentList } from '../../../services/debugContentList';

interface ContentListProps {
  contents: ActivityContent[];
  stageId: string;
  onEdit: (content: ActivityContent) => void;
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
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Depuración: Mostrar contenidos para esta etapa
  console.log('Contenidos para la etapa', stageId, stageContents);
  
  // Usar la función de depuración detallada
  useEffect(() => {
    debugContentList(contents, stageId);
    
    // Verificar específicamente los contenidos de texto
    const textContents = stageContents.filter(content => content.content_type === 'text');
    if (textContents.length > 0) {
      console.log('=== DEPURACIÓN ESPECÍFICA DE CONTENIDOS DE TEXTO EN LA LISTA ===');
      textContents.forEach((content, index) => {
        console.log(`Contenido de texto #${index + 1}:`);
        console.log(`ID: ${content.id}`);
        console.log(`Título: "${content.title}"`);
        console.log(`Tipo: ${content.content_type}`);
        console.log(`Objeto completo:`, content);
      });
    }
  }, [contents, stageId, stageContents]);

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
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {stageContents.map((content) => (
            <tr key={content.id}>
              <td className="px-4 py-2 whitespace-nowrap">{content.order}</td>
              <td className="px-4 py-2 whitespace-nowrap">{content.content_type}</td>
              <td className="px-4 py-2">{content.title}</td>
              <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-medium">
                <button
                  onClick={() => onEdit(content)}
                  className="text-blue-600 hover:text-blue-900 mr-2"
                  title="Editar"
                  disabled={loading}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(content.id, stageId)}
                  className="text-red-600 hover:text-red-900"
                  title="Eliminar"
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ContentList;
