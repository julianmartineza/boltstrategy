import { useState } from 'react';
import { Database } from '../../../lib/database.types';
import VideoPlayer from '../../VideoPlayer';
import { Chat } from '../../chat/Chat';
import { ArrowLeft, ArrowRight } from 'lucide-react';

type StageContent = Database['public']['Tables']['stage_content']['Row'];

interface StageContentProps {
  content: StageContent[];
  currentIndex?: number;
  onChangeContent?: (index: number) => void;
  viewedContents?: Record<string, boolean>;
  hasNextStage?: boolean;
  hasPreviousStage?: boolean;
  onNavigateToNextStage?: () => void;
  onNavigateToPreviousStage?: () => void;
}

export function StageContent({ 
  content, 
  currentIndex: externalIndex, 
  onChangeContent, 
  viewedContents = {},
  hasNextStage = false,
  hasPreviousStage = false,
  onNavigateToNextStage,
  onNavigateToPreviousStage
}: StageContentProps) {
  // Usar el viewedContents para mostrar indicadores visuales
  // Usar el índice externo si se proporciona, o mantener un estado interno
  const [internalIndex, setInternalIndex] = useState(0);
  
  // Determinar qué índice usar (externo o interno)
  const currentIndex = externalIndex !== undefined ? externalIndex : internalIndex;
  
  if (!content.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 w-full">
        <p className="text-gray-500 text-center">No hay contenido disponible para esta etapa.</p>
      </div>
    );
  }

  const currentContent = content[currentIndex];
  const isFirstContent = currentIndex === 0;
  const isLastContent = currentIndex === content.length - 1;

  const handlePrevious = () => {
    if (!isFirstContent) {
      const newIndex = currentIndex - 1;
      if (onChangeContent) {
        onChangeContent(newIndex);
      } else {
        setInternalIndex(newIndex);
      }
    } else if (hasPreviousStage && onNavigateToPreviousStage) {
      // Si estamos en el primer contenido y hay una etapa anterior, navegar a ella
      onNavigateToPreviousStage();
    }
  };

  const handleNext = () => {
    if (!isLastContent) {
      const newIndex = currentIndex + 1;
      if (onChangeContent) {
        onChangeContent(newIndex);
      } else {
        setInternalIndex(newIndex);
      }
    } else if (hasNextStage && onNavigateToNextStage) {
      // Si estamos en el último contenido y hay una etapa siguiente, navegar a ella
      onNavigateToNextStage();
    }
  };

  return (
    <div className="space-y-4 w-full">

      {/* Content Display */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden w-full">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {currentContent.title}
          </h3>
          
          {currentContent.content_type === 'video' ? (
            <div className="relative w-full">
              {currentContent.content ? (
                <VideoPlayer 
                  src={currentContent.content} 
                  poster={typeof currentContent.metadata === 'object' && currentContent.metadata ? 
                    (currentContent.metadata as any).poster_url : undefined} 
                  className="w-full"
                />
              ) : (
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center w-full">
                  <div className="text-center p-4">
                    <p className="text-gray-400 mb-2">Video content not available</p>
                    <p className="text-gray-500 text-sm">Please check the content source</p>
                  </div>
                </div>
              )}
            </div>
          ) : currentContent.content_type === 'activity' ? (
            <div className="mt-6 w-full">
              <div className="prose max-w-none mb-6 w-full">
                <p>{currentContent.content}</p>
              </div>
              <div className="border rounded-lg overflow-hidden shadow-sm w-full">
                {/* Verificar que activity_data tenga la estructura correcta antes de pasarlo al componente Chat */}
                {currentContent.activity_data && typeof currentContent.activity_data === 'object' ? (
                  <Chat 
                    activityContentProp={{
                      ...currentContent,
                      activity_data: {
                        prompt: (currentContent.activity_data as any).prompt || '',
                        system_instructions: (currentContent.activity_data as any).system_instructions,
                        initial_message: (currentContent.activity_data as any).initial_message,
                        max_exchanges: (currentContent.activity_data as any).max_exchanges
                      }
                    }} 
                  />
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No se encontraron datos de actividad válidos.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="prose max-w-none w-full">
              {currentContent.content.split('\n').map((line, index) => {
                if (line.startsWith('# ')) {
                  return <h1 key={index} className="text-3xl font-bold mt-6 mb-4">{line.slice(2)}</h1>;
                } else if (line.startsWith('## ')) {
                  return <h2 key={index} className="text-2xl font-semibold mt-6 mb-3">{line.slice(3)}</h2>;
                } else if (line.startsWith('- ')) {
                  return <li key={index} className="ml-4">{line.slice(2)}</li>;
                } else if (line.trim() === '') {
                  return <br key={index} />;
                } else {
                  return <p key={index} className="mb-4">{line}</p>;
                }
              })}
            </div>
          )}
        </div>

        {/* Navegación inferior mejorada */}
        <div className="border-t border-gray-200 p-4 bg-gray-50" data-component-name="StageContent">
          <div className="flex justify-between items-center" data-component-name="StageContent">
            <button
              onClick={handlePrevious}
              disabled={isFirstContent && !hasPreviousStage}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                isFirstContent && !hasPreviousStage
                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 hover:border-blue-200'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Anterior</span>
            </button>
            
            <div className="flex flex-col items-center space-y-2">
              {/* Indicadores de progreso */}
              <div className="flex items-center space-x-1">
                {content.map((item, idx) => {
                  const isActive = idx === currentIndex;
                  const isViewed = viewedContents[item.id] === true;
                  return (
                    <button 
                      key={idx}
                      onClick={() => {
                        if (onChangeContent) {
                          onChangeContent(idx);
                        } else {
                          setInternalIndex(idx);
                        }
                      }}
                      className={`h-2 rounded-full transition-all ${isActive ? 'w-4 bg-blue-600' : isViewed ? 'w-2 bg-green-500' : 'w-2 bg-gray-300'}`}
                      aria-label={`Ir al contenido ${idx + 1}`}
                    />
                  );
                })}
              </div>
              <div className="text-sm text-gray-500">
                {currentIndex + 1} de {content.length}
              </div>
            </div>
            
            <button
              onClick={handleNext}
              disabled={isLastContent && !hasNextStage}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                isLastContent && !hasNextStage
                  ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                  : 'text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-400'
              }`}
              data-component-name="StageContent"
            >
              <span data-component-name="StageContent">Siguiente</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}