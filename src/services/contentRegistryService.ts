import { supabase } from '../lib/supabase';

/**
 * Interfaz para el registro de contenido en la estructura modular
 */
export interface ContentRegistry {
  id: string;
  title: string;
  content_type: string;
  content_table: string;
  content_id: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
}

/**
 * Interfaz para la relación entre módulos y contenidos
 */
export interface ProgramModuleContent {
  id: string;
  program_module_id: string;
  content_registry_id: string;
  position: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interfaz para contenido de texto especializado
 */
export interface TextContent {
  id: string;
  title: string;
  content: string;
  format?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interfaz para contenido de video especializado
 */
export interface VideoContent {
  id: string;
  title: string;
  video_url: string;
  source?: string;
  duration?: number;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interfaz para sesiones de asesoría
 */
export interface AdvisorySession {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interfaz para contenido de actividad especializado
 */
export interface ActivityContent {
  id: string;
  activity_data: any;
  prompt_section?: string;
  system_instructions?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interfaz unificada para cualquier tipo de contenido
 */
export interface UnifiedContent {
  id: string;
  title: string;
  content_type: string;
  position: number;
  registry_id: string;
  content_id: string;
  content_table: string;
  // Campos específicos de contenido
  content?: string;
  url?: string;
  provider?: string;
  markdown_enabled?: boolean;
  format?: string;
  // Campos específicos de actividad
  activity_data?: any;
  prompt_section?: string;
  system_instructions?: string;
  // Campos específicos de sesiones de asesoría
  duration?: number;
  session_type?: string;
  // Campos para dependencias
  dependencies?: string[];
  // Metadatos
  created_at?: string;
  updated_at?: string;
  // Campos adicionales para compatibilidad con ActivityContent
  stage_id?: string;
  stage_name?: string;
  step?: number;
  order_num?: number;
}

/**
 * Ordena los contenidos por posición
 */
export const sortContentsByPosition = (contents: (UnifiedContent | null)[]): UnifiedContent[] => {
  // Filtrar los contenidos nulos
  const validContents = contents.filter((content): content is UnifiedContent => content !== null);
  
  // Ordenar por posición
  return validContents.sort((a, b) => {
    return a.position - b.position;
  });
};

/**
 * Obtiene todos los contenidos de un módulo específico, ordenados por posición
 * Esta función implementa el nuevo modelo modular para gestión de contenidos
 * 
 * @param moduleId ID del módulo (etapa) del programa
 * @returns Array de contenidos unificados ordenados por posición
 */
export const getModuleContents = async (moduleId: string): Promise<UnifiedContent[]> => {
  try {
    // 1. Obtener todos los registros de program_module_contents para la etapa
    const { data: orderedEntries, error: entriesError } = await supabase
      .from('program_module_contents')
      .select('*')
      .eq('program_module_id', moduleId)
      .order('position');
    
    if (entriesError) throw entriesError;
    if (!orderedEntries || orderedEntries.length === 0) return [];
    
    // 2. Procesar cada entrada para obtener el contenido real
    const results = await Promise.all(
      orderedEntries.map(async (entry: ProgramModuleContent) => {
        // Obtener información del registro de contenido
        const { data: registry, error: registryError } = await supabase
          .from('content_registry')
          .select('*')
          .eq('id', entry.content_registry_id)
          .single();
        
        if (registryError) {
          console.error('Error al obtener registro de contenido:', registryError);
          return null;
        }
        
        // Obtener el contenido real de la tabla especializada
        const { data: content, error: contentError } = await supabase
          .from(registry.content_table)
          .select('*')
          .eq('id', registry.content_id)
          .single();
        
        if (contentError) {
          console.error(`Error al obtener contenido de ${registry.content_table}:`, contentError);
          return null;
        }
        
        // Crear objeto unificado según el tipo de contenido
        const unifiedContent: UnifiedContent = {
          id: content.id,
          title: registry.title || content.title || 'Sin título',
          content_type: registry.content_type,
          position: entry.position,
          registry_id: registry.id,
          content_id: content.id,
          content_table: registry.content_table,
          created_at: content.created_at,
          updated_at: content.updated_at || registry.updated_at
        };
        
        // Añadir campos específicos según el tipo de contenido
        switch (registry.content_type) {
          case 'text':
            unifiedContent.content = content.content;
            unifiedContent.format = content.format;
            unifiedContent.markdown_enabled = content.markdown_enabled;
            break;
          case 'video':
            unifiedContent.url = content.video_url;
            unifiedContent.provider = content.source;
            break;
          case 'activity':
            unifiedContent.activity_data = content.activity_data;
            unifiedContent.prompt_section = content.prompt_section;
            unifiedContent.system_instructions = content.system_instructions;
            break;
        }
        
        return unifiedContent;
      })
    );
    
    // Filtrar posibles nulos y ordenar por posición
    return sortContentsByPosition(results);
    
  } catch (error) {
    console.error('Error al obtener contenidos del módulo:', error);
    throw error;
  }
};

/**
 * Crea un nuevo contenido de texto en la estructura modular
 * 
 * @param moduleId ID del módulo al que pertenece
 * @param title Título del contenido
 * @param content Contenido en texto/markdown
 * @param position Posición en el módulo
 * @param format Formato del contenido
 * @returns El ID del contenido creado o null si hay error
 */
export const createTextContent = async (
  moduleId: string,
  title: string,
  content: string,
  position: number,
  format: string = 'markdown'
): Promise<string | null> => {
  try {
    // 1. Crear el contenido especializado
    const { data: textContent, error: textError } = await supabase
      .from('text_contents')
      .insert({
        title,
        content,
        format
      })
      .select()
      .single();
    
    if (textError) {
      console.error('Error al crear contenido de texto:', textError);
      return null;
    }
    
    // 2. Crear el registro en content_registry
    const { data: registryEntry, error: registryError } = await supabase
      .from('content_registry')
      .insert({
        title,
        content_type: 'text',
        content_id: textContent.id,
        content_table: 'text_contents'
      })
      .select()
      .single();
    
    if (registryError) {
      console.error('Error al crear registro de contenido:', registryError);
      return null;
    }
    
    // 3. Crear la relación en program_module_contents
    const { error: relationError } = await supabase
      .from('program_module_contents')
      .insert({
        program_module_id: moduleId,
        content_registry_id: registryEntry.id,
        position
      });
    
    if (relationError) {
      console.error('Error al crear relación de módulo-contenido:', relationError);
      return null;
    }
    
    // Retornar el ID del contenido creado
    return registryEntry.id;
  } catch (error) {
    console.error('Error al crear contenido de texto:', error);
    return null;
  }
};

/**
 * Crea un nuevo contenido de video en la estructura modular
 * 
 * @param moduleId ID del módulo al que pertenece
 * @param title Título del contenido
 * @param videoUrl URL del video
 * @param source Proveedor del video
 * @param position Posición en el módulo
 * @returns El ID del contenido creado o null si hay error
 */
export const createVideoContent = async (
  moduleId: string,
  title: string,
  videoUrl: string,
  source: string = 'youtube',
  position: number
): Promise<string | null> => {
  try {
    console.log('Creando contenido de video en contentRegistryService:', {
      moduleId,
      title,
      videoUrl,
      source,
      position
    });
    
    // 1. Crear el contenido especializado
    const { data: videoContent, error: videoError } = await supabase
      .from('video_contents')
      .insert({
        title,
        video_url: videoUrl,
        source
      })
      .select()
      .single();
    
    if (videoError) {
      console.error('Error al crear contenido de video:', videoError);
      return null;
    }
    
    console.log('Contenido de video creado:', videoContent);
    
    // 2. Crear el registro en content_registry
    const { data: registryEntry, error: registryError } = await supabase
      .from('content_registry')
      .insert({
        title,
        content_type: 'video',
        content_id: videoContent.id,
        content_table: 'video_contents'
      })
      .select()
      .single();
    
    if (registryError) {
      console.error('Error al crear registro de contenido:', registryError);
      return null;
    }
    
    // 3. Crear la relación en program_module_contents
    const { error: relationError } = await supabase
      .from('program_module_contents')
      .insert({
        program_module_id: moduleId,
        content_registry_id: registryEntry.id,
        position
      });
    
    if (relationError) {
      console.error('Error al crear relación de módulo-contenido:', relationError);
      return null;
    }
    
    // Retornar el ID del contenido creado
    return registryEntry.id;
  } catch (error) {
    console.error('Error al crear contenido de video:', error);
    return null;
  }
};

/**
 * Crea un nuevo contenido de actividad en la estructura modular
 * 
 * @param moduleId ID del módulo al que pertenece
 * @param title Título del contenido
 * @param activityData Datos de la actividad
 * @param position Posición en el módulo
 * @param promptSection Sección de la actividad
 * @param systemInstructions Instrucciones del sistema
 * @returns El ID del contenido creado o null si hay error
 */
export const createActivityContent = async (
  moduleId: string,
  title: string,
  activityData: any,
  position: number,
  promptSection?: string,
  systemInstructions?: string
): Promise<string | null> => {
  try {
    console.log('Creando actividad con estructura modular:', {
      moduleId,
      title,
      promptSection,
      systemInstructions,
      position
    });
    
    // Obtener datos del módulo para stage_id y stage_name
    const { data: moduleData, error: moduleError } = await supabase
      .from('strategy_stages')
      .select('id, name, stage_name')
      .eq('id', moduleId)
      .single();
    
    if (moduleError) {
      console.error('Error al obtener datos del módulo:', moduleError);
      return null;
    }
    
    console.log('Datos del módulo obtenidos:', moduleData);
    
    // Extraer valores de activityData para guardarlos en campos específicos
    const activityDataObj = typeof activityData === 'string' 
      ? JSON.parse(activityData) 
      : activityData;
    
    // Obtener valores específicos o usar los parámetros proporcionados
    const extractedPromptSection = promptSection || activityDataObj.prompt_section || '';
    const extractedSystemInstructions = systemInstructions || activityDataObj.system_instructions || '';
    const extractedStep = activityDataObj.step || 1;
    
    // Extraer dependencias si existen en activityData
    let dependencies = [];
    if (activityDataObj.dependencies) {
      dependencies = Array.isArray(activityDataObj.dependencies) 
        ? activityDataObj.dependencies 
        : [activityDataObj.dependencies];
    }
    
    // Crear la actividad en activity_contents
    const { data: activityContent, error: activityError } = await supabase
      .from('activity_contents')
      .insert({
        title,
        activity_data: typeof activityData === 'string' ? JSON.parse(activityData) : activityData, // Guardar como objeto JSON válido, sin usar JSON.stringify()
        prompt_section: extractedPromptSection,
        system_instructions: extractedSystemInstructions,
        stage_id: moduleId,
        stage_name: moduleData.stage_name || moduleData.name,
        order_num: position,
        step: extractedStep,
        dependencies: dependencies
      })
      .select()
      .single();
    
    if (activityError) {
      console.error('Error al crear actividad:', activityError);
      return null;
    }
    
    // Crear el registro en content_registry
    const { data: registryEntry, error: registryError } = await supabase
      .from('content_registry')
      .insert({
        title,
        content_type: 'activity',
        content_table: 'activity_contents',
        content_id: activityContent.id
      })
      .select()
      .single();
    
    if (registryError) {
      console.error('Error al crear registro en content_registry:', registryError);
      return null;
    }
    
    // Crear la relación con el módulo
    const { error: relationError } = await supabase
      .from('program_module_contents')
      .insert({
        program_module_id: moduleId,
        content_registry_id: registryEntry.id,
        position
      });
    
    if (relationError) {
      console.error('Error al crear relación con el módulo:', relationError);
      return null;
    }
    
    // Retornar el ID del contenido creado
    return registryEntry.id;
  } catch (error) {
    console.error('Error al crear actividad:', error);
    return null;
  }
};

/**
 * Actualiza un contenido de actividad existente en la estructura modular
 * 
 * @param moduleId ID del módulo al que pertenece
 * @param title Título del contenido
 * @param activityData Datos de la actividad
 * @param promptSection Sección de la actividad
 * @param systemInstructions Instrucciones del sistema
 * @returns El contenido unificado actualizado
 */
export const updateActivityContent = async (
  moduleId: string,
  title: string,
  activityData: any,
  promptSection?: string,
  systemInstructions?: string
): Promise<UnifiedContent | null> => {
  try {
    console.log('Actualizando actividad con estructura modular:', {
      moduleId,
      title,
      promptSection,
      systemInstructions
    });

    // 1. Buscar el registro existente en content_registry
    let registryDataResult = null;
    const { data: initialRegistryData, error: registryError } = await supabase
      .from('content_registry')
      .select('id, content_id, content_table, title')
      .eq('title', title)
      .eq('content_type', 'activity')
      .maybeSingle();

    if (registryError) {
      console.error('Error al buscar registro de actividad:', registryError);
      return null;
    }

    if (initialRegistryData) {
      registryDataResult = initialRegistryData;
      console.log('Registro encontrado por título:', registryDataResult);
    } else {
      console.log('No se encontró el registro de actividad por título, intentando buscar por ID...');
      // Intentar buscar por content_id directamente
      
      // Primero, buscar en content_registry por content_id
      const { data: registryByContentId } = await supabase
        .from('content_registry')
        .select('id, content_id, content_table, title')
        .eq('content_id', moduleId)
        .eq('content_type', 'activity')
        .maybeSingle();
        
      if (registryByContentId) {
        console.log('Registro encontrado por content_id en content_registry:', registryByContentId);
        registryDataResult = registryByContentId;
      } else {
        console.log('No se encontró registro en content_registry por content_id, verificando directamente en activity_contents...');
        // Si no se encuentra en content_registry, intentar directamente en activity_contents
        const { data: directActivityData, error: directActivityError } = await supabase
          .from('activity_contents')
          .select('id, title')
          .eq('id', moduleId)
          .maybeSingle();
          
        if (directActivityError || !directActivityData) {
          console.error('No se pudo encontrar la actividad ni por título ni por ID:', directActivityError);
          return null;
        }
        
        // Si encontramos la actividad directamente, creamos un objeto registryData simulado
        console.log('Actividad encontrada directamente por ID:', directActivityData.id);
        registryDataResult = {
          id: 'direct-access',
          content_id: directActivityData.id,
          content_table: 'activity_contents',
          title: directActivityData.title || title
        };
      }
    }
    
    // Obtener datos del módulo para stage_id y stage_name
    const { data: moduleData, error: moduleError } = await supabase
      .from('strategy_stages')
      .select('id, name, stage_name')
      .eq('id', moduleId)
      .single();
    
    if (moduleError) {
      console.error('Error al obtener datos del módulo:', moduleError);
      // No retornamos null aquí para permitir que la actualización continúe
    }
    
    // Extraer valores de activityData para guardarlos en campos específicos
    const activityDataObj = typeof activityData === 'string' 
      ? JSON.parse(activityData) 
      : activityData;
    
    console.log('Datos de actividad recibidos:', activityDataObj);

    // Obtener valores específicos o usar los parámetros proporcionados
    const extractedPromptSection = promptSection || activityDataObj.prompt_section || '';
    const extractedSystemInstructions = systemInstructions || activityDataObj.system_instructions || '';
    const extractedStep = activityDataObj.step || 1;

    // Extraer dependencias si existen en activityData
    let dependencies = [];
    if (activityDataObj.dependencies) {
      dependencies = Array.isArray(activityDataObj.dependencies) 
        ? activityDataObj.dependencies 
        : [activityDataObj.dependencies];
    }

    // Asegurarnos de que activityData contenga todos los campos necesarios
    const completeActivityData = {
      ...activityDataObj,
      prompt: activityDataObj.prompt || '',
      initial_message: activityDataObj.initial_message || '',
      system_instructions: extractedSystemInstructions,
      max_exchanges: activityDataObj.max_exchanges || 5,
      step: extractedStep,
      prompt_section: extractedPromptSection,
      dependencies: dependencies
    };

    console.log('Datos de actividad completos para guardar:', completeActivityData);

    // 2. Actualizar el contenido de actividad en activity_contents
    const { data: updatedActivityData, error: activityError } = await supabase
      .from('activity_contents')
      .update({
        title: title, // Asegurarnos de actualizar el título
        activity_data: completeActivityData, // Guardar como objeto JSON válido, sin usar JSON.stringify()
        prompt_section: extractedPromptSection,
        system_instructions: extractedSystemInstructions,
        step: extractedStep,
        dependencies: dependencies,
        stage_name: moduleData?.stage_name || moduleData?.name || 'Actividad' // Actualizar el nombre del módulo
      })
      .eq('id', registryDataResult.content_id)
      .select()
      .single();

    if (activityError) {
      console.error('Error al actualizar actividad:', activityError);
      return null;
    }

    // 3. Actualizar el registro en content_registry si es necesario
    if (title !== registryDataResult.title && registryDataResult.id !== 'direct-access') {
      const { error: updateRegistryError } = await supabase
        .from('content_registry')
        .update({ 
          title: title 
        })
        .eq('id', registryDataResult.id);
      
      if (updateRegistryError) {
        console.error('Error al actualizar registro:', updateRegistryError);
        // No retornamos null aquí para permitir que la actualización continúe
      }
    }

    // 4. Obtener la relación con el módulo para la posición
    const { data: relationData, error: relationError } = await supabase
      .from('program_module_contents')
      .select('position')
      .eq('content_registry_id', registryDataResult.id !== 'direct-access' ? registryDataResult.id : null)
      .eq('program_module_id', moduleId)
      .single();

    if (relationError) {
      console.error('Error al obtener relación de módulo:', relationError);
    }

    // 5. Construir y devolver el contenido unificado
    const unifiedContent: UnifiedContent = {
      id: updatedActivityData.id,
      title,
      content_type: 'activity',
      position: relationData?.position || 0,
      registry_id: registryDataResult.id,
      content_id: updatedActivityData.id,
      content_table: 'activity_contents',
      activity_data: completeActivityData,
      prompt_section: extractedPromptSection,
      system_instructions: extractedSystemInstructions,
      created_at: updatedActivityData.created_at,
      updated_at: updatedActivityData.updated_at
    };

    return unifiedContent;
  } catch (error) {
    console.error('Error al actualizar actividad:', error);
    return null;
  }
};

/**
 * Registra una actividad existente en la estructura modular
 * Ahora solo soporta activity_contents
 * 
 * @param moduleId ID del módulo al que pertenece
 * @param title Título del contenido
 * @param activityId ID de la actividad existente en activity_contents
 * @param position Posición en el módulo
 * @returns El ID del registro de contenido creado o null si hay error
 */
export const registerExistingActivity = async (
  moduleId: string,
  title: string,
  activityId: string,
  position: number
): Promise<string | null> => {
  try {
    // 1. Crear el registro en content_registry
    const { data: registry, error: registryError } = await supabase
      .from('content_registry')
      .insert({
        title,
        content_type: 'activity',
        content_table: 'activity_contents',
        content_id: activityId
      })
      .select()
      .single();
    
    if (registryError) {
      console.error('Error al registrar actividad existente:', registryError);
      return null;
    }
    
    // 2. Crear la relación en program_module_contents
    const { error: relationError } = await supabase
      .from('program_module_contents')
      .insert({
        program_module_id: moduleId,
        content_registry_id: registry.id,
        position
      });
    
    if (relationError) {
      console.error('Error al crear relación de módulo-contenido:', relationError);
      return null;
    }
    
    return registry.id;
  } catch (error) {
    console.error('Error al registrar actividad existente:', error);
    return null;
  }
};

/**
 * Crea una nueva sesión de asesoría en la estructura modular
 * 
 * @param moduleId ID del módulo al que pertenece
 * @param title Título de la sesión
 * @param description Descripción de la sesión
 * @param position Posición en el módulo
 * @param duration Duración en minutos (opcional)
 * @returns El ID de la sesión de asesoría creada o null si hay error
 */
export const createAdvisorySession = async (
  moduleId: string,
  title: string,
  description: string,
  position: number,
  duration?: number
): Promise<string | null> => {
  try {
    // 1. Crear el contenido especializado
    const { data: advisorySession, error: advisorySessionError } = await supabase
      .from('advisory_sessions')
      .insert({
        title,
        description,
        duration: duration || 30 // Valor por defecto de 30 minutos si no se especifica
      })
      .select()
      .single();
    
    if (advisorySessionError) {
      console.error('Error al crear sesión de asesoría:', advisorySessionError);
      return null;
    }
    
    // 2. Crear el registro en content_registry
    const { data: registryEntry, error: registryError } = await supabase
      .from('content_registry')
      .insert({
        title,
        content_type: 'advisory_session',
        content_id: advisorySession.id,
        content_table: 'advisory_sessions'
      })
      .select()
      .single();
    
    if (registryError) {
      console.error('Error al crear registro de contenido:', registryError);
      return null;
    }
    
    // 3. Crear la relación en program_module_contents
    const { error: relationError } = await supabase
      .from('program_module_contents')
      .insert({
        program_module_id: moduleId,
        content_registry_id: registryEntry.id,
        position
      });
    
    if (relationError) {
      console.error('Error al crear relación de módulo-contenido:', relationError);
      return null;
    }
    
    // Retornar el ID de la sesión de asesoría creada
    return registryEntry.id;
  } catch (error) {
    console.error('Error al crear sesión de asesoría:', error);
    return null;
  }
};

/**
 * Actualiza la posición de un contenido en un módulo
 * 
 * @param moduleContentId ID de la relación en program_module_contents
 * @param newPosition Nueva posición del contenido
 * @returns Verdadero si la actualización fue exitosa
 */
export const updateContentPosition = async (
  moduleContentId: string,
  newPosition: number
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('program_module_contents')
      .update({ position: newPosition })
      .eq('id', moduleContentId);
    
    if (error) throw error;
    return true;
    
  } catch (error) {
    console.error('Error al actualizar posición de contenido:', error);
    return false;
  }
};

/**
 * Elimina un contenido del sistema modular
 * Esta función elimina tanto el registro en content_registry como el contenido especializado
 * 
 * @param registryId ID del registro en content_registry
 * @returns Verdadero si la eliminación fue exitosa
 */
export const deleteContent = async (registryId: string): Promise<boolean> => {
  try {
    console.log('Iniciando eliminación de contenido con registryId:', registryId);
    
    // 1. Obtener información del registro
    const { data: registry, error: registryError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('id', registryId)
      .single();
    
    if (registryError) {
      console.error('Error al obtener información del registro:', registryError);
      throw registryError;
    }
    
    console.log('Información del registro obtenida:', registry);
    
    // 2. Eliminar la relación en program_module_contents
    console.log('Eliminando relaciones en program_module_contents...');
    const { error: relationError } = await supabase
      .from('program_module_contents')
      .delete()
      .eq('content_registry_id', registryId);
    
    if (relationError) {
      console.error('Error al eliminar relaciones:', relationError);
    } else {
      console.log('Relaciones eliminadas correctamente');
    }
    
    // 3. Eliminar el contenido especializado
    console.log(`Eliminando contenido especializado en ${registry.content_table}...`);
    const { error: contentError } = await supabase
      .from(registry.content_table)
      .delete()
      .eq('id', registry.content_id);
    
    if (contentError) {
      console.error('Error al eliminar contenido especializado:', contentError);
    } else {
      console.log('Contenido especializado eliminado correctamente');
    }
    
    // 4. Eliminar el registro en content_registry
    console.log('Eliminando registro en content_registry...');
    const { error: deleteRegistryError } = await supabase
      .from('content_registry')
      .delete()
      .eq('id', registryId);
    
    if (deleteRegistryError) {
      console.error('Error al eliminar registro:', deleteRegistryError);
      throw deleteRegistryError;
    }
    
    console.log('Registro eliminado correctamente');
    return true;
    
  } catch (error) {
    console.error('Error al eliminar contenido:', error);
    return false;
  }
};
