import { UserInsight } from '../../types';

interface InsightsListProps {
  insights: UserInsight[];
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function InsightsList({ insights, isVisible, onToggleVisibility }: InsightsListProps) {
  if (!isVisible) {
    return (
      <div className="flex items-center">
        <button
          onClick={onToggleVisibility}
          className="text-sm text-blue-600 hover:text-blue-800 mr-4"
        >
          Insights ({insights.length})
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center">
        <button
          onClick={onToggleVisibility}
          className="text-sm text-blue-600 hover:text-blue-800 mr-4"
        >
          Ocultar insights
        </button>
      </div>
      <div className="bg-gray-50 p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium mb-2">Insights Guardados</h2>
        {insights.length > 0 ? (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {insights.map(insight => (
              <div key={insight.id} className="bg-white p-3 rounded-lg border border-gray-200">
                {insight.content}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No hay insights guardados para esta actividad.</p>
        )}
      </div>
    </div>
  );
}
