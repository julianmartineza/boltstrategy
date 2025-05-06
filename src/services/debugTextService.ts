import { supabase } from '../lib/supabase';

/**
 * Función para depurar y verificar cómo están almacenados los contenidos de texto
 */
export const debugTextContents = async () => {
  try {
    console.log('=== DEPURACIÓN DE CONTENIDOS DE TEXTO ===');
    
    // 1. Verificar registros en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('*')
      .eq('content_type', 'text');
      
    if (registryError) {
      console.error('Error al consultar content_registry:', registryError);
      return;
    }
    
    console.log(`Encontrados ${registryData.length} registros en content_registry de tipo text:`, registryData);
    
    // 2. Verificar registros en text_contents
    const { data: textsData, error: textsError } = await supabase
      .from('text_contents')
      .select('*');
      
    if (textsError) {
      console.error('Error al consultar text_contents:', textsError);
      return;
    }
    
    console.log(`Encontrados ${textsData.length} registros en text_contents:`, textsData);
    
    // 3. Verificar relaciones
    if (registryData.length > 0 && textsData.length > 0) {
      console.log('=== ANÁLISIS DETALLADO DE CONTENIDOS DE TEXTO ===');
      for (const registry of registryData) {
        const text = textsData.find(t => t.id === registry.content_id);
        if (text) {
          console.log(`✅ Coincidencia encontrada:`);
          console.log(`   Registry ID: ${registry.id}`);
          console.log(`   Content ID: ${registry.content_id}`);
          console.log(`   Título en registry: "${registry.title}"`);
          console.log(`   Título en text_contents: "${text.title}"`);
          console.log(`   Primeros 100 caracteres: ${text.content?.substring(0, 100)}...`);
        } else {
          console.log(`❌ No se encontró texto para:`);
          console.log(`   Registry ID: ${registry.id}`);
          console.log(`   Content ID: ${registry.content_id}`);
          console.log(`   Título en registry: "${registry.title}"`);
        }
      }
    }
    
    // Eliminada la verificación en stage_content: ya no es relevante tras la migración total
    
    console.log('=== FIN DE DEPURACIÓN ===');
  } catch (error) {
    console.error('Error en la depuración de textos:', error);
  }
};
