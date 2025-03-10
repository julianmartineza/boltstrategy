import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Program, Stage, Activity } from '../types';

interface ProgramState {
  currentProgram: Program | null;
  currentStage: Stage | null;
  currentActivity: Activity | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadProgram: (programId: string) => Promise<void>;
  startStage: (stageId: string) => Promise<void>;
  completeStage: (stageId: string) => Promise<void>;
  startActivity: (activityId: string) => Promise<void>;
  completeActivity: (activityId: string, response: any) => Promise<void>;
}

export const useProgramStore = create<ProgramState>((set, get) => ({
  currentProgram: null,
  currentStage: null,
  currentActivity: null,
  loading: false,
  error: null,

  loadProgram: async (programId: string) => {
    set({ loading: true, error: null });
    try {
      // First get the program
      const { data: program, error: programError } = await supabase
        .from('programs')
        .select('*')
        .eq('id', programId)
        .single();

      if (programError) throw programError;

      // Then get the stages for this program with their activities
      const { data: stages, error: stagesError } = await supabase
        .from('strategy_stages')
        .select(`
          *,
          activities!inner (
            id,
            name,
            description,
            status,
            stage_id
          )
        `)
        .eq('program_id', programId)
        .order('order_num', { ascending: true });

      if (stagesError) throw stagesError;

      // Combine program with its stages
      const programWithStages = {
        ...program,
        stages: stages || []
      };

      set({ 
        currentProgram: programWithStages,
        currentStage: stages?.[0] || null,
        error: null
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load program' });
    } finally {
      set({ loading: false });
    }
  },

  startStage: async (stageId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('strategy_stages')
        .update({ status: 'active' })
        .eq('id', stageId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Stage not found');

      // Then get the activities for this stage
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('stage_id', stageId)
        .order('id', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Update the current program's stages
      const currentProgram = get().currentProgram;
      if (currentProgram) {
        const updatedStages = currentProgram.stages.map(s => 
          s.id === stageId ? { ...s, status: 'active', activities: activities || [] } : s
        );
        set({ 
          currentProgram: { ...currentProgram, stages: updatedStages },
          currentStage: { ...data, activities: activities || [] },
          error: null
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to start stage' });
    } finally {
      set({ loading: false });
    }
  },

  startActivity: async (activityId: string) => {
    set({ loading: true, error: null });
    try {
      const currentStage = get().currentStage;
      if (!currentStage) {
        throw new Error('No active stage found');
      }

      // First verify the activity exists and belongs to the current stage
      const { data: activities, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .eq('stage_id', currentStage.id)
        .eq('id', activityId);

      if (fetchError) throw fetchError;

      const activity = activities?.[0];
      if (!activity) {
        throw new Error('Activity not found or does not belong to the current stage');
      }

      // Update the activity status to in_progress
      const { data: updatedActivity, error: updateError } = await supabase
        .from('activities')
        .update({ status: 'in_progress' })
        .eq('id', activityId)
        .eq('stage_id', currentStage.id) // Additional safety check
        .select()
        .single();

      if (updateError) throw updateError;
      if (!updatedActivity) throw new Error('Failed to update activity status');

      // Update the activities list in the current stage
      const updatedStage = {
        ...currentStage,
        activities: currentStage.activities.map(a =>
          a.id === activityId ? updatedActivity : a
        )
      };

      // Update the store
      set({ 
        currentActivity: updatedActivity,
        currentStage: updatedStage,
        error: null
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start activity';
      set({ 
        error: errorMessage,
        currentActivity: null,
        loading: false
      });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  completeActivity: async (activityId: string, response: any) => {
    set({ loading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save activity response
      const { error: responseError } = await supabase
        .from('activity_responses')
        .insert([{
          activity_id: activityId,
          content: response,
          user_id: user.id
        }]);

      if (responseError) throw responseError;

      // Update activity status to completed
      const { data: updatedActivity, error: activityError } = await supabase
        .from('activities')
        .update({ status: 'completed' })
        .eq('id', activityId)
        .select()
        .single();

      if (activityError) throw activityError;
      if (!updatedActivity) throw new Error('Activity not found');

      // Update the current stage's activities
      const currentStage = get().currentStage;
      if (currentStage) {
        const updatedStage = {
          ...currentStage,
          activities: currentStage.activities.map(a =>
            a.id === activityId ? updatedActivity : a
          )
        };
        set({ currentStage: updatedStage });
      }

      set({ currentActivity: null });

      // Check if all activities in stage are completed
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('status')
        .eq('stage_id', currentStage?.id);

      if (activitiesError) throw activitiesError;

      const allCompleted = activities?.every(a => a.status === 'completed');
      if (allCompleted && currentStage) {
        await get().completeStage(currentStage.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete activity';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    } finally {
      set({ loading: false });
    }
  },

  completeStage: async (stageId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('strategy_stages')
        .update({ status: 'completed' })
        .eq('id', stageId)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Stage not found');

      // Update the current program's stages and activate next stage if exists
      const currentProgram = get().currentProgram;
      if (currentProgram) {
        const currentIndex = currentProgram.stages.findIndex(s => s.id === stageId);
        const nextStage = currentProgram.stages[currentIndex + 1];
        
        if (nextStage) {
          await get().startStage(nextStage.id);
        }

        const updatedStages = currentProgram.stages.map(s => 
          s.id === stageId ? { ...s, status: 'completed' } : s
        );
        
        set({ 
          currentProgram: { ...currentProgram, stages: updatedStages },
          currentStage: nextStage || null,
          error: null
        });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to complete stage' });
    } finally {
      set({ loading: false });
    }
  }
}));