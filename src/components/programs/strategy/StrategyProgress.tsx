// Definir el tipo Stage localmente ya que no está disponible directamente
interface Stage {
  id: string;
  name: string;
  order_num: number;
  status: 'locked' | 'active' | 'completed';
}

interface StrategyProgressProps {
  stages: Stage[];
  currentPhase: number;
  isVertical?: boolean; // Nueva prop para indicar si se muestra vertical
}

export default function StrategyProgress({ 
  stages, 
  currentPhase,
  isVertical = false 
}: StrategyProgressProps) {
  // Calculate progress
  const completedStages = stages.filter(stage => stage.status === 'completed').length;
  const progress = Math.round((completedStages / stages.length) * 100);
  
  // Get current phase name
  const getCurrentPhaseName = (phaseIndex: number) => {
    switch (phaseIndex) {
      case 0: return "Fundamentos e Identidad";
      case 1: return "Análisis y Propuesta de Valor";
      case 2: return "Crecimiento e Implementación";
      default: return "Desarrollo de Estrategia";
    }
  };

  // Versión compacta para barra lateral
  if (isVertical) {
    return (
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Progreso</h3>
          <span className="text-sm font-semibold text-blue-600">{progress}%</span>
        </div>
        
        <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden mb-2">
          <div 
            className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <p className="text-xs text-gray-500 truncate">
          Fase {currentPhase + 1}: {getCurrentPhaseName(currentPhase)}
        </p>
      </div>
    );
  }

  // Versión original (para compatibilidad)
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