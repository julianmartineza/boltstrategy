import React from 'react';
import { Stage } from '../../../types';
import { Target, CheckCircle } from 'lucide-react';

interface StrategyProgressProps {
  stages: Stage[];
  currentPhase: number;
  currentStage: Stage | null;
}

export default function StrategyProgress({ stages, currentPhase, currentStage }: StrategyProgressProps) {
  // Calculate progress
  const completedStages = stages.filter(stage => stage.status === 'completed').length;
  const progress = Math.round((completedStages / stages.length) * 100);
  
  // Get next uncompleted stages
  const nextStages = stages
    .filter(stage => stage.status !== 'completed')
    .slice(0, 2);

  // Get current phase name
  const getCurrentPhaseName = (phaseIndex: number) => {
    switch (phaseIndex) {
      case 0: return "Fundamentos e Identidad";
      case 1: return "Análisis y Propuesta de Valor";
      case 2: return "Crecimiento e Implementación";
      default: return "Desarrollo de Estrategia";
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6 mb-8">
      {/* Progress Card */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Progreso General</h2>
        <p className="text-sm text-gray-600 mb-4">
          Fase {currentPhase + 1}: {getCurrentPhaseName(currentPhase)}
        </p>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-gray-600">{progress}% Completado</p>
      </div>

      {/* Next Steps Card */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Pasos</h2>
        <div className="space-y-3">
          {nextStages.map((stage, index) => (
            <div key={stage.id} className="flex items-center space-x-3">
              {stage.id === currentStage?.id ? (
                <Target className="h-5 w-5 text-blue-600" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
              )}
              <span className="text-sm text-gray-700">{stage.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}