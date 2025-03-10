import React from 'react';
import { Stage } from '../../../types';
import { CheckCircle, Lock, ArrowRight } from 'lucide-react';

interface StageProgressProps {
  stages: Stage[];
  currentStage: Stage | null;
  onStageSelect: (stage: Stage) => void;
}

export default function StageProgress({ stages, currentStage, onStageSelect }: StageProgressProps) {
  // Group stages into phases of 4
  const phases = stages.reduce((acc, stage, index) => {
    const phaseIndex = Math.floor(index / 4);
    if (!acc[phaseIndex]) {
      acc[phaseIndex] = [];
    }
    acc[phaseIndex].push(stage);
    return acc;
  }, [] as Stage[][]);

  return (
    <div className="space-y-12">
      {phases.map((phaseStages, phaseIndex) => (
        <div key={phaseIndex} className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-6">
            Phase {phaseIndex + 1}: {getPhaseTitle(phaseIndex)}
          </h3>
          
          <div className="grid grid-cols-4 gap-6">
            {phaseStages.map((stage, index) => {
              const isActive = stage.id === currentStage?.id;
              const isCompleted = stage.status === 'completed';
              const isLocked = stage.status === 'locked';
              const isNext = !isLocked && !isActive && !isCompleted;
              const stageNumber = phaseIndex * 4 + index + 1;

              return (
                <button
                  key={stage.id}
                  onClick={() => !isLocked && onStageSelect(stage)}
                  disabled={isLocked}
                  className={`
                    relative flex flex-col items-center p-4 rounded-lg
                    transition-all duration-200 ease-in-out
                    ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}
                    ${isActive ? 'bg-blue-50 ring-2 ring-blue-500' : ''}
                  `}
                >
                  {/* Stage Number & Icon */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    mb-3 transition-transform duration-200
                    ${isActive ? 'bg-blue-100 text-blue-600 transform scale-110' :
                      isCompleted ? 'bg-green-100 text-green-600' :
                      isNext ? 'bg-gray-100 text-gray-600 animate-pulse' :
                      'bg-gray-100 text-gray-400'}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : isLocked ? (
                      <Lock className="w-6 h-6" />
                    ) : (
                      <span className="text-lg font-semibold">{stageNumber}</span>
                    )}
                  </div>

                  {/* Stage Name */}
                  <h4 className={`
                    text-sm font-medium text-center
                    ${isActive ? 'text-blue-600' :
                      isCompleted ? 'text-green-600' :
                      isNext ? 'text-gray-900' :
                      'text-gray-500'}
                  `}>
                    {stage.name}
                  </h4>

                  {/* Status Indicator */}
                  <span className={`
                    text-xs mt-2
                    ${isActive ? 'text-blue-500' :
                      isCompleted ? 'text-green-500' :
                      isNext ? 'text-gray-500' :
                      'text-gray-400'}
                  `}>
                    {isCompleted ? 'Completed' :
                     isActive ? 'In Progress' :
                     isLocked ? 'Locked' :
                     'Available'}
                  </span>

                  {/* Connection Line */}
                  {index < phaseStages.length - 1 && (
                    <div className="absolute right-0 top-1/2 w-full h-0.5 bg-gray-200 -z-10 transform translate-x-1/2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function getPhaseTitle(phaseIndex: number): string {
  switch (phaseIndex) {
    case 0:
      return "Foundation & Identity";
    case 1:
      return "Business Analysis & Value Proposition";
    case 2:
      return "Growth & Implementation";
    default:
      return "Strategy Development";
  }
}