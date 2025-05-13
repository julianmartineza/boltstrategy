import React, { useState } from 'react';
import ActivityList from './ActivityList';
import EvaluationConfig from './EvaluationConfig';

const ActivityEvaluationManager: React.FC = () => {
  const [selectedActivity, setSelectedActivity] = useState<{ id: string; title: string } | null>(null);
  
  const handleConfigureEvaluation = (activityId: string, activityTitle: string) => {
    setSelectedActivity({ id: activityId, title: activityTitle });
  };
  
  const handleBack = () => {
    setSelectedActivity(null);
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Evaluación de Actividades</h2>
      
      {selectedActivity ? (
        <EvaluationConfig 
          activityId={selectedActivity.id} 
          activityTitle={selectedActivity.title} 
          onBack={handleBack} 
        />
      ) : (
        <ActivityList onConfigureEvaluation={handleConfigureEvaluation} />
      )}
    </div>
  );
};

export default ActivityEvaluationManager;
