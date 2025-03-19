import React from 'react';
import { BookmarkPlus } from 'lucide-react';
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
      className={`flex ${
        message.sender === 'user' ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`max-w-lg rounded-lg px-4 py-2 ${
          message.sender === 'user'
            ? 'bg-blue-600 text-white'
            : message.metadata?.type === 'error'
            ? 'bg-red-100 text-red-800 border border-red-200'
            : message.metadata?.type === 'system'
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {message.content.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < message.content.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
        
        {message.sender === 'ai' && !message.metadata?.type && showInsightButton && (
          <button
            onClick={handleSaveInsight}
            className="mt-2 flex items-center text-xs text-blue-600 hover:text-blue-800"
          >
            <BookmarkPlus className="h-3 w-3 mr-1" />
            Guardar como insight
          </button>
        )}
      </div>
    </div>
  );
}
