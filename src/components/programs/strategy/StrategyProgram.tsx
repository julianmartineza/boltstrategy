import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProgramStore } from '../../../store/programStore';
import StrategyProgress from './StrategyProgress';
import ActivityView from './ActivityView';
import StageContent from './StageContent';
import { supabase } from '../../../lib/supabase';
import type { Database } from '../../../lib/database.types';
import { AlertCircle } from 'lucide-react';

type StageContent = Database['public']['Tables']['stage_content']['Row'];

export default function StrategyProgram() {
  const { 
    currentProgram, 
    currentStage,
    currentActivity,
    loading,
    error,
    loadProgram,
    startStage,
    startActivity 
  } = useProgramStore();

  const [stageContent, setStageContent] = React.useState<StageContent[]>([]);
  const [loadingContent, setLoadingContent] = React.useState(false);
  const [startingActivity, setStartingActivity] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  useEffect(() => {
    const initializeProgram = async () => {
      const { data: programs, error } = await supabase
        .from('programs')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading program:', error);
        setLocalError('Failed to load program');
        return;
      }

      if (programs) {
        try {
          await loadProgram(programs.id);
          setLocalError(null);
        } catch (error) {
          console.error('Error initializing program:', error);
          setLocalError('Failed to initialize program');
        }
      }
    };

    initializeProgram();
  }, [loadProgram]);

  useEffect(() => {
    const loadStageContent = async () => {
      if (!currentStage) return;

      setLoadingContent(true);
      try {
        const { data, error } = await supabase
          .from('stage_content')
          .select('*')
          .eq('stage_id', currentStage.id)
          .order('order_num');

        if (error) throw error;
        setStageContent(data || []);
        setLocalError(null);
      } catch (error) {
        console.error('Error loading stage content:', error);
        setLocalError('Failed to load stage content');
      } finally {
        setLoadingContent(false);
      }
    };

    loadStageContent();
  }, [currentStage]);

  const handleStartActivity = async () => {
    if (!currentStage?.activities?.[0]) {
      setLocalError('No activity available to start');
      return;
    }

    setStartingActivity(true);
    setLocalError(null);
    try {
      await startActivity(currentStage.activities[0].id);
    } catch (error) {
      console.error('Error starting activity:', error);
      setLocalError(error instanceof Error ? error.message : 'Failed to start activity');
    } finally {
      setStartingActivity(false);
    }
  };

  if (loading || loadingContent) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  const displayError = error || localError;
  if (displayError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg flex items-center space-x-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <p className="text-red-700">{displayError}</p>
      </div>
    );
  }

  if (!currentProgram) {
    return (
      <div className="p-4">
        No program found. Please try refreshing the page.
      </div>
    );
  }

  // Calculate current phase
  const currentPhase = currentStage 
    ? Math.floor(currentProgram.stages.findIndex(s => s.id === currentStage.id) / 4)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Progress Overview */}
      <StrategyProgress 
        stages={currentProgram.stages}
        currentPhase={currentPhase}
        currentStage={currentStage}
      />

      {/* Main Content Area */}
      {currentStage && (
        <div className="mt-8">
          {/* Stage Content */}
          <StageContent content={stageContent} />

          {/* Activity View */}
          {currentActivity && (
            <div className="mt-8 h-[600px]">
              <ActivityView 
                activity={currentActivity}
                stage={currentStage}
              />
            </div>
          )}

          {/* Start Activity Button */}
          {!currentActivity && currentStage.activities?.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleStartActivity}
                disabled={startingActivity}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startingActivity ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Starting Activity...
                  </>
                ) : (
                  'Start Activity'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}