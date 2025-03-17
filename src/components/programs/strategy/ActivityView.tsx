import React, { useState, useEffect } from 'react';
import { Activity, Stage } from '../../../types';
import { Send, MessageSquare, AlertCircle } from 'lucide-react';

interface ActivityViewProps {
  activity: Activity;
  stage: Stage;
}

export default function ActivityView({ activity, stage }: ActivityViewProps) {
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    type: 'bot' | 'user' | 'system';
    timestamp: Date;
  }>>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Initialize the conversation with activity context
    setMessages([
      {
        id: '1',
        content: `Bienvenido a la actividad "${activity.name}". Te guiaré paso a paso en este ejercicio.`,
        type: 'system',
        timestamp: new Date()
      },
      {
        id: '2',
        content: 'Para comenzar, ¿podrías identificar los paradigmas actuales que percibes en tu industria? Menciona al menos 2-3 creencias o suposiciones fundamentales.',
        type: 'bot',
        timestamp: new Date()
      }
    ]);
  }, [activity]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      content: input,
      type: 'user' as const,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // Simulate bot typing
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: "Interesante perspectiva. Analicemos cada uno de estos paradigmas:\n\n1. ¿Qué evidencia tienes de que estas creencias son absolutamente ciertas?\n2. ¿Qué oportunidades podrías estar perdiendo por mantener estas creencias?\n3. ¿Cómo podrías reformular estos paradigmas de manera que abran nuevas posibilidades?",
        type: 'bot' as const,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Activity Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{activity.name}</h2>
            <p className="text-sm text-gray-500">Etapa: {stage.name}</p>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.type !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                {message.type === 'system' ? (
                  <AlertCircle className="w-4 h-4 text-blue-600" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                )}
              </div>
            )}
            <div
              className={`
                max-w-2xl rounded-lg px-4 py-2 whitespace-pre-wrap
                ${message.type === 'user'
                  ? 'bg-blue-600 text-white ml-12'
                  : message.type === 'system'
                  ? 'bg-gray-100 text-gray-600'
                  : 'bg-white border border-gray-200 shadow-sm'}
              `}
            >
              {message.content}
            </div>
            {message.type === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center ml-3">
                <span className="text-white text-sm font-medium">
                  {message.content[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-gray-200">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <span>Enviar</span>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}