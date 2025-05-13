import { supabase } from '../lib/supabase';
import { generateEmbedding } from '../lib/openai';

/**
 * Script para migrar los resúmenes existentes y añadirles embeddings
 * 
 * Este script debe ejecutarse una sola vez después de modificar la tabla
 * para añadir la columna de embeddings.
 */

async function migrateExistingSummaries() {
  try {
    console.log('Iniciando migración de resúmenes existentes a vectores...');
    
    // Obtener todos los resúmenes sin embedding
    const { data: summaries, error } = await supabase
      .from('chat_summaries')
      .select('id, summary')
      .is('embedding', null);
    
    if (error) {
      console.error('Error al obtener resúmenes sin embeddings:', error);
      return;
    }
    
    if (!summaries || summaries.length === 0) {
      console.log('No hay resúmenes para migrar. Todos los resúmenes ya tienen embeddings.');
      return;
    }
    
    console.log(`Se encontraron ${summaries.length} resúmenes sin embeddings para migrar.`);
    
    // Procesar en lotes para no sobrecargar la API de OpenAI
    const batchSize = 10;
    let processedCount = 0;
    
    for (let i = 0; i < summaries.length; i += batchSize) {
      const batch = summaries.slice(i, i + batchSize);
      console.log(`Procesando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(summaries.length / batchSize)}...`);
      
      // Procesar cada resumen en el lote
      const results = await Promise.allSettled(batch.map(async (summary) => {
        try {
          // Generar embedding para el resumen
          const embedding = await generateEmbedding(summary.summary);
          
          // Actualizar el resumen con el embedding
          const { error: updateError } = await supabase
            .from('chat_summaries')
            .update({ embedding })
            .eq('id', summary.id);
          
          if (updateError) {
            console.error(`Error al actualizar resumen ${summary.id}:`, updateError);
            return { success: false, id: summary.id };
          }
          
          return { success: true, id: summary.id };
        } catch (error) {
          console.error(`Error al procesar resumen ${summary.id}:`, error);
          return { success: false, id: summary.id };
        }
      }));
      
      // Contar resultados exitosos y fallidos
      const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
      const failed = results.filter(r => r.status === 'rejected' || !(r.value as any).success).length;
      
      processedCount += successful;
      console.log(`Lote completado: ${successful} exitosos, ${failed} fallidos.`);
      console.log(`Progreso total: ${processedCount}/${summaries.length} (${Math.round(processedCount / summaries.length * 100)}%)`);
      
      // Esperar un poco entre lotes para no sobrecargar la API
      if (i + batchSize < summaries.length) {
        console.log('Esperando 2 segundos antes del siguiente lote...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`Migración completada. ${processedCount} resúmenes actualizados con embeddings.`);
  } catch (error) {
    console.error('Error general en la migración:', error);
  }
}

// Ejecutar la migración
migrateExistingSummaries()
  .then(() => {
    console.log('Script de migración finalizado.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error fatal en el script de migración:', error);
    process.exit(1);
  });
