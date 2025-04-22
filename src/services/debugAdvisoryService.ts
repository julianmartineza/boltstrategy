import { supabase } from '../lib/supabase';

/**
 * Función para depurar y verificar cómo están almacenadas las sesiones de asesoría
 */
export const debugAdvisorySessions = async () => {
  try {
    console.log('=== DEPURACIÓN DEL SISTEMA DE ASESORÍAS ===');
    
    // 1. Verificar registros en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('content_type', 'advisory_session');
      
    if (registryError) {
      console.error('Error al consultar content_registry:', registryError);
      return;
    }
    
    console.log(`Encontrados ${registryData.length} registros en content_registry de tipo advisory_session:`, registryData);
    
    // 2. Verificar registros en advisory_sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('advisory_sessions')
      .select('*');
      
    if (sessionsError) {
      console.error('Error al consultar advisory_sessions:', sessionsError);
      return;
    }
    
    console.log(`Encontrados ${sessionsData.length} registros en advisory_sessions:`, sessionsData);
    
    // 3. Verificar relaciones
    if (registryData.length > 0 && sessionsData.length > 0) {
      for (const registry of registryData) {
        const session = sessionsData.find(s => s.id === registry.content_id);
        if (session) {
          console.log(`✅ Coincidencia encontrada: registry.id=${registry.id}, session.id=${session.id}`);
          console.log(`   Título: ${registry.title}`);
          console.log(`   Descripción: ${session.description}`);
          console.log(`   Duración: ${session.duration} minutos`);
          console.log(`   Tipo: ${session.session_type}`);
        } else {
          console.log(`❌ No se encontró sesión para registry.id=${registry.id}, content_id=${registry.content_id}`);
        }
      }
    }
    
    console.log('=== FIN DE DEPURACIÓN ===');
  } catch (error) {
    console.error('Error en la depuración:', error);
  }
};
