import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Program, Stage, Company, Diagnostic } from '../types/index';

// Definimos un tipo para las actividades que vienen de la base de datos
type DBActivity = {
  id: string;
  name: string;
  description: string;
  status: string;
  stage_id: string;
  stage_content_id?: string; // Añadida para compatibilidad con el componente Chat
};

// Definimos un tipo para las etapas que vienen de la base de datos
type DBStage = {
  id: string;
  name: string;
  order_num: number;
  required_content: string;
  prompt_template: string;
  status: string;
  activities?: DBActivity[];
};

interface ProgramState {
  currentProgram: Program | null;
  currentStage: Stage | null;
  currentActivity: DBActivity | null;
  company: Company | null;
  diagnostic: Diagnostic | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadProgram: (programId: string) => Promise<void>;
  startStage: (stageId: string) => Promise<void>;
  completeStage: (stageId: string) => Promise<void>;
  startActivity: (activityId: string) => Promise<void>;
  completeActivity: (activityId: string, response: any) => Promise<void>;
  loadCompanyAndDiagnostic: (userId: string) => Promise<void>;
}

export const useProgramStore = create<ProgramState>((set, get) => ({
  currentProgram: null,
  currentStage: null,
  currentActivity: null,
  company: null,
  diagnostic: null,
  loading: false,
  error: null,

  loadCompanyAndDiagnostic: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      // Fetch company data
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (companyError) {
        console.error('Error fetching company:', companyError);
        set({ loading: false, error: 'Error al cargar la empresa' });
        return;
      }

      if (companies) {
        set({ company: companies });

        // Fetch diagnostic data
        const { data: diagnostics, error: diagnosticError } = await supabase
          .from('diagnostics')
          .select('*')
          .eq('company_id', companies.id)
          .limit(1)
          .single();

        if (diagnosticError) {
          console.error('Error fetching diagnostic:', diagnosticError);
          set({ loading: false, error: 'Error al cargar el diagnóstico' });
          return;
        }

        if (diagnostics) {
          set({ diagnostic: diagnostics });
        }
      }
      
      set({ loading: false });
    } catch (error) {
      console.error('Error in loadCompanyAndDiagnostic:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Error al cargar datos de la empresa' 
      });
    }
  },

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

      // Then get the stages for this program (sin filtrar por actividades)
      const { data: stages, error: stagesError } = await supabase
        .from('strategy_stages')
        .select(`
          *,
          activities (
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

      // Convertir las etapas de la base de datos al tipo Stage
      const typedStages: Stage[] = (stages || []).map((dbStage: DBStage) => ({
        id: dbStage.id,
        name: dbStage.name,
        order_num: dbStage.order_num,
        required_content: dbStage.required_content,
        prompt_template: dbStage.prompt_template,
        status: dbStage.status as 'locked' | 'active' | 'completed',
        content: [] // Inicializamos con un array vacío ya que se cargará después
      }));
      
      // Combine program with stages
      const programWithStages: Program = {
        ...program,
        stages: typedStages
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

      // Verificamos si hay error al obtener la etapa
      const { error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('stage_id', stageId)
        .order('id', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Update the current program's stages
      const currentProgram = get().currentProgram;
      if (currentProgram) {
        const updatedStages = currentProgram.stages.map(s => 
          s.id === stageId ? { ...s, status: 'active' as const } : s
        );
        
        // Crear una versión tipada de la etapa actual
        const typedStage: Stage = {
          id: data.id,
          name: data.name,
          order_num: data.order_num,
          required_content: data.required_content,
          prompt_template: data.prompt_template,
          status: 'active',
          content: []
        };
        
        set({ 
          currentProgram: { ...currentProgram, stages: updatedStages },
          currentStage: typedStage,
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

      // Actualizar la etapa actual
      const updatedStage: Stage = {
        ...currentStage,
        content: currentStage.content
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

      // Actualizar la etapa actual
      const currentStage = get().currentStage;
      if (currentStage) {
        const updatedStage: Stage = {
          ...currentStage,
          content: currentStage.content
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

      const allCompleted = activities?.every(activity => activity.status === 'completed');
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
          s.id === stageId ? { ...s, status: 'completed' as const } : s
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