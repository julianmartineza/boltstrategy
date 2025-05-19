import { supabase } from '../lib/supabase';
import { ActivityContent, ActivityData } from '../types/index';
import * as contentRegistryService from './contentRegistryService';

/**
 * Servicio de transición para trabajar con la estructura modular moderna
 * Este servicio permite una migración total a la nueva estructura
 */

/**
 * Obtiene contenidos de un módulo utilizando la estructura modular moderna
 * 
 * @param stageId ID de la etapa/módulo
 * @returns Array de contenidos unificados
 */
export const getModuleContents = async (stageId: string) => {
  try {
    // Obtener contenidos con la estructura modular moderna
    const newStructureContents = await contentRegistryService.getModuleContents(stageId);
    
    // Solo se usa la nueva estructura modular. Eliminado el fallback a la estructura antigua (stage_content).
    if (newStructureContents && newStructureContents.length > 0) {
      // Solo mostrar el log en entorno de desarrollo
      if (import.meta.env.DEV) {
        console.log('Contenidos obtenidos de la nueva estructura modular');
      }
      return newStructureContents;
    }
    // Si no hay contenidos, retornar arreglo vacío
    return [];
  } catch (error) {
    console.error('Error al obtener contenidos:', error);
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
export const createContent = async (
  content: Partial<ActivityContent>,
  activityData?: ActivityData
) => {
  try {
    if (!content.stage_id) {
      throw new Error('Se requiere stage_id para crear contenido');
    }
    
    // Obtener la posición para el nuevo contenido
    const existingContents = await getModuleContents(content.stage_id);
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
        // Permitir la URL tanto en content.url como en content.content
        const videoUrl = content.url || content.content;
        if (!content.title || !videoUrl) {
          throw new Error('Se requiere título y URL para crear contenido de video');
        }
        
        console.log('Creando contenido de video en contentTransitionService:', {
          stage_id: content.stage_id,
          title: content.title,
          url: videoUrl,
          provider: content.provider || 'youtube'
        });
        
        // Crear el contenido de video en la nueva estructura
        const videoRegistryId = await contentRegistryService.createVideoContent(
          content.stage_id,
          content.title,
          videoUrl, // Usar la URL de cualquiera de los dos campos
          content.provider || 'youtube', // Proveedor por defecto
          position
        );
        
        if (videoRegistryId === null) {
          throw new Error('Error al crear contenido de video');
        }
        
        // Obtener el contenido creado
        const newVideoContent = await contentRegistryService.getModuleContents(content.stage_id);
        const createdVideoContent = newVideoContent.find(c => c.registry_id === videoRegistryId);
        return createdVideoContent ? { ...createdVideoContent, registry_id: videoRegistryId } : null;
        
      case 'advisory_session':
        if (!content.title) {
          throw new Error('Se requiere título para crear una sesión de asesoría');
        }
        
        console.log('Creando sesión de asesoría en contentTransitionService:', {
          stage_id: content.stage_id,
          title: content.title,
          description: content.content || '',
          duration: content.duration
        });
        
        // Crear la sesión de asesoría en la nueva estructura
        const advisoryRegistryId = await contentRegistryService.createAdvisorySession(
          content.stage_id,
          content.title,
          content.content || '', // Descripción (opcional)
          position,
          content.duration // Duración (opcional)
        );
        
        if (advisoryRegistryId === null) {
          throw new Error('Error al crear sesión de asesoría');
        }
        
        // Obtener el contenido creado
        const newAdvisoryContent = await contentRegistryService.getModuleContents(content.stage_id);
        const createdAdvisoryContent = newAdvisoryContent.find(c => c.registry_id === advisoryRegistryId);
        return createdAdvisoryContent ? { ...createdAdvisoryContent, registry_id: advisoryRegistryId } : null;
        
      case 'activity':
        // Para actividades, seguimos usando la estructura modular moderna
        if (!content.title) {
          throw new Error('Se requiere título para crear una actividad');
        }
        
        // Preparar los datos de la actividad
        let finalActivityData: ActivityData = activityData || {
          prompt: '',
          initial_message: '',
          system_instructions: '',
          max_exchanges: 5,
          step: 1,
          prompt_section: '',
          dependencies: []
        };
        
        // Si no se proporcionó activityData pero hay datos en content.content, intentamos usarlo
        if (Object.keys(finalActivityData).length === 0 && content.content) {
          try {
            // Intentar parsear el contenido como JSON si es una cadena
            if (typeof content.content === 'string' && content.content.trim().startsWith('{')) {
              finalActivityData = JSON.parse(content.content);
            } else {
              finalActivityData.prompt = typeof content.content === 'string' ? content.content : '';
            }
          } catch (e) {
            // Si no es JSON válido, lo usamos como prompt
            finalActivityData.prompt = typeof content.content === 'string' ? content.content : '';
          }
        }
        
        // Asegurarnos de que los campos importantes estén presentes en activityData
        if (content.prompt_section) {
          finalActivityData.prompt_section = content.prompt_section;
        }
        
        if (content.system_instructions) {
          finalActivityData.system_instructions = content.system_instructions;
        }
        
        // Asegurarnos de que las dependencias se pasen correctamente
        if (content.dependencies) {
          finalActivityData.dependencies = content.dependencies;
        }
        
        console.log('Creando actividad en contentTransitionService:', {
          stage_id: content.stage_id,
          title: content.title,
          prompt_section: content.prompt_section || finalActivityData.prompt_section,
          system_instructions: content.system_instructions || finalActivityData.system_instructions,
          step: finalActivityData.step || 1,
          dependencies: content.dependencies || finalActivityData.dependencies || [],
          activityData: finalActivityData
        });
        
        // Crear el contenido de actividad en la nueva estructura
        const activityContentId = await contentRegistryService.createActivityContent(
          content.stage_id,
          content.title,
          finalActivityData,
          position,
          content.prompt_section || finalActivityData.prompt_section,
          content.system_instructions || finalActivityData.system_instructions
        );
        
        if (activityContentId) {
          console.log('Actividad creada con estructura modular, ID:', activityContentId);
          return activityContentId;
        } else {
          throw new Error('Error al crear actividad');
        }
        
      default:
        throw new Error(`Tipo de contenido no soportado: ${content.content_type}`);
    }
    
  } catch (error) {
    console.error('Error al crear contenido:', error);
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
export const updateContent = async (
  content: ActivityContent,
  activityData?: ActivityData
) => {
  try {
    // Para actividades, primero intentamos buscar directamente en activity_contents
    if (content.content_type === 'activity') {
      console.log(`Actualizando actividad con ID: ${content.id}`);
      
      // Buscar directamente en activity_contents
      const { data: activityContent, error: findError } = await supabase
        .from('activity_contents')
        .select('*')
        .eq('id', content.id)
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        console.error('Error al buscar actividad por ID:', findError);
      }
      
      // Si encontramos la actividad directamente, la actualizamos
      if (activityContent) {
        console.log(`✅ Actividad encontrada directamente: ${activityContent.id}`);
        
        // Preparar los datos de la actividad
        let finalActivityData: ActivityData = activityData || {
          prompt: '',
          initial_message: '',
          system_instructions: '',
          max_exchanges: 5,
          step: 1,
          prompt_section: '',
          dependencies: []
        };
        
        // Si activityData está vacío pero hay datos en content.activity_data, usamos esos
        if (Object.keys(finalActivityData).length === 0 && content.activity_data) {
          try {
            finalActivityData = typeof content.activity_data === 'string' 
              ? JSON.parse(content.activity_data) 
              : content.activity_data;
            
            console.log('Datos de actividad extraídos de content.activity_data:', finalActivityData);
          } catch (error) {
            console.error('Error al parsear activity_data:', error);
          }
        }
        
        // Si hay datos en activityContent.activity_data y no tenemos datos completos, los usamos como base
        if (activityContent.activity_data && Object.keys(finalActivityData).length === 0) {
          try {
            const existingData = typeof activityContent.activity_data === 'string'
              ? JSON.parse(activityContent.activity_data)
              : activityContent.activity_data;
            
            finalActivityData = {
              ...existingData,
              ...finalActivityData
            };
            
            console.log('Datos existentes de actividad incorporados:', finalActivityData);
          } catch (error) {
            console.error('Error al parsear datos existentes:', error);
          }
        }
        
        // Asegurarnos de que los campos importantes estén presentes
        if (content.prompt_section) {
          finalActivityData.prompt_section = content.prompt_section;
        }
        
        if (content.system_instructions) {
          finalActivityData.system_instructions = content.system_instructions;
        }
        
        // Asegurarnos de que las dependencias se pasen correctamente
        if (content.dependencies) {
          finalActivityData.dependencies = content.dependencies;
        }
        
        // Asegurarnos de que todos los campos requeridos estén presentes
        finalActivityData = {
          ...finalActivityData,
          prompt: finalActivityData.prompt || '',
          initial_message: finalActivityData.initial_message || '',
          system_instructions: finalActivityData.system_instructions || '',
          max_exchanges: finalActivityData.max_exchanges || 5,
          step: finalActivityData.step || 1,
          prompt_section: finalActivityData.prompt_section || '',
          dependencies: finalActivityData.dependencies || []
        };
        
        // Actualizar directamente en activity_contents
        const { error: updateError } = await supabase
          .from('activity_contents')
          .update({
            title: content.title,
            activity_data: finalActivityData,
            prompt_section: finalActivityData.prompt_section,
            system_instructions: finalActivityData.system_instructions,
            dependencies: finalActivityData.dependencies,
            stage_id: content.stage_id || activityContent.stage_id
          })
          .eq('id', content.id);
        
        if (updateError) {
          console.error('Error al actualizar actividad:', updateError);
          throw new Error(`Error al actualizar actividad: ${updateError.message}`);
        }
        
        // Verificar si existe un registro en content_registry
        const { data: existingRegistry, error: registryCheckError } = await supabase
          .from('content_registry')
          .select('*')
          .eq('content_id', content.id)
          .eq('content_type', 'activity')
          .maybeSingle();
        
        if (registryCheckError && registryCheckError.code !== 'PGRST116') {
          console.error('Error al verificar registro existente:', registryCheckError);
        }
        
        // Si no existe registro, lo creamos
        if (!existingRegistry) {
          console.log('Creando registro en content_registry para actividad existente');
          
          const { data: newRegistry, error: createError } = await supabase
            .from('content_registry')
            .insert({
              content_id: content.id,
              content_table: 'activity_contents',
              content_type: 'activity',
              title: content.title,
              stage_id: content.stage_id || activityContent.stage_id,
              status: 'active'
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error al crear registro:', createError);
          } else {
            console.log('✅ Registro creado correctamente:', newRegistry);
          }
        } else {
          // Actualizar el registro existente
          const { error: updateRegistryError } = await supabase
            .from('content_registry')
            .update({ 
              title: content.title
            })
            .eq('id', existingRegistry.id);
          
          if (updateRegistryError) {
            console.error('Error al actualizar registro:', updateRegistryError);
          }
        }
        
        console.log('✅ Actividad actualizada correctamente');
        return content;
      } else {
        // Si no encontramos la actividad directamente, intentamos usar el servicio de registro
        console.log('No se encontró la actividad directamente, intentando con contentRegistryService...');
        
        // Verificar que stage_id no sea undefined
        if (!content.stage_id) {
          console.error('Error: stage_id es undefined, no se puede actualizar la actividad');
          throw new Error('stage_id es requerido para actualizar la actividad');
        }
        
        // Preparar los datos de la actividad
        let finalActivityData: ActivityData = activityData || {
          prompt: '',
          initial_message: '',
          system_instructions: '',
          max_exchanges: 5,
          step: 1,
          prompt_section: '',
          dependencies: []
        };
        
        // Si activityData está vacío pero hay datos en content.activity_data, usamos esos
        if (Object.keys(finalActivityData).length === 0 && content.activity_data) {
          try {
            finalActivityData = typeof content.activity_data === 'string' 
              ? JSON.parse(content.activity_data) 
              : content.activity_data;
            
            console.log('Datos de actividad extraídos de content.activity_data:', finalActivityData);
          } catch (error) {
            console.error('Error al parsear activity_data:', error);
          }
        }
        
        // Asegurarnos de que los campos importantes estén presentes
        if (content.prompt_section) {
          finalActivityData.prompt_section = content.prompt_section;
        }
        
        if (content.system_instructions) {
          finalActivityData.system_instructions = content.system_instructions;
        }
        
        // Asegurarnos de que las dependencias se pasen correctamente
        if (content.dependencies) {
          finalActivityData.dependencies = content.dependencies;
        }
        
        // Asegurarnos de que todos los campos requeridos estén presentes
        finalActivityData = {
          ...finalActivityData,
          prompt: finalActivityData.prompt || '',
          initial_message: finalActivityData.initial_message || '',
          system_instructions: finalActivityData.system_instructions || '',
          max_exchanges: finalActivityData.max_exchanges || 5,
          step: finalActivityData.step || 1,
          prompt_section: finalActivityData.prompt_section || '',
          dependencies: finalActivityData.dependencies || []
        };
        
        console.log('Actualizando actividad con datos completos:', {
          stage_id: content.stage_id,
          title: content.title,
          activityData: finalActivityData,
          prompt_section: finalActivityData.prompt_section,
          system_instructions: finalActivityData.system_instructions,
          dependencies: finalActivityData.dependencies
        });
        
        // Actualizar el contenido de actividad usando el servicio de registro
        const activityContent = await contentRegistryService.updateActivityContent(
          content.stage_id,
          content.title,
          finalActivityData,
          finalActivityData.prompt_section,
          finalActivityData.system_instructions
        );
        
        if (activityContent) {
          console.log('Actividad actualizada con estructura modular:', activityContent);
          return activityContent;
        } else {
          throw new Error('Error al actualizar actividad');
        }
      }
    }
    
    // Para videos, buscamos directamente en video_contents
    if (content.content_type === 'video') {
      console.log(`Actualizando video con ID: ${content.id}`);
      
      // Buscar directamente en video_contents
      const { data: videoContent, error: findError } = await supabase
        .from('video_contents')
        .select('*')
        .eq('id', content.id)
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        console.error('Error al buscar video por ID:', findError);
      }
      
      // Si encontramos el video directamente, lo actualizamos
      if (videoContent) {
        console.log(`✅ Video encontrado directamente: ${videoContent.id}`);
        
        // Actualizar contenido de video
        const { error: videoError } = await supabase
          .from('video_contents')
          .update({ 
            title: content.title,
            video_url: content.url || content.content,
            source: content.provider || 'youtube'
          })
          .eq('id', content.id);
        
        if (videoError) {
          console.error('Error al actualizar video:', videoError);
          throw new Error(`Error al actualizar video: ${videoError.message}`);
        }
        
        // Verificar si existe un registro en content_registry
        const { data: existingRegistry, error: registryCheckError } = await supabase
          .from('content_registry')
          .select('*')
          .eq('content_id', content.id)
          .eq('content_type', 'video')
          .maybeSingle();
        
        if (registryCheckError && registryCheckError.code !== 'PGRST116') {
          console.error('Error al verificar registro existente:', registryCheckError);
        }
        
        // Si no existe registro, lo creamos
        if (!existingRegistry) {
          console.log('Creando registro en content_registry para video existente');
          
          const { data: newRegistry, error: createError } = await supabase
            .from('content_registry')
            .insert({
              content_id: content.id,
              content_table: 'video_contents',
              content_type: 'video',
              title: content.title,
              stage_id: content.stage_id,
              status: 'active'
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error al crear registro:', createError);
          } else {
            console.log('✅ Registro creado correctamente:', newRegistry);
          }
        } else {
          // Actualizar el registro existente
          const { error: updateRegistryError } = await supabase
            .from('content_registry')
            .update({ 
              title: content.title
            })
            .eq('id', existingRegistry.id);
          
          if (updateRegistryError) {
            console.error('Error al actualizar registro:', updateRegistryError);
          }
        }
        
        console.log('✅ Video actualizado correctamente');
        return content;
      }
    }
    
    // Para texto, buscamos directamente en text_contents
    if (content.content_type === 'text') {
      console.log(`Actualizando texto con ID: ${content.id}`);
      
      // Buscar directamente en text_contents
      const { data: textContent, error: findError } = await supabase
        .from('text_contents')
        .select('*')
        .eq('id', content.id)
        .maybeSingle();
      
      if (findError && findError.code !== 'PGRST116') {
        console.error('Error al buscar texto por ID:', findError);
      }
      
      // Si encontramos el texto directamente, lo actualizamos
      if (textContent) {
        console.log(`✅ Texto encontrado directamente: ${textContent.id}`);
        
        // Actualizar contenido de texto
        const { error: textError } = await supabase
          .from('text_contents')
          .update({ 
            title: content.title,
            content: content.content
          })
          .eq('id', content.id);
        
        if (textError) {
          console.error('Error al actualizar texto:', textError);
          throw new Error(`Error al actualizar texto: ${textError.message}`);
        }
        
        // Verificar si existe un registro en content_registry
        const { data: existingRegistry, error: registryCheckError } = await supabase
          .from('content_registry')
          .select('*')
          .eq('content_id', content.id)
          .eq('content_type', 'text')
          .maybeSingle();
        
        if (registryCheckError && registryCheckError.code !== 'PGRST116') {
          console.error('Error al verificar registro existente:', registryCheckError);
        }
        
        // Si no existe registro, lo creamos
        if (!existingRegistry) {
          console.log('Creando registro en content_registry para texto existente');
          
          const { data: newRegistry, error: createError } = await supabase
            .from('content_registry')
            .insert({
              content_id: content.id,
              content_table: 'text_contents',
              content_type: 'text',
              title: content.title,
              stage_id: content.stage_id,
              status: 'active'
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error al crear registro:', createError);
          } else {
            console.log('✅ Registro creado correctamente:', newRegistry);
          }
        } else {
          // Actualizar el registro existente
          const { error: updateRegistryError } = await supabase
            .from('content_registry')
            .update({ 
              title: content.title
            })
            .eq('id', existingRegistry.id);
          
          if (updateRegistryError) {
            console.error('Error al actualizar registro:', updateRegistryError);
          }
        }
        
        console.log('✅ Texto actualizado correctamente');
        return content;
      }
    }
    
    // Si llegamos aquí, intentamos el método tradicional con content_registry
    console.log('Intentando actualizar contenido usando content_registry...');
    
    // Buscar en content_registry
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
            title: content.title
          })
          .eq('id', registryData.id);
        
        if (updateError) throw updateError;
        
        return content;
      } else if (content.content_type === 'video') {
        // Actualizar contenido de video
        const { error: videoError } = await supabase
          .from('video_contents')
          .update({ 
            video_url: content.url || content.content,
            source: content.provider || 'youtube'
          })
          .eq('id', content.id);
        
        if (videoError) throw videoError;
        
        // Actualizar el registro
        const { error: updateError } = await supabase
          .from('content_registry')
          .update({ 
            title: content.title
          })
          .eq('id', registryData.id);
        
        if (updateError) throw updateError;
        
        return content;
      } else if (content.content_type === 'advisory_session') {
        // Verificar si tenemos el ID del registro en content_metadata
        if (!content.content_metadata?.content_registry_id) {
          throw new Error('No se encontró el ID del registro para actualizar la sesión de asesoría');
        }
        
        console.log('Actualizando sesión de asesoría con ID de registro:', content.content_metadata.content_registry_id);
        
        // Obtener el ID del contenido específico
        const { data: registryData, error: registryError } = await supabase
          .from('content_registry')
          .select('content_id')
          .eq('id', content.content_metadata.content_registry_id)
          .single();
        
        if (registryError) {
          throw new Error(`Error al obtener el ID del contenido específico: ${registryError.message}`);
        }
        
        console.log('ID del contenido específico:', registryData.content_id);
        
        // Preparar los datos para la actualización
        const updateData: any = { 
          title: content.title,
          description: content.content || ''
        };
        
        // Agregar duración si está presente
        if (content.duration !== undefined) {
          updateData.duration = content.duration;
        } else if (content.content_metadata?.duration !== undefined) {
          updateData.duration = content.content_metadata.duration;
        }
        
        console.log('Datos para actualizar la sesión de asesoría:', updateData);
        
        // Actualizar la sesión de asesoría
        const { error: advisoryError } = await supabase
          .from('advisory_sessions')
          .update(updateData)
          .eq('id', registryData.content_id);
        
        if (advisoryError) {
          throw new Error(`Error al actualizar la sesión de asesoría: ${advisoryError.message}`);
        }
        
        // Actualizar el registro
        const { error: updateError } = await supabase
          .from('content_registry')
          .update({ 
            title: content.title
          })
          .eq('id', content.content_metadata.content_registry_id);
        
        if (updateError) {
          throw new Error(`Error al actualizar el registro: ${updateError.message}`);
        }
        
        return content;
      }
      
      // Si llegamos aquí, devolvemos el contenido original como fallback
      return content;
    } else {
      // El contenido no está en content_registry, necesitamos buscarlo directamente en las tablas específicas
      console.log(`Contenido no encontrado en content_registry por ID: ${content.id}. Buscando directamente en tablas específicas...`);
      
      // Actualizar según el tipo de contenido
      if (content.content_type === 'text') {
        // Buscar directamente en text_contents
        const { data: textContent, error: findError } = await supabase
          .from('text_contents')
          .select('*')
          .eq('id', content.id)
          .maybeSingle();
        
        if (findError && findError.code !== 'PGRST116') {
          console.error('Error al buscar texto por ID:', findError);
        }
        
        if (textContent) {
          console.log(`✅ Contenido de texto encontrado directamente: ${textContent.id}`);
          
          // Actualizar contenido de texto
          const { error: textError } = await supabase
            .from('text_contents')
            .update({ 
              title: content.title,
              content: content.content
            })
            .eq('id', content.id);
          
          if (textError) throw textError;
          
          // Verificar si existe un registro en content_registry
          const { data: existingRegistry, error: registryCheckError } = await supabase
            .from('content_registry')
            .select('*')
            .eq('content_id', content.id)
            .eq('content_type', 'text')
            .maybeSingle();
          
          if (registryCheckError && registryCheckError.code !== 'PGRST116') {
            console.error('Error al verificar registro existente:', registryCheckError);
          }
          
          // Si no existe registro, lo creamos
          if (!existingRegistry) {
            console.log('Creando registro en content_registry para contenido de texto existente');
            
            const { data: newRegistry, error: createError } = await supabase
              .from('content_registry')
              .insert({
                content_id: content.id,
                content_table: 'text_contents',
                content_type: 'text',
                title: content.title,
                stage_id: content.stage_id,
                status: 'active'
              })
              .select()
              .single();
            
            if (createError) {
              console.error('Error al crear registro:', createError);
            } else {
              console.log('✅ Registro creado correctamente:', newRegistry);
            }
          } else {
            // Actualizar el registro existente
            const { error: updateRegistryError } = await supabase
              .from('content_registry')
              .update({ 
                title: content.title
              })
              .eq('id', existingRegistry.id);
            
            if (updateRegistryError) {
              console.error('Error al actualizar registro:', updateRegistryError);
            }
          }
          
          return content;
        }
      } else if (content.content_type === 'video') {
        // Buscar directamente en video_contents
        const { data: videoContent, error: findError } = await supabase
          .from('video_contents')
          .select('*')
          .eq('id', content.id)
          .maybeSingle();
        
        if (findError && findError.code !== 'PGRST116') {
          console.error('Error al buscar video por ID:', findError);
        }
        
        if (videoContent) {
          console.log(`✅ Contenido de video encontrado directamente: ${videoContent.id}`);
          
          // Actualizar contenido de video
          const { error: videoError } = await supabase
            .from('video_contents')
            .update({ 
              title: content.title,
              video_url: content.url || content.content,
              source: content.provider || 'youtube'
            })
            .eq('id', content.id);
          
          if (videoError) throw videoError;
          
          // Verificar si existe un registro en content_registry
          const { data: existingRegistry, error: registryCheckError } = await supabase
            .from('content_registry')
            .select('*')
            .eq('content_id', content.id)
            .eq('content_type', 'video')
            .maybeSingle();
          
          if (registryCheckError && registryCheckError.code !== 'PGRST116') {
            console.error('Error al verificar registro existente:', registryCheckError);
          }
          
          // Si no existe registro, lo creamos
          if (!existingRegistry) {
            console.log('Creando registro en content_registry para contenido de video existente');
            
            const { data: newRegistry, error: createError } = await supabase
              .from('content_registry')
              .insert({
                content_id: content.id,
                content_table: 'video_contents',
                content_type: 'video',
                title: content.title,
                stage_id: content.stage_id,
                status: 'active'
              })
              .select()
              .single();
            
            if (createError) {
              console.error('Error al crear registro:', createError);
            } else {
              console.log('✅ Registro creado correctamente:', newRegistry);
            }
          } else {
            // Actualizar el registro existente
            const { error: updateRegistryError } = await supabase
              .from('content_registry')
              .update({ 
                title: content.title
              })
              .eq('id', existingRegistry.id);
            
            if (updateRegistryError) {
              console.error('Error al actualizar registro:', updateRegistryError);
            }
          }
          
          return content;
        }
      } else if (content.content_type === 'advisory_session') {
        // Buscar directamente en advisory_sessions
        const { data: advisorySession, error: findError } = await supabase
          .from('advisory_sessions')
          .select('*')
          .eq('id', content.id)
          .maybeSingle();
        
        if (findError && findError.code !== 'PGRST116') {
          console.error('Error al buscar sesión de asesoría por ID:', findError);
        }
        
        // Si no encontramos por ID, intentamos por título
        if (!advisorySession) {
          const { data: advisoryByTitle, error: titleError } = await supabase
            .from('advisory_sessions')
            .select('*')
            .eq('title', content.title)
            .maybeSingle();
          
          if (titleError && titleError.code !== 'PGRST116') {
            console.error('Error al buscar sesión de asesoría por título:', titleError);
          }
          
          if (advisoryByTitle) {
            console.log(`✅ Sesión de asesoría encontrada por título: ${advisoryByTitle.id}`);
            
            // Preparar los datos para la actualización
            const updateData: any = { 
              title: content.title,
              description: content.content || ''
            };
            
            // Agregar duración si está presente
            if (content.duration !== undefined) {
              updateData.duration = content.duration;
            } else if (content.content_metadata?.duration !== undefined) {
              updateData.duration = content.content_metadata.duration;
            }
            
            // Actualizar la sesión de asesoría
            const { error: updateError } = await supabase
              .from('advisory_sessions')
              .update(updateData)
              .eq('id', advisoryByTitle.id);
            
            if (updateError) {
              throw new Error(`Error al actualizar la sesión de asesoría: ${updateError.message}`);
            }
            
            // Verificar si existe un registro en content_registry
            const { data: existingRegistry, error: registryCheckError } = await supabase
              .from('content_registry')
              .select('*')
              .eq('content_id', advisoryByTitle.id)
              .eq('content_type', 'advisory_session')
              .maybeSingle();
            
            if (registryCheckError && registryCheckError.code !== 'PGRST116') {
              console.error('Error al verificar registro existente:', registryCheckError);
            }
            
            // Si no existe registro, lo creamos
            if (!existingRegistry) {
              console.log('Creando registro en content_registry para sesión de asesoría existente');
              
              const { data: newRegistry, error: createError } = await supabase
                .from('content_registry')
                .insert({
                  content_id: advisoryByTitle.id,
                  content_table: 'advisory_sessions',
                  content_type: 'advisory_session',
                  title: content.title,
                  stage_id: content.stage_id,
                  status: 'active'
                })
                .select()
                .single();
              
              if (createError) {
                console.error('Error al crear registro:', createError);
              } else {
                console.log('✅ Registro creado correctamente:', newRegistry);
              }
            } else {
              // Actualizar el registro existente
              const { error: updateRegistryError } = await supabase
                .from('content_registry')
                .update({ 
                  title: content.title
                })
                .eq('id', existingRegistry.id);
              
              if (updateRegistryError) {
                console.error('Error al actualizar registro:', updateRegistryError);
              }
            }
            
            return {...content, id: advisoryByTitle.id};
          }
        } else {
          console.log(`✅ Sesión de asesoría encontrada directamente por ID: ${advisorySession.id}`);
          
          // Preparar los datos para la actualización
          const updateData: any = { 
            title: content.title,
            description: content.content || ''
          };
          
          // Agregar duración si está presente
          if (content.duration !== undefined) {
            updateData.duration = content.duration;
          } else if (content.content_metadata?.duration !== undefined) {
            updateData.duration = content.content_metadata.duration;
          }
          
          // Actualizar la sesión de asesoría
          const { error: updateError } = await supabase
            .from('advisory_sessions')
            .update(updateData)
            .eq('id', content.id);
          
          if (updateError) {
            throw new Error(`Error al actualizar la sesión de asesoría: ${updateError.message}`);
          }
          
          // Verificar si existe un registro en content_registry
          const { data: existingRegistry, error: registryCheckError } = await supabase
            .from('content_registry')
            .select('*')
            .eq('content_id', content.id)
            .eq('content_type', 'advisory_session')
            .maybeSingle();
          
          if (registryCheckError && registryCheckError.code !== 'PGRST116') {
            console.error('Error al verificar registro existente:', registryCheckError);
          }
          
          // Si no existe registro, lo creamos
          if (!existingRegistry) {
            console.log('Creando registro en content_registry para sesión de asesoría existente');
            
            const { data: newRegistry, error: createError } = await supabase
              .from('content_registry')
              .insert({
                content_id: content.id,
                content_table: 'advisory_sessions',
                content_type: 'advisory_session',
                title: content.title,
                stage_id: content.stage_id,
                status: 'active'
              })
              .select()
              .single();
            
            if (createError) {
              console.error('Error al crear registro:', createError);
            } else {
              console.log('✅ Registro creado correctamente:', newRegistry);
            }
          } else {
            // Actualizar el registro existente
            const { error: updateRegistryError } = await supabase
              .from('content_registry')
              .update({ 
                title: content.title
              })
              .eq('id', existingRegistry.id);
            
            if (updateRegistryError) {
              console.error('Error al actualizar registro:', updateRegistryError);
            }
          }
          
          return content;
        }
      }
      
      // Si llegamos aquí, no pudimos encontrar el contenido por ningún método
      throw new Error('Contenido no encontrado en ninguna tabla específica después de múltiples intentos de búsqueda');
    }
    
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    throw error;
  }
};

/**
 * Elimina un contenido utilizando la estructura adecuada
 * 
 * @param contentId ID del contenido a eliminar
 * @returns Verdadero si la eliminación fue exitosa
 */
export const deleteContent = async (contentId: string): Promise<boolean> => {
  try {
    console.log('Intentando eliminar contenido con ID:', contentId);
    
    // Primero intentamos encontrar el registro en content_registry por ID directo
    const { data: registryByIdData, error: registryByIdError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('id', contentId)
      .maybeSingle();
    
    if (registryByIdError && registryByIdError.code !== 'PGRST116') {
      console.error('Error al buscar en content_registry por id:', registryByIdError);
    }
    
    // Si encontramos el registro directamente por ID
    if (registryByIdData) {
      console.log('Contenido encontrado en content_registry por ID directo:', registryByIdData);
      return await contentRegistryService.deleteContent(registryByIdData.id);
    }
    
    // Si no lo encontramos por ID directo, intentamos por content_id
    const { data: registryByContentIdData, error: registryByContentIdError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('content_id', contentId)
      .maybeSingle();
    
    if (registryByContentIdError && registryByContentIdError.code !== 'PGRST116') {
      console.error('Error al buscar en content_registry por content_id:', registryByContentIdError);
    }
    
    if (registryByContentIdData) {
      console.log('Contenido encontrado en content_registry por content_id:', registryByContentIdData);
      return await contentRegistryService.deleteContent(registryByContentIdData.id);
    }
    
    // Si no lo encontramos en ninguna de las dos formas, asumimos que ya no existe
    console.log('Contenido no encontrado en content_registry');
    return true;
    
  } catch (error) {
    console.error('Error al eliminar contenido:', error);
    return false;
  }
};
