/**
 * Función para depurar los contenidos que se están pasando a ContentList
 * @param contents Array de contenidos que se está pasando al componente
 */
export const debugContentList = (contents: any[], stageId: string) => {
  console.log('=== DEPURACIÓN DE CONTENIDOS PASADOS A CONTENTLIST ===');
  console.log(`Etapa ID: ${stageId}`);
  console.log(`Total de contenidos: ${contents.length}`);
  
  // Filtrar solo los contenidos de esta etapa
  const stageContents = contents.filter(content => content.stage_id === stageId);
  console.log(`Contenidos para esta etapa: ${stageContents.length}`);
  
  // Mostrar detalles de cada contenido
  stageContents.forEach((content, index) => {
    console.log(`\nContenido #${index + 1}:`);
    console.log(`ID: ${content.id}`);
    console.log(`Título: "${content.title}"`);
    console.log(`Tipo: ${content.content_type}`);
    console.log(`Orden: ${content.order_num}`);
    
    // Mostrar propiedades adicionales según el tipo
    if (content.content_type === 'text') {
      console.log(`Contenido (primeros 50 caracteres): "${content.content?.substring(0, 50)}..."`);
    } else if (content.content_type === 'video') {
      console.log(`URL: ${content.url || content.content}`);
      console.log(`Proveedor: ${content.provider}`);
    } else if (content.content_type === 'advisory_session') {
      console.log(`Duración: ${content.content_metadata?.duration}`);
      console.log(`Tipo de sesión: ${content.content_metadata?.session_type}`);
    }
    
    // Mostrar todas las propiedades para depuración
    console.log('Objeto completo:', content);
  });
  
  console.log('=== FIN DE DEPURACIÓN CONTENTLIST ===');
};
