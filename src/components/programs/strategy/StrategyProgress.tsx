import { Stage } from '../../../types';

interface StrategyProgressProps {
  stages: Stage[];
  currentPhase: number;
  // Eliminamos currentStage ya que no se usa
}

export default function StrategyProgress({ stages, currentPhase }: StrategyProgressProps) {
  // Calculate progress
  const completedStages = stages.filter(stage => stage.status === 'completed').length;
  const progress = Math.round((completedStages / stages.length) * 100);
  
  // Ya no necesitamos los próximos pasos

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
    <div className="mb-8">
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
    </div>
  );
}