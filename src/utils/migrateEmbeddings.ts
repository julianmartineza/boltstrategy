import { supabase } from '../lib/supabase';
import { generateEmbedding } from '../lib/openai';

/**
 * Migra los resúmenes existentes generando embeddings para ellos
 * Esta función debe ejecutarse una sola vez después de modificar la tabla
 */
export async function migrateExistingSummaries() {
  try {
    console.log('Iniciando migración de resúmenes a embeddings...');
    
    // Obtener todos los resúmenes sin embedding
    const { data: summaries, error } = await supabase
      .from('chat_summaries')
      .select('id, summary')
      .is('embedding', null);
    
    if (error) {
      console.error('Error al obtener resúmenes:', error);
      return;
    }
    
    if (!summaries || summaries.length === 0) {
      console.log('No hay resúmenes para migrar');
      return;
    }
    
    console.log(`Migrando ${summaries.length} resúmenes...`);
    
    // Procesar en lotes para no sobrecargar la API de OpenAI
    const batchSize = 10;
    for (let i = 0; i < summaries.length; i += batchSize) {
      const batch = summaries.slice(i, i + batchSize);
      
      // Procesar cada resumen en el lote
      await Promise.all(batch.map(async (summary) => {
        try {
          const embedding = await generateEmbedding(summary.summary);
          
          // Actualizar el resumen con el embedding
          const { error: updateError } = await supabase
            .from('chat_summaries')
            .update({ embedding })
            .eq('id', summary.id);
          
          if (updateError) {
            console.error(`Error al actualizar resumen ${summary.id}:`, updateError);
          } else {
            console.log(`Resumen ${summary.id} actualizado con embedding`);
          }
        } catch (error) {
          console.error(`Error al procesar resumen ${summary.id}:`, error);
        }
      }));
      
      console.log(`Procesados ${Math.min(i + batchSize, summaries.length)} de ${summaries.length} resúmenes`);
    }
    
    console.log('Migración completada');
  } catch (error) {
    console.error('Error en la migración:', error);
  }
}

// Para ejecutar la migración desde la consola:
// import { migrateExistingSummaries } from './utils/migrateEmbeddings';
// migrateExistingSummaries();
