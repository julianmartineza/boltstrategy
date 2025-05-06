import React, { useState, useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';

interface InfoCalloutProps {
  title: string;
  description: string;
  example?: string;
}

const InfoCallout: React.FC<InfoCalloutProps> = ({ title, description, example }) => {
  const [isOpen, setIsOpen] = useState(false);
  const calloutRef = useRef<HTMLDivElement>(null);

  // Cerrar el callout cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calloutRef.current && !calloutRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <span className="relative inline-block ml-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center text-blue-600 hover:text-blue-800 focus:outline-none"
        aria-label={isOpen ? "Cerrar información" : "Ver información"}
      >
        <Info size={16} />
      </button>
      
      {isOpen && (
        <div 
          ref={calloutRef}
          className="absolute z-10 right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 p-3 text-left"
        >
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-600 mb-2">{description}</p>
          {example && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-700">Ejemplo:</p>
              <p className="text-xs italic bg-gray-50 p-1 rounded border border-gray-100">{example}</p>
            </div>
          )}
        </div>
      )}
    </span>
  );
};

export default InfoCallout;
