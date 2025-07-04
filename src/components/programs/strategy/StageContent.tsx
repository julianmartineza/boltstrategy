import { useState, useEffect } from 'react';
import VideoPlayer from '../../VideoPlayer';
import { Chat } from '../../chat/Chat';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import AdvisorySessionComponent from '../../advisory/AdvisorySessionComponent';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';

// Definición de tipo actualizada para incluir 'advisory_session'
type StageContent = {
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
  
  // Asegurarnos de que hay contenido para mostrar
  if (!content || content.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No hay contenido disponible para esta etapa.
      </div>
    );
  }

  // Obtener el contenido actual
  const currentContent = content[currentIndex];
  
  const { user } = useAuthStore();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [advisorySessionId, setAdvisorySessionId] = useState<string | null>(null);
  
  // Obtener el ID de la empresa del usuario actual
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .single();
        
        if (error) throw error;
        if (data) setCompanyId(data.id);
      } catch (err) {
        console.error('Error al obtener el ID de la empresa:', err);
      }
    };
    
    fetchCompanyId();
  }, [user]);
  
  // Obtener el ID de la sesión de asesoría cuando el contenido cambia
  useEffect(() => {
    const fetchAdvisorySessionId = async () => {
      if (!currentContent || currentContent.content_type !== 'advisory_session') {
        setAdvisorySessionId(null);
        return;
      }
      
      try {
        // Buscar el ID de la sesión de asesoría en el registro de contenido
        const { data, error } = await supabase
          .from('content_registry')
          .select('content_id')
          .eq('id', currentContent.id)
          .single();
        
        if (error) throw error;
        if (data) setAdvisorySessionId(data.content_id);
      } catch (err) {
        console.error('Error al obtener el ID de la sesión de asesoría:', err);
      }
    };
    
    fetchAdvisorySessionId();
  }, [currentContent]);
  
  // Logs detallados para depuración
  if (process.env.NODE_ENV === 'development') {
    console.log(`Renderizando contenido tipo: ${currentContent?.content_type || 'desconocido'} (ID: ${currentContent?.id || 'sin ID'})`);
  }

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
            {currentContent?.title || 'Sin título'}
          </h3>
          
          {currentContent?.content_type === 'video' ? (
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
          ) : currentContent?.content_type === 'activity' ? (
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
          ) : currentContent?.content_type === 'advisory_session' ? (
            <div className="w-full">
              {companyId && advisorySessionId ? (
                <AdvisorySessionComponent 
                  sessionId={advisorySessionId} 
                  companyId={companyId} 
                />
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {!companyId ? (
                    <p>No se pudo determinar tu empresa. Por favor, contacta al administrador.</p>
                  ) : (
                    <p>Cargando información de la sesión de asesoría...</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="prose max-w-none w-full">
              {currentContent?.content.split('\n').map((line, index) => {
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