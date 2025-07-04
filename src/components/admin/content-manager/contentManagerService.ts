import { supabase } from '../../../lib/supabase';
import { Stage, Program } from './types';
import { UnifiedContent } from '../../../services/contentRegistryService';

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

// Funciones para la nueva estructura modular de contenidos
/**
 * Obtiene todos los contenidos de un módulo específico, ordenados por posición
 * Esta función implementa el nuevo modelo modular para gestión de contenidos
 * 
 * @param moduleId ID del módulo/etapa
 * @returns Array de contenidos unificados
 */
export const getModuleContents = async (moduleId: string): Promise<UnifiedContent[]> => {
  try {
    console.log(`Obteniendo contenidos del módulo ${moduleId} con la nueva estructura`);
    
    // 1. Obtener todos los registros de program_module_contents para la etapa
    const { data: moduleEntries, error: moduleError } = await supabase
      .from('program_module_contents')
      .select('*')
      .eq('program_module_id', moduleId)
      .order('position');
    
    if (moduleError) {
      console.error('Error al obtener entradas de program_module_contents:', moduleError);
      return [];
    }
    
    if (!moduleEntries || moduleEntries.length === 0) {
      console.log(`No se encontraron contenidos en la nueva estructura para el módulo ${moduleId}`);
      return [];
    }
    
    console.log(`Encontradas ${moduleEntries.length} entradas de contenido en program_module_contents`);
    
    // 2. Por cada content_registry_id, buscar en content_registry
    const results = await Promise.all(
      moduleEntries.map(async (entry) => {
        try {
          // Obtener información del registro de contenido
          const { data: registryEntry, error: registryError } = await supabase
            .from('content_registry')
            .select('*')
            .eq('id', entry.content_registry_id)
            .single();
          
          if (registryError) {
            console.error(`Error al obtener registro de contenido ${entry.content_registry_id}:`, registryError);
            return null;
          }
          
          // 3. Hacer query a la tabla correspondiente para obtener el contenido real
          const { data: contentData, error: contentError } = await supabase
            .from(registryEntry.content_table)
            .select('*')
            .eq('id', registryEntry.content_id)
            .single();
          
          if (contentError) {
            console.error(`Error al obtener contenido de ${registryEntry.content_table}:`, contentError);
            return null;
          }
          
          // 4. Unificar la información
          return {
            id: registryEntry.id,
            title: registryEntry.title || contentData.title || 'Sin título',
            content_type: registryEntry.content_type,
            registry_id: registryEntry.id,
            content_id: registryEntry.content_id,
            content_table: registryEntry.content_table,
            position: entry.position,
            program_module_id: moduleId,
            created_at: registryEntry.created_at,
            updated_at: registryEntry.updated_at,
            // Agregar campos específicos según el tipo de contenido
            ...contentData
          } as UnifiedContent;
        } catch (error) {
          console.error(`Error al procesar entrada de contenido:`, error);
          return null;
        }
      })
    );
    
    // Filtrar posibles nulos y ordenar por posición
    return results
      .filter((content): content is UnifiedContent => content !== null)
      .sort((a, b) => a.position - b.position);
    
  } catch (error) {
    console.error('Error al obtener contenidos del módulo:', error);
    return [];
  }
};
