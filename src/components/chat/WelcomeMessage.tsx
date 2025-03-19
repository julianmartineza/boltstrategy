import { MessageCircle } from 'lucide-react';
import { ActivityContent } from '../../types';

interface WelcomeMessageProps {
  activityContent?: ActivityContent | null;
  onStartConversation: () => void;
}

export function WelcomeMessage({ activityContent, onStartConversation }: WelcomeMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-10">
      <div className="bg-gray-100 rounded-lg p-6 max-w-md text-center shadow-sm">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <MessageCircle className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-2">
          {activityContent?.title 
            ? `Actividad: ${activityContent.title}` 
            : 'Bienvenido al chat de consultoría'}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {activityContent?.description 
            ? activityContent.description 
            : 'Aquí puedes conversar con nuestro asistente para obtener ayuda con esta actividad.'}
        </p>
        
        <button 
          onClick={onStartConversation}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center w-full"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Iniciar conversación
        </button>
      </div>
    </div>
  );
}
