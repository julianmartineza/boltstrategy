import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { generateEmbedding } from '../../lib/openai';

/**
 * Componente para migrar los resúmenes existentes a embeddings
 */
const MigrateEmbeddings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const migrateExistingSummaries = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setLog([]);

    try {
      addLog('Iniciando migración de resúmenes existentes a vectores...');
      
      // Obtener todos los resúmenes sin embedding
      const { data: summaries, error } = await supabase
        .from('chat_summaries')
        .select('id, summary')
        .is('embedding', null);
      
      if (error) {
        throw new Error(`Error al obtener resúmenes sin embeddings: ${error.message}`);
      }
      
      if (!summaries || summaries.length === 0) {
        addLog('No hay resúmenes para migrar. Todos los resúmenes ya tienen embeddings.');
        setIsLoading(false);
        return;
      }
      
      addLog(`Se encontraron ${summaries.length} resúmenes sin embeddings para migrar.`);
      setTotal(summaries.length);
      
      // Procesar en lotes para no sobrecargar la API de OpenAI
      const batchSize = 5;
      let processedCount = 0;
      
      for (let i = 0; i < summaries.length; i += batchSize) {
        const batch = summaries.slice(i, i + batchSize);
        addLog(`Procesando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(summaries.length / batchSize)}...`);
        
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
              addLog(`Error al actualizar resumen ${summary.id}: ${updateError.message}`);
              return { success: false, id: summary.id };
            }
            
            return { success: true, id: summary.id };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            addLog(`Error al procesar resumen ${summary.id}: ${errorMessage}`);
            return { success: false, id: summary.id };
          }
        }));
        
        // Contar resultados exitosos y fallidos
        const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
        const failed = results.filter(r => r.status === 'rejected' || !(r.value as any).success).length;
        
        processedCount += successful;
        setProgress(processedCount);
        
        addLog(`Lote completado: ${successful} exitosos, ${failed} fallidos.`);
        addLog(`Progreso total: ${processedCount}/${summaries.length} (${Math.round(processedCount / summaries.length * 100)}%)`);
        
        // Esperar un poco entre lotes para no sobrecargar la API
        if (i + batchSize < summaries.length) {
          addLog('Esperando 2 segundos antes del siguiente lote...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      addLog(`Migración completada. ${processedCount} resúmenes actualizados con embeddings.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      addLog(`Error general en la migración: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Migración de Resúmenes a Embeddings</h2>
      
      <p className="mb-4">
        Esta herramienta migrará los resúmenes existentes en la base de datos añadiéndoles embeddings vectoriales
        para mejorar las búsquedas por relevancia.
      </p>
      
      <button
        onClick={migrateExistingSummaries}
        disabled={isLoading}
        className={`px-4 py-2 rounded ${isLoading 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
      >
        {isLoading ? 'Migrando...' : 'Iniciar Migración'}
      </button>
      
      {total > 0 && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${Math.round((progress / total) * 100)}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600">
            Progreso: {progress} de {total} ({Math.round((progress / total) * 100)}%)
          </p>
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}
      
      {log.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold mb-2">Registro:</h3>
          <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto font-mono text-sm">
            {log.map((entry, index) => (
              <div key={index} className="mb-1">
                {entry}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrateEmbeddings;
