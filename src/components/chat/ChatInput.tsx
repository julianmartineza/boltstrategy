import { useState, FormEvent, KeyboardEvent } from 'react';
import { Send, Loader2, Lightbulb, Command } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSend, isLoading }: ChatInputProps) {
  const [showCommands, setShowCommands] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isLoading && value.trim()) {
      onSend();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enviar mensaje con Enter (sin shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSend();
      }
    }
    
    // Mostrar/ocultar comandos con /
    if (e.key === '/' && value === '') {
      e.preventDefault();
      setShowCommands(true);
      onChange('/');
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4 shadow-md">
      {showCommands && (
        <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs sm:text-sm">
          <div className="flex items-center mb-1 sm:mb-2">
            <Command className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-gray-500" />
            <span className="font-medium text-gray-700">Comandos disponibles</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
            <div className="flex items-center">
              <code className="bg-gray-200 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs">/guardar [texto]</code>
              <span className="ml-1 sm:ml-2 text-gray-600 text-xs sm:text-sm">Guardar insight</span>
            </div>
            <div className="flex items-center">
              <code className="bg-gray-200 px-1 sm:px-2 py-0.5 sm:py-1 rounded text-xs">/limpiar</code>
              <span className="ml-1 sm:ml-2 text-gray-600 text-xs sm:text-sm">Limpiar chat</span>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              if (e.target.value === '') {
                setShowCommands(false);
              }
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (value === '/') {
                setShowCommands(true);
              }
            }}
            onBlur={() => setTimeout(() => setShowCommands(false), 200)}
            placeholder="Escribe tu mensaje..."
            className="w-full border-2 border-gray-300 rounded-2xl px-3 sm:px-4 py-2 sm:py-3 pr-8 sm:pr-10 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          {value === '' && !isLoading && (
            <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 text-gray-400">
              <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          )}
        </div>
        <button
          type="submit"
          className="ml-1 sm:ml-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-2 sm:p-3 rounded-full hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
          disabled={isLoading || !value.trim()}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          )}
        </button>
      </form>
      <div className="mt-1 sm:mt-2 text-xs text-gray-500 flex items-center">
        <span className="mr-1">Presiona</span>
        <kbd className="px-1 sm:px-2 py-0.5 sm:py-1 bg-gray-100 border border-gray-300 rounded text-xs">/</kbd>
        <span className="ml-1">para ver comandos especiales</span>
      </div>
    </div>
  );
}
