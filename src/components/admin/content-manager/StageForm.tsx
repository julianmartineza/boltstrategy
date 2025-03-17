import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Stage } from './types';

interface StageFormProps {
  stage: Partial<Stage>;
  onSave: (stage: Partial<Stage>) => void;
  onCancel: () => void;
  loading: boolean;
  isEditing?: boolean;
}

const StageForm: React.FC<StageFormProps> = ({ 
  stage, 
  onSave, 
  onCancel, 
  loading, 
  isEditing = false 
}) => {
  const [formStage, setFormStage] = useState<Partial<Stage>>(stage);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formStage);
  };

  return (
    <div className="bg-gray-50 p-4 rounded-md mb-4 border border-gray-200">
      <h5 className="text-sm font-medium mb-3">
        {isEditing ? 'Editar Etapa' : 'Nueva Etapa'}
      </h5>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            value={formStage.name || ''}
            onChange={(e) => setFormStage({ ...formStage, name: e.target.value })}
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nombre de la etapa"
            disabled={loading}
            required
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Orden</label>
          <input
            type="number"
            value={formStage.order_num || 0}
            onChange={(e) => setFormStage({ ...formStage, order_num: parseInt(e.target.value) || 0 })}
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            min="0"
            disabled={loading}
            required
          />
        </div>
        
        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center">
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Guardando...
              </span>
            ) : (
              'Guardar'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StageForm;
