import { Fragment } from 'react';
import { BookmarkPlus, User, Bot } from 'lucide-react';
import { Message } from '../../types';

interface ChatMessageProps {
  message: Message;
  onSaveInsight?: (content: string) => void;
  showInsightButton?: boolean;
}

export function ChatMessage({ message, onSaveInsight, showInsightButton = false }: ChatMessageProps) {
  const handleSaveInsight = () => {
    if (onSaveInsight) {
      onSaveInsight(message.content);
    }
  };

  return (
    <div
      className={`flex items-end ${
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      } mb-4`}
    >
      {message.sender === 'ai' && (
        <div className="flex-shrink-0 mr-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white">
            <Bot size={18} />
          </div>
        </div>
      )}
      
      <div
        className={`relative max-w-md rounded-2xl px-4 py-3 shadow-sm ${
          message.sender === 'user'
            ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none'
            : message.metadata?.type === 'error'
            ? 'bg-red-100 text-red-800 border border-red-200 rounded-bl-none'
            : message.metadata?.type === 'system'
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-bl-none'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
        }`}
      >
        {message.content.split('\n').map((line, i) => (
          <Fragment key={i}>
            {line}
            {i < message.content.split('\n').length - 1 && <br />}
          </Fragment>
        ))}
        
        {message.sender === 'ai' && !message.metadata?.type && showInsightButton && (
          <button
            onClick={handleSaveInsight}
            className="mt-2 flex items-center text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            <BookmarkPlus className="h-3 w-3 mr-1" />
            Guardar como insight
          </button>
        )}
        
        <div 
          className={`absolute bottom-0 ${message.sender === 'user' ? 'right-0 transform translate-y-1/2 -translate-x-1' : 'left-0 transform translate-y-1/2 translate-x-1'}`}
        >
          <div 
            className={`w-2 h-2 transform rotate-45 ${
              message.sender === 'user'
                ? 'bg-blue-600'
                : message.metadata?.type === 'error'
                ? 'bg-red-100 border-r border-b border-red-200'
                : message.metadata?.type === 'system'
                ? 'bg-yellow-100 border-r border-b border-yellow-200'
                : 'bg-white border-r border-b border-gray-200'
            }`}
          ></div>
        </div>
      </div>
      
      {message.sender === 'user' && (
        <div className="flex-shrink-0 ml-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white">
            <User size={18} />
          </div>
        </div>
      )}
    </div>
  );
}
