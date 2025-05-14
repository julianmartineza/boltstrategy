import React, { useState } from 'react';
import ActivityContextList from './ActivityContextList';
import ActivityContextConfigWrapper from './ActivityContextConfigWrapper';

const ActivityContextManager: React.FC = () => {
  const [selectedActivity, setSelectedActivity] = useState<{ id: string; title: string } | null>(null);
  
  const handleConfigureContext = (activityId: string, activityTitle: string) => {
    setSelectedActivity({ id: activityId, title: activityTitle });
  };
  
  const handleBack = () => {
    setSelectedActivity(null);
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configuración de Contexto de Actividades</h2>
      
      {selectedActivity ? (
        <ActivityContextConfigWrapper 
          activityId={selectedActivity.id} 
          activityTitle={selectedActivity.title} 
          onBack={handleBack} 
        />
      ) : (
        <ActivityContextList onConfigureContext={handleConfigureContext} />
      )}
    </div>
  );
};

export default ActivityContextManager;
