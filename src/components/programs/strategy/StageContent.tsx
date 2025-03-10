import { useState } from 'react';
import { Database } from '../../../lib/database.types';
import VideoPlayer from '../../VideoPlayer';
import Chat from '../../Chat';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type StageContent = Database['public']['Tables']['stage_content']['Row'];

interface StageContentProps {
  content: StageContent[];
}

export default function StageContent({ content }: StageContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!content.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-gray-500 text-center">No content available for this stage.</p>
      </div>
    );
  }

  const currentContent = content[currentIndex];
  const isFirstContent = currentIndex === 0;
  const isLastContent = currentIndex === content.length - 1;

  const handlePrevious = () => {
    if (!isFirstContent) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (!isLastContent) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Navigation Progress */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Content {currentIndex + 1} of {content.length}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevious}
              disabled={isFirstContent}
              className={`p-2 rounded-full ${
                isFirstContent
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={handleNext}
              disabled={isLastContent}
              className={`p-2 rounded-full ${
                isLastContent
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / content.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content Display */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {currentContent.title}
          </h3>
          
          {currentContent.content_type === 'video' ? (
            <div className="relative">
              {currentContent.content ? (
                <VideoPlayer 
                  src={currentContent.content} 
                  poster={typeof currentContent.metadata === 'object' && currentContent.metadata ? 
                    (currentContent.metadata as any).poster_url : undefined} 
                />
              ) : (
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
                  <div className="text-center p-4">
                    <p className="text-gray-400 mb-2">Video content not available</p>
                    <p className="text-gray-500 text-sm">Please check the content source</p>
                  </div>
                </div>
              )}
            </div>
          ) : currentContent.content_type === 'activity' ? (
            <div className="mt-6">
              <div className="prose max-w-none mb-6">
                <p>{currentContent.content}</p>
              </div>
              <div className="border rounded-lg overflow-hidden shadow-sm">
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
            <div className="prose max-w-none">
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

        {/* Bottom Navigation */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={isFirstContent}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                isFirstContent
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
              <span>Previous</span>
            </button>
            <button
              onClick={handleNext}
              disabled={isLastContent}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
                isLastContent
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
            >
              <span>Next</span>
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}