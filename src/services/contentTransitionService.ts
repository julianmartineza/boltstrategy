import { supabase } from '../lib/supabase';
import { StageContent, ActivityData } from '../components/admin/content-manager/types';
import * as contentManagerService from '../components/admin/content-manager/contentManagerService';
import * as contentRegistryService from './contentRegistryService';

/**
 * Servicio de transición para trabajar con ambas estructuras de contenido
 * Este servicio permite una migración progresiva de la estructura antigua a la nueva
 */

/**
 * Obtiene contenidos de un módulo utilizando la nueva estructura modular
 * Si no hay contenidos en la nueva estructura, cae en la estructura antigua
 * 
 * @param stageId ID de la etapa/módulo
 * @returns Array de contenidos unificados
 */
export const getModuleContentsWithFallback = async (stageId: string) => {
  try {
    // Intentar obtener contenidos con la nueva estructura
    const newStructureContents = await contentRegistryService.getModuleContents(stageId);
    
    // Si hay contenidos en la nueva estructura, devolverlos
    if (newStructureContents && newStructureContents.length > 0) {
      console.log('Contenidos obtenidos de la nueva estructura modular');
      return newStructureContents;
    }
    
    // Si no hay contenidos en la nueva estructura, obtener de la estructura antigua
    console.log('No se encontraron contenidos en la nueva estructura, utilizando fallback');
    const oldStructureContents = await contentManagerService.fetchStageContent(stageId);
    
    // Convertir los contenidos de la estructura antigua al formato unificado
    return oldStructureContents.map(content => ({
      id: content.id,
      title: content.title,
      content_type: content.content_type,
      position: content.order_num || 0,
      registry_id: '', // No existe en la estructura antigua
      content_id: content.id,
      content_table: 'stage_content',
      // Campos específicos según el tipo
      content: content.content_type !== 'video' ? content.content : undefined,
      url: content.content_type === 'video' ? content.content : undefined,
      // Campos de actividad
      activity_data: content.activity_data,
      prompt_section: content.prompt_section,
      system_instructions: content.system_instructions,
      // Metadatos
      created_at: content.created_at,
      updated_at: content.updated_at
    }));
    
  } catch (error) {
    console.error('Error al obtener contenidos con fallback:', error);
    throw error;
  }
};

/**
 * Crea un nuevo contenido utilizando la estructura adecuada según el tipo
 * 
 * @param content Datos del contenido a crear
 * @param activityData Datos específicos para actividades
 * @returns El contenido creado
 */
export const createContentWithNewStructure = async (
  content: Partial<StageContent>,
  activityData?: ActivityData
) => {
  try {
    if (!content.stage_id) {
      throw new Error('Se requiere stage_id para crear contenido');
    }
    
    // Obtener la posición para el nuevo contenido
    const existingContents = await getModuleContentsWithFallback(content.stage_id);
    const position = existingContents.length;
    
    // Crear el contenido según su tipo
    switch (content.content_type) {
      case 'text':
        if (!content.title || !content.content) {
          throw new Error('Se requiere título y contenido para crear contenido de texto');
        }
        
        // Crear el contenido de texto en la nueva estructura
        const textRegistryId = await contentRegistryService.createTextContent(
          content.stage_id,
          content.title,
          content.content,
          position,
          'markdown' // Formato por defecto
        );
        
        if (textRegistryId === null) {
          throw new Error('Error al crear contenido de texto');
        }
        
        // Obtener el contenido creado
        const newTextContent = await contentRegistryService.getModuleContents(content.stage_id);
        const createdTextContent = newTextContent.find(c => c.registry_id === textRegistryId);
        return createdTextContent ? { ...createdTextContent, registry_id: textRegistryId } : null;
        
      case 'video':
        if (!content.title || !content.url) {
          throw new Error('Se requiere título y URL para crear contenido de video');
        }
        
        console.log('Creando contenido de video en contentTransitionService:', {
          stage_id: content.stage_id,
          title: content.title,
          url: content.url,
          provider: content.provider || 'youtube'
        });
        
        // Crear el contenido de video en la nueva estructura
        const videoRegistryId = await contentRegistryService.createVideoContent(
          content.stage_id,
          content.title,
          content.url, // URL del video
          content.provider || 'youtube', // Proveedor por defecto
          position
        );
        
        if (videoRegistryId === null) {
          throw new Error('Error al crear contenido de video');
        }
        
        // Obtener el contenido creado
        const newVideoContent = await contentRegistryService.getModuleContents(content.stage_id);
        const createdVideoContent = newVideoContent.find(c => c.registry_id === videoRegistryId);
        return createdVideoContent ? { ...createdVideoContent, registry_id: videoRegistryId, url: content.url } : null;
        
      case 'activity':
        // Para actividades, seguimos usando la estructura antigua
        // pero la registramos en la nueva estructura
        const createdActivity = await contentManagerService.createContent(content, activityData);
        
        // Registrar la actividad en la nueva estructura
        await contentRegistryService.registerExistingActivity(
          createdActivity.title,
          createdActivity.id,
          createdActivity.stage_id,
          position
        );
        
        return {
          id: createdActivity.id,
          title: createdActivity.title,
          content_type: 'activity',
          position: position,
          registry_id: '', // Se actualiza después
          content_id: createdActivity.id,
          content_table: 'stage_content',
          content: createdActivity.content,
          activity_data: createdActivity.activity_data,
          prompt_section: createdActivity.prompt_section,
          system_instructions: createdActivity.system_instructions,
          created_at: createdActivity.created_at,
          updated_at: createdActivity.updated_at
        };
        
      default:
        throw new Error(`Tipo de contenido no soportado: ${content.content_type}`);
    }
    
  } catch (error) {
    console.error('Error al crear contenido con nueva estructura:', error);
    throw error;
  }
};

/**
 * Actualiza un contenido existente utilizando la estructura adecuada
 * 
 * @param content Datos del contenido a actualizar
 * @param activityData Datos específicos para actividades
 * @returns El contenido actualizado
 */
export const updateContentWithNewStructure = async (
  content: StageContent,
  activityData?: ActivityData
) => {
  try {
    // Para actividades, seguimos usando la estructura antigua
    if (content.content_type === 'activity') {
      return await contentManagerService.updateContent(content, activityData);
    }
    
    // Para otros tipos, necesitamos identificar si está en la nueva estructura
    // o en la antigua, y actualizar en consecuencia
    
    // Primero intentamos encontrar el registro en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('content_id', content.id)
      .maybeSingle();
    
    if (registryError && registryError.code !== 'PGRST116') {
      throw registryError;
    }
    
    if (registryData) {
      // El contenido está en la nueva estructura
      if (content.content_type === 'text') {
        // Actualizar contenido de texto
        const { error: textError } = await supabase
          .from('text_contents')
          .update({ 
            content: content.content
          })
          .eq('id', content.id);
        
        if (textError) throw textError;
        
        // Actualizar el registro
        const { error: updateError } = await supabase
          .from('content_registry')
          .update({ 
            title: content.title,
            updated_at: new Date().toISOString()
          })
          .eq('id', registryData.id);
        
        if (updateError) throw updateError;
        
      } else if (content.content_type === 'video') {
        // Actualizar contenido de video
        const { error: videoError } = await supabase
          .from('video_contents')
          .update({ 
            url: content.url
          })
          .eq('id', content.id);
        
        if (videoError) throw videoError;
        
        // Actualizar el registro
        const { error: updateError } = await supabase
          .from('content_registry')
          .update({ 
            title: content.title,
            updated_at: new Date().toISOString()
          })
          .eq('id', registryData.id);
        
        if (updateError) throw updateError;
      }
      
      // Devolver el contenido actualizado
      if (content.stage_id) {
        const updatedContents = await contentRegistryService.getModuleContents(content.stage_id);
        const updatedContent = updatedContents.find(c => c.content_id === content.id);
        if (updatedContent) return updatedContent;
      }
      
    } else {
      // El contenido está en la estructura antigua
      return await contentManagerService.updateContent(content, activityData);
    }
    
    // Si llegamos aquí, devolvemos el contenido original como fallback
    return content;
    
  } catch (error) {
    console.error('Error al actualizar contenido con nueva estructura:', error);
    throw error;
  }
};

/**
 * Elimina un contenido utilizando la estructura adecuada
 * 
 * @param contentId ID del contenido a eliminar
 * @returns Verdadero si la eliminación fue exitosa
 */
export const deleteContentWithNewStructure = async (contentId: string): Promise<boolean> => {
  try {
    // Primero intentamos encontrar el registro en content_registry por content_id
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('content_id', contentId)
      .maybeSingle();
    
    if (registryError && registryError.code !== 'PGRST116') {
      throw registryError;
    }
    
    if (registryData) {
      // El contenido está en la nueva estructura
      return await contentRegistryService.deleteContent(registryData.id);
    } else {
      // El contenido está en la estructura antigua
      await contentManagerService.deleteContent(contentId);
      return true;
    }
    
  } catch (error) {
    console.error('Error al eliminar contenido con nueva estructura:', error);
    return false;
  }
};
