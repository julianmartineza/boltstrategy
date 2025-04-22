import { supabase } from '../lib/supabase';

/**
 * Función para depurar y verificar cómo están almacenados los contenidos de video
 */
export const debugVideoContents = async () => {
  try {
    console.log('=== DEPURACIÓN DE CONTENIDOS DE VIDEO ===');
    
    // 1. Verificar registros en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('content_type', 'video');
      
    if (registryError) {
      console.error('Error al consultar content_registry:', registryError);
      return;
    }
    
    console.log(`Encontrados ${registryData.length} registros en content_registry de tipo video:`, registryData);
    
    // 2. Verificar registros en video_contents
    const { data: videosData, error: videosError } = await supabase
      .from('video_contents')
      .select('*');
      
    if (videosError) {
      console.error('Error al consultar video_contents:', videosError);
      return;
    }
    
    console.log(`Encontrados ${videosData.length} registros en video_contents:`, videosData);
    
    // 3. Verificar relaciones
    if (registryData.length > 0 && videosData.length > 0) {
      for (const registry of registryData) {
        const video = videosData.find(v => v.id === registry.content_id);
        if (video) {
          console.log(`✅ Coincidencia encontrada: registry.id=${registry.id}, video.id=${video.id}`);
          console.log(`   Título: ${registry.title}`);
          console.log(`   URL: ${video.video_url}`);
          console.log(`   Fuente: ${video.source}`);
        } else {
          console.log(`❌ No se encontró video para registry.id=${registry.id}, content_id=${registry.content_id}`);
        }
      }
    }
    
    console.log('=== FIN DE DEPURACIÓN ===');
  } catch (error) {
    console.error('Error en la depuración de videos:', error);
  }
};
