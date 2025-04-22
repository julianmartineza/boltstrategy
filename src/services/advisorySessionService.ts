import { supabase } from '../lib/supabase';
import { StageContent } from '../components/admin/content-manager/types';

/**
 * Crea una sesión de asesoría y la registra en el content_registry
 */
export const createAdvisorySession = async (content: Partial<StageContent>): Promise<StageContent> => {
  try {
    // 1. Crear la sesión de asesoría en la tabla advisory_sessions
    const { data: advisorySession, error: advisoryError } = await supabase
      .from('advisory_sessions')
      .insert([{
        title: content.title,
        description: content.content,
        duration: content.content_metadata?.duration || 60,
        session_type: content.content_metadata?.session_type || 'individual',
        preparation_instructions: '',
        advisor_notes: ''
      }])
      .select()
      .single();

    if (advisoryError) throw advisoryError;

    // 2. Registrar en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .insert([{
        title: content.title,
        content_type: 'advisory_session',
        content_table: 'advisory_sessions',
        content_id: advisorySession.id,
        status: 'active'
      }])
      .select()
      .single();

    if (registryError) throw registryError;

    // 3. Si hay un stage_id, crear la relación en program_module_contents
    if (content.stage_id) {
      const { error: relationError } = await supabase
        .from('program_module_contents')
        .insert([{
          program_module_id: content.stage_id,
          content_registry_id: registryData.id,
          position: content.order_num || 0
        }]);

      if (relationError) throw relationError;
    }

    // 4. Devolver un objeto compatible con StageContent para mantener la interfaz
    return {
      id: registryData.id,
      title: content.title || '',
      content: content.content || '',
      content_type: 'advisory_session',
      stage_id: content.stage_id || '',
      order_num: content.order_num || 0,
      content_metadata: {
        duration: content.content_metadata?.duration || 60,
        session_type: content.content_metadata?.session_type || 'individual',
        advisory_session_id: advisorySession.id
      }
    };
  } catch (error) {
    console.error('Error creating advisory session:', error);
    throw error;
  }
};

/**
 * Actualiza una sesión de asesoría existente
 */
export const updateAdvisorySession = async (content: StageContent): Promise<StageContent> => {
  try {
    // Obtener el ID de la sesión de asesoría desde content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('content_id')
      .eq('id', content.id)
      .single();

    if (registryError) throw registryError;

    // Actualizar la sesión de asesoría
    const { error: advisoryError } = await supabase
      .from('advisory_sessions')
      .update({
        title: content.title,
        description: content.content,
        duration: content.content_metadata?.duration || 60,
        session_type: content.content_metadata?.session_type || 'individual',
        updated_at: new Date()
      })
      .eq('id', registryData.content_id)
      .select()
      .single();

    if (advisoryError) throw advisoryError;

    // Actualizar el registro en content_registry
    const { error: updateRegistryError } = await supabase
      .from('content_registry')
      .update({
        title: content.title,
        updated_at: new Date()
      })
      .eq('id', content.id);

    if (updateRegistryError) throw updateRegistryError;

    // Si hay un stage_id, actualizar la posición en program_module_contents
    if (content.stage_id) {
      const { error: relationError } = await supabase
        .from('program_module_contents')
        .update({
          position: content.order_num || 0
        })
        .eq('content_registry_id', content.id)
        .eq('program_module_id', content.stage_id);

      if (relationError) throw relationError;
    }

    return {
      ...content,
      content_metadata: {
        ...content.content_metadata,
        advisory_session_id: registryData.content_id
      }
    };
  } catch (error) {
    console.error('Error updating advisory session:', error);
    throw error;
  }
};

/**
 * Elimina una sesión de asesoría
 */
export const deleteAdvisorySession = async (contentId: string, advisorySessionId?: string): Promise<boolean> => {
  try {
    console.log('Intentando eliminar sesión de asesoría con ID:', contentId);
    console.log('ID específico de la sesión (si está disponible):', advisorySessionId);
    
    // Si tenemos el ID específico de la sesión, intentar eliminar directamente
    if (advisorySessionId) {
      console.log('Intentando eliminar directamente con el ID de la sesión:', advisorySessionId);
      
      // 1. Buscar el registro en content_registry usando el ID específico
      const { data: registryBySpecificId, error: specificIdError } = await supabase
        .from('content_registry')
        .select('*')
        .eq('content_id', advisorySessionId)
        .maybeSingle();
      
      if (specificIdError && specificIdError.code !== 'PGRST116') {
        console.error('Error al buscar en content_registry por content_id específico:', specificIdError);
      } else if (registryBySpecificId) {
        console.log('Registro encontrado por content_id específico:', registryBySpecificId);
        
        // 2. Eliminar la relación en program_module_contents
        console.log('Eliminando relaciones en program_module_contents...');
        const { error: relationError } = await supabase
          .from('program_module_contents')
          .delete()
          .eq('content_registry_id', registryBySpecificId.id);
        
        if (relationError) {
          console.error('Error al eliminar relaciones:', relationError);
        } else {
          console.log('Relaciones eliminadas correctamente');
        }
        
        // 3. Eliminar la sesión de asesoría
        console.log('Eliminando sesión de asesoría con ID específico:', advisorySessionId);
        const { error: advisoryError } = await supabase
          .from('advisory_sessions')
          .delete()
          .eq('id', advisorySessionId);
        
        if (advisoryError) {
          console.error('Error al eliminar sesión de asesoría:', advisoryError);
        } else {
          console.log('Sesión de asesoría eliminada correctamente');
        }
        
        // 4. Eliminar el registro en content_registry
        console.log('Eliminando registro en content_registry...');
        const { error: deleteRegistryError } = await supabase
          .from('content_registry')
          .delete()
          .eq('id', registryBySpecificId.id);
        
        if (deleteRegistryError) {
          console.error('Error al eliminar registro:', deleteRegistryError);
        } else {
          console.log('Registro eliminado correctamente');
          return true;
        }
      }
    }
    
    // Si no tenemos el ID específico o falló la eliminación directa, intentar con el ID del contenido
    // 1. Buscar el registro en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('id', contentId)
      .maybeSingle();
    
    if (registryError && registryError.code !== 'PGRST116') {
      console.error('Error al buscar en content_registry por ID:', registryError);
      
      // Si no se encuentra por ID, intentar buscar por content_id
      const { data: registryByContentId, error: contentIdError } = await supabase
        .from('content_registry')
        .select('*')
        .eq('content_id', contentId)
        .maybeSingle();
      
      if (contentIdError && contentIdError.code !== 'PGRST116') {
        console.error('Error al buscar en content_registry por content_id:', contentIdError);
        return false;
      }
      
      if (registryByContentId) {
        console.log('Registro encontrado por content_id:', registryByContentId);
        return await deleteAdvisorySession(registryByContentId.id);
      }
      
      console.error('No se encontró el registro en content_registry');
      return false;
    }
    
    if (!registryData) {
      console.error('No se encontró el registro en content_registry');
      return false;
    }
    
    console.log('Registro encontrado en content_registry:', registryData);
    
    // 2. Eliminar la relación en program_module_contents
    console.log('Eliminando relaciones en program_module_contents...');
    const { error: relationError } = await supabase
      .from('program_module_contents')
      .delete()
      .eq('content_registry_id', contentId);
    
    if (relationError) {
      console.error('Error al eliminar relaciones:', relationError);
    } else {
      console.log('Relaciones eliminadas correctamente');
    }
    
    // 3. Eliminar la sesión de asesoría
    if (registryData.content_id) {
      console.log('Eliminando sesión de asesoría con ID:', registryData.content_id);
      const { error: advisoryError } = await supabase
        .from('advisory_sessions')
        .delete()
        .eq('id', registryData.content_id);
      
      if (advisoryError) {
        console.error('Error al eliminar sesión de asesoría:', advisoryError);
      } else {
        console.log('Sesión de asesoría eliminada correctamente');
      }
    }
    
    // 4. Eliminar el registro en content_registry
    console.log('Eliminando registro en content_registry...');
    const { error: deleteRegistryError } = await supabase
      .from('content_registry')
      .delete()
      .eq('id', contentId);
    
    if (deleteRegistryError) {
      console.error('Error al eliminar registro:', deleteRegistryError);
      return false;
    }
    
    console.log('Registro eliminado correctamente');
    return true;
  } catch (error) {
    console.error('Error al eliminar sesión de asesoría:', error);
    return false;
  }
};

/**
 * Obtiene los detalles de una sesión de asesoría desde content_registry y advisory_sessions
 */
export const getAdvisorySessionDetails = async (contentId: string): Promise<StageContent | null> => {
  try {
    console.log('Intentando obtener detalles para contentId:', contentId);
    
    // 1. Verificar si el contenido existe en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('id', contentId);

    if (registryError) {
      console.error('Error al obtener registro de content_registry:', registryError);
      return null;
    }
    
    console.log('Datos de content_registry:', registryData);
    
    if (!registryData || registryData.length === 0) {
      console.warn('No se encontró el registro en content_registry:', contentId);
      return null;
    }

    const contentRegistryItem = registryData[0];
    
    // Verificar si es una sesión de asesoría
    if (contentRegistryItem.content_type !== 'advisory_session') {
      console.warn('El contenido no es una sesión de asesoría:', contentRegistryItem.content_type);
      return null;
    }

    // 2. Obtener los detalles de la sesión de asesoría
    const { data: sessionData, error: sessionError } = await supabase
      .from('advisory_sessions')
      .select('*')
      .eq('id', contentRegistryItem.content_id);

    if (sessionError) {
      console.error('Error al obtener datos de advisory_sessions:', sessionError);
      return null;
    }
    
    console.log('Datos de advisory_sessions:', sessionData);
    
    if (!sessionData || sessionData.length === 0) {
      console.warn('No se encontró la sesión de asesoría:', contentRegistryItem.content_id);
      return null;
    }

    const advisorySession = sessionData[0];

    // 3. Obtener la relación con el módulo del programa
    const { data: relationData, error: relationError } = await supabase
      .from('program_module_contents')
      .select('*')
      .eq('content_registry_id', contentId);

    if (relationError) {
      console.error('Error al obtener relación de program_module_contents:', relationError);
    }
    
    console.log('Datos de program_module_contents:', relationData);

    const relation = relationData && relationData.length > 0 ? relationData[0] : null;

    // 4. Construir el objeto StageContent con toda la información
    const result: StageContent = {
      id: contentRegistryItem.id,
      title: contentRegistryItem.title,
      content: advisorySession.description || '',
      content_type: 'advisory_session' as 'advisory_session',
      stage_id: relation?.program_module_id || '',
      order_num: relation?.position || 0,
      content_metadata: {
        duration: advisorySession.duration || 60,
        session_type: advisorySession.session_type || 'individual',
        advisory_session_id: advisorySession.id
      }
    };
    
    console.log('Objeto StageContent construido:', result);
    
    return result;
  } catch (error) {
    console.error('Error al obtener detalles de la sesión de asesoría:', error);
    return null;
  }
};
