import { supabase } from '../../../lib/supabase';
import { Stage, Program, StageContent, ActivityData } from './types';

// Funciones para programas
export const fetchPrograms = async (): Promise<Program[]> => {
  try {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching programs:', error);
    throw error;
  }
};

// Funciones para etapas
export const fetchStages = async (programId: string): Promise<Stage[]> => {
  try {
    const { data, error } = await supabase
      .from('strategy_stages')
      .select('*')
      .eq('program_id', programId)
      .order('order_num');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching stages:', error);
    throw error;
  }
};

export const createStage = async (stage: Partial<Stage>): Promise<Stage> => {
  try {
    const { data, error } = await supabase
      .from('strategy_stages')
      .insert([stage])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating stage:', error);
    throw error;
  }
};

export const updateStage = async (stage: Stage): Promise<Stage> => {
  try {
    const { data, error } = await supabase
      .from('strategy_stages')
      .update(stage)
      .eq('id', stage.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating stage:', error);
    throw error;
  }
};

export const deleteStage = async (stageId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('strategy_stages')
      .delete()
      .eq('id', stageId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting stage:', error);
    throw error;
  }
};

// Funciones para contenido
export const fetchStageContent = async (stageId: string): Promise<StageContent[]> => {
  try {
    const { data, error } = await supabase
      .from('stage_content')
      .select('*')
      .eq('stage_id', stageId)
      .order('order_num');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching stage content:', error);
    throw error;
  }
};

export const createContent = async (
  content: Partial<StageContent>, 
  activityData?: ActivityData
): Promise<StageContent> => {
  try {
    // Preparar los datos para la inserción
    const contentToInsert = { ...content };
    
    // Si es una actividad, convertir los datos de actividad a JSON
    if (content.content_type === 'activity' && activityData) {
      contentToInsert.activity_data = activityData;
    }
    
    const { data, error } = await supabase
      .from('stage_content')
      .insert([contentToInsert])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating content:', error);
    throw error;
  }
};

export const updateContent = async (
  content: StageContent, 
  activityData?: ActivityData
): Promise<StageContent> => {
  try {
    // Preparar los datos para la actualización
    const contentToUpdate = { ...content };
    
    // Si es una actividad, convertir los datos de actividad a JSON
    if (content.content_type === 'activity' && activityData) {
      contentToUpdate.activity_data = activityData;
    }
    
    try {
      // Intentar actualizar con todos los campos
      const { data, error } = await supabase
        .from('stage_content')
        .update(contentToUpdate)
        .eq('id', content.id)
        .select()
        .single();
      
      if (error) {
        // Si hay un error específico sobre stage_name, intentar sin ese campo
        if (error.message && error.message.includes('stage_name')) {
          console.warn('Error con stage_name, intentando sin este campo');
          
          // Crear una copia sin stage_name
          const { stage_name, ...contentWithoutStageName } = contentToUpdate;
          
          // Intentar de nuevo sin stage_name
          const retryResult = await supabase
            .from('stage_content')
            .update(contentWithoutStageName)
            .eq('id', content.id)
            .select()
            .single();
            
          if (retryResult.error) throw retryResult.error;
          return retryResult.data;
        } else {
          throw error;
        }
      }
      
      return data;
    } catch (innerError) {
      console.error('Error updating content:', innerError);
      throw innerError;
    }
  } catch (error) {
    console.error('Error updating content:', error);
    throw error;
  }
};

export const deleteContent = async (contentId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('stage_content')
      .delete()
      .eq('id', contentId);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting content:', error);
    throw error;
  }
};
