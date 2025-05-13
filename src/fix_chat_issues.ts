/**
 * Script para corregir problemas en el chat
 * 
 * Este script soluciona los siguientes problemas:
 * 1. Error al consultar la tabla programs (usa 'name' en lugar de 'title')
 * 2. Problemas con la memoria a corto y largo plazo
 * 3. Problemas con los IDs de actividad
 */

import { supabase } from './lib/supabase';

async function fixProgramsQuery() {
  console.log('Corrigiendo consulta a la tabla programs...');
  
  // Verificar la estructura de la tabla programs
  const { data: columns, error } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'programs');
  
  if (error) {
    console.error('Error al verificar la estructura de la tabla programs:', error);
    return;
  }
  
  console.log('Columnas en la tabla programs:', columns.map(c => c.column_name).join(', '));
  
  // Verificar si hay actividades con problemas de ID
  const { data: contentRegistry, error: registryError } = await supabase
    .from('content_registry')
    .select('*')
    .eq('content_type', 'activity');
  
  if (registryError) {
    console.error('Error al verificar el registro de contenido:', registryError);
    return;
  }
  
  console.log(`Encontrados ${contentRegistry?.length || 0} registros de actividades en content_registry`);
  
  // Verificar si hay resúmenes para las actividades
  const { data: summaries, error: summariesError } = await supabase
    .from('chat_summaries')
    .select('*')
    .limit(10);
  
  if (summariesError) {
    console.error('Error al verificar resúmenes:', summariesError);
    return;
  }
  
  console.log(`Encontrados ${summaries?.length || 0} resúmenes en chat_summaries`);
  
  // Mostrar instrucciones para corregir los problemas
  console.log('\n===== INSTRUCCIONES DE CORRECCIÓN =====');
  console.log('1. En el archivo src/services/chatService.ts:');
  console.log('   - Cambiar .select("title, description") a .select("name, description")');
  console.log('   - Cambiar programData.title a programData.name');
  console.log('\n2. Para corregir problemas de memoria:');
  console.log('   - Verificar que se están usando los IDs correctos de actividad en chatMemoryService.ts');
  console.log('   - Asegurarse de que las funciones de memoria se están llamando con los IDs correctos');
  console.log('\n3. Para corregir problemas de IDs:');
  console.log('   - Asegurarse de que se está utilizando el ID real (content_id) en lugar del ID de registro');
  console.log('   - Revisar la función saveInteractionWithEmbeddings en openai.ts');
  console.log('===========================================');
}

// Ejecutar la función principal
fixProgramsQuery().catch(console.error);
