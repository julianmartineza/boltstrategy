import { supabase } from './supabase';
import { UserInsight } from '../types';
import { generateBotResponse, generateEmbedding, findSimilarMessages } from './openai';

/**
 * Busca el ID real de una actividad en content_registry
 * @param activityId ID de la actividad (posiblemente un ID de registro)
 * @returns ID real de la actividad o el mismo ID si no se encuentra
 */
export const getRealActivityId = async (activityId: string) => {
  if (!activityId) return null;
  
  try {
    console.log(`Verificando ID real para actividad: ${activityId}`);
    
    // Primero verificar si el ID ya existe en activity_contents
    // Si existe, ya es un ID real y no necesitamos buscarlo en content_registry
    const { data: activityData, error: activityError } = await supabase
      .from('activity_contents')
      .select('id')
      .eq('id', activityId)
      .maybeSingle();
    
    if (activityData && !activityError) {
      console.log(`✅ ID encontrado directamente en activity_contents: ${activityId}`);
      return activityId; // Ya es un ID real
    }
    
    // Si no se encuentra en activity_contents, buscar en content_registry
    const { data } = await supabase
      .from('content_registry')
      .select('content_id')
      .eq('id', activityId)
      .eq('content_type', 'activity')
      .maybeSingle();
      
    if (data?.content_id) {
      console.log(`✅ ID encontrado en content_registry, usando content_id: ${data.content_id}`);
      return data.content_id;
    }
    
    return activityId;
  } catch (error) {
    console.error('Error al buscar ID real de actividad:', error);
    return activityId;
  }
};

// Definir la interfaz ChatMessage localmente para evitar problemas de importación
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Memoria de corto plazo (últimas 10 interacciones en el frontend)
let shortTermMemory: ChatMessage[] = [];

/**
 * Actualiza la memoria de corto plazo con un nuevo mensaje
 * @param newMessage Nuevo mensaje para añadir a la memoria
 */
export const updateShortTermMemory = (newMessage: ChatMessage) => {
  if (shortTermMemory.length >= 10) {
    shortTermMemory.shift(); // Elimina el mensaje más antiguo
  }
  shortTermMemory.push(newMessage);
};

// Versión alternativa que acepta role y content por separado
export const updateShortTermMemoryWithParams = (content: string, role: 'user' | 'assistant' | 'system') => {
  updateShortTermMemory({ role, content });
};

/**
 * Limpia la memoria de corto plazo
 */
export const clearShortTermMemory = () => {
  shortTermMemory = [];
};

/**
 * Obtiene la memoria de corto plazo actual
 * @returns Array de mensajes en la memoria de corto plazo
 */
export const getShortTermMemory = (): ChatMessage[] => {
  return [...shortTermMemory];
};

/**
 * Obtiene las dependencias de una actividad
 * @param activityId ID de la actividad
 * @returns Array de IDs de actividades dependientes
 */
export const fetchDependencies = async (activityId: string): Promise<string[]> => {
  try {
    console.log(`Buscando dependencias para actividad: ${activityId}`);
    
    // Obtener el ID real de la actividad usando la nueva función
    const validActivityId = await getRealActivityId(activityId) || activityId;
    
    // Ahora buscar con el ID correcto
    const { data, error } = await supabase
      .from('activity_contents')
      .select('dependencies, activity_data')
      .eq('id', validActivityId)
      .single();

    if (error) {
      console.error('Error al obtener dependencias:', error);
      return [];
    }

    // Conjunto para evitar duplicados
    const dependenciesSet = new Set<string>();
    
    // Añadir dependencias de la columna independiente si existen
    if (data?.dependencies && Array.isArray(data.dependencies)) {
      data.dependencies.forEach((dep: string) => dependenciesSet.add(dep));
    }
    
    // Añadir dependencias del campo activity_data si existen
    if (data?.activity_data?.dependencies && Array.isArray(data.activity_data.dependencies)) {
      data.activity_data.dependencies.forEach((dep: string) => dependenciesSet.add(dep));
    }
    
    const dependencies = Array.from(dependenciesSet);
    console.log(`Encontradas ${dependencies.length} dependencias para actividad ${validActivityId}:`, dependencies);
    
    return dependencies;
  } catch (error) {
    console.error('Error general en fetchDependencies:', error);
    return [];
  }
};

/**
 * Obtiene interacciones relevantes de actividades dependientes usando búsqueda vectorial
 * @param userId ID del usuario
 * @param dependencyIds Array de IDs de actividades dependientes
 * @param userMessage Mensaje actual del usuario para búsqueda semántica
 * @returns Datos de interacciones relevantes agrupadas por actividad
 */
export const fetchDependencyInteractions = async (
  userId: string,
  dependencyIds: string[],
  userMessage: string
): Promise<any[]> => {
  try {
    if (!userId || !dependencyIds || dependencyIds.length === 0 || !userMessage) {
      console.log('Datos insuficientes para buscar interacciones de dependencias');
      return [];
    }
    
    console.log(`Buscando interacciones relevantes para ${dependencyIds.length} dependencias`);
    
    // Generar embedding para el mensaje del usuario
    const userEmbedding = await generateEmbedding(userMessage);
    
    if (!userEmbedding || userEmbedding.length === 0) {
      console.warn('No se pudo generar embedding para búsqueda de dependencias');
      return [];
    }
    
    // Resultados por actividad
    const resultsByActivity: Record<string, any> = {};
    
    // Procesar cada actividad dependiente
    for (const activityId of dependencyIds) {
      // Verificar si el ID es un ID de registro en content_registry
      let validActivityId = activityId;
      
      try {
        const { data: registryData, error: registryError } = await supabase
          .from('content_registry')
          .select('content_id, content_type')
          .eq('id', activityId)
          .single();
        
        if (!registryError && registryData && registryData.content_type === 'activity') {
          console.log(`✅ ID encontrado en content_registry, usando content_id: ${registryData.content_id}`);
          validActivityId = registryData.content_id;
        }
      } catch (registryCheckError) {
        console.log('No se encontró el ID en content_registry, usando el ID original');
      }
      
      // Usar la función existente findSimilarMessages para cada actividad dependiente
      const similarMessages = await findSimilarMessages(
        userMessage,
        userId,
        validActivityId,
        0.65, // Umbral de similitud un poco más bajo para capturar más contexto
        3     // Limitar a 3 mensajes por actividad dependiente
      );
      
      if (similarMessages && similarMessages.length > 0) {
        // Obtener información de la actividad con el ID correcto
        const { data: activityData } = await supabase
          .from('activity_contents')
          .select('title, prompt_section')
          .eq('id', validActivityId)
          .single();
        
        resultsByActivity[activityId] = {
          activity_id: activityId,
          title: activityData?.title || 'Actividad relacionada',
          section: activityData?.prompt_section || '',
          interactions: similarMessages
        };
      }
    }
    
    // Convertir a array para el resultado final
    const results = Object.values(resultsByActivity);
    console.log(`Encontradas interacciones relevantes en ${results.length} actividades dependientes`);
    
    return results;
  } catch (error) {
    console.error('Error en fetchDependencyInteractions:', error);
    return [];
  }
};

/**
 * Obtiene resúmenes de actividades dependientes
 * @param userId ID del usuario
 * @param dependencyIds Array de IDs de actividades dependientes
 * @returns Resúmenes de las actividades dependientes
 */
export const fetchDependencySummaries = async (
  userId: string,
  dependencyIds: string[]
): Promise<any[]> => {
  try {
    if (!userId || !dependencyIds || dependencyIds.length === 0) {
      return [];
    }
    
    console.log(`Buscando resúmenes para ${dependencyIds.length} dependencias`);
    
    // Verificar si los IDs son IDs de registro en content_registry
    const validDependencyIds = await Promise.all(dependencyIds.map(async (depId) => {
      try {
        const { data: registryData, error: registryError } = await supabase
          .from('content_registry')
          .select('content_id, content_type')
          .eq('id', depId)
          .single();
        
        if (!registryError && registryData && registryData.content_type === 'activity') {
          console.log(`✅ ID de dependencia encontrado en content_registry, usando content_id: ${registryData.content_id}`);
          return registryData.content_id;
        }
        return depId; // Si no se encuentra o hay error, usar el ID original
      } catch (registryCheckError) {
        console.log(`No se encontró el ID ${depId} en content_registry, usando el ID original`);
        return depId;
      }
    }));
    
    console.log('IDs de dependencias validados:', validDependencyIds);
    
    // Obtener resúmenes de chat_summaries
    const { data: summaries, error } = await supabase
      .from('chat_summaries')
      .select('content, activity_id')
      .eq('user_id', userId)
      .in('activity_id', validDependencyIds);
    
    if (error) {
      console.error('Error al obtener resúmenes de dependencias:', error);
      return [];
    }
    
    if (!summaries || summaries.length === 0) {
      console.log('No se encontraron resúmenes para las dependencias');
      return [];
    }
    
    // Obtener información de las actividades para enriquecer los resúmenes
    const { data: activities } = await supabase
      .from('activity_contents')
      .select('id, title, prompt_section')
      .in('id', validDependencyIds);
    
    // Crear un mapa de ID a información de actividad
    const activityInfo: Record<string, {title: string, section?: string}> = {};
    if (activities) {
      activities.forEach(activity => {
        activityInfo[activity.id] = {
          title: activity.title,
          section: activity.prompt_section
        };
      });
    }
    
    // Enriquecer los resúmenes con información de las actividades
    const enrichedSummaries = summaries.map(summary => {
      const info = activityInfo[summary.activity_id] || { title: 'Actividad relacionada' };
      return {
        activity_id: summary.activity_id,
        title: info.title,
        section: info.section,
        content: summary.content
      };
    });
    
    console.log(`Encontrados ${enrichedSummaries.length} resúmenes para actividades dependientes`);
    return enrichedSummaries;
  } catch (error) {
    console.error('Error en fetchDependencySummaries:', error);
    return [];
  }
};

/**
 * Obtiene las respuestas previas de actividades dependientes
 * @param userId ID del usuario
 * @param dependencies Array de nombres de actividades dependientes
 * @returns Datos de respuestas previas
 */
export const fetchPreviousResponses = async (userId: string, dependencies: string[]) => {
  const { data, error } = await supabase
    .from('activity_responses')
    .select('stage_name, content')
    .eq('user_id', userId)
    .in('stage_name', dependencies);

  if (error) {
    console.error('Error al recuperar respuestas previas:', error);
    return null;
  }

  return data;
};

/**
 * Limpia las interacciones antiguas y genera un resumen
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 */
export const cleanUpInteractions = async (userId: string, activityId: string) => {
  console.log(`Iniciando cleanUpInteractions para usuario ${userId} y actividad ${activityId}`);
  
  try {
    // Obtener el ID real de la actividad
    const realActivityId = await getRealActivityId(activityId) || activityId;
    console.log(`Usando ID real para cleanUpInteractions: ${realActivityId}`);
    
    const { data: interactions, error } = await supabase
      .from('activity_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_id', realActivityId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error al obtener interacciones:', error);
      return;
    }
    
    console.log(`Se encontraron ${interactions?.length || 0} interacciones para el usuario ${userId}`);
    
    if (!interactions || interactions.length < 5) {
      console.log('No hay suficientes interacciones para generar un resumen (mínimo 5)');
      return;
    }
    
    // Verificar cuándo se generó el último resumen y cuántas interacciones nuevas hay desde entonces
    const { data: existingSummaries, error: summaryError } = await supabase
      .from('chat_summaries')
      .select('created_at')
      .eq('user_id', userId)
      .eq('activity_id', realActivityId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!summaryError && existingSummaries && existingSummaries.length > 0) {
      const lastSummaryDate = new Date(existingSummaries[0].created_at);
      
      // Contar cuántas interacciones nuevas hay desde el último resumen
      const newInteractionsCount = interactions.filter(interaction => {
        const interactionDate = new Date(interaction.created_at || '');
        return interactionDate > lastSummaryDate;
      }).length;
      
      console.log(`Hay ${newInteractionsCount} interacciones nuevas desde el último resumen`);
      
      // Solo generar un nuevo resumen si hay al menos 5 interacciones nuevas desde el último resumen
      if (newInteractionsCount < 5) {
        console.log('No hay suficientes interacciones nuevas para generar un resumen (mínimo 5 desde el último resumen)');
        return;
      }
    }
    
    // Generar resumen con OpenAI
    console.log('Generando resumen con OpenAI...');
    
    try {
      const summaryPrompt = `
      Genera un resumen detallado de las siguientes interacciones manteniendo los puntos clave para la empresa, su negocio y su equipo:
      ${interactions.map(m => {
        // Verificar que los campos existan antes de usarlos
        const role = m.user_message ? 'Usuario' : 'Asistente';
        const content = m.user_message || m.ai_response || '';
        return `${role}: ${content}`;
      }).join("\n")}
      `;
      
      console.log('Prompt para resumen generado, llamando a OpenAI...');
      
      const summary = await generateBotResponse([
        {
          role: 'system',
          content: summaryPrompt
        },
        {
          role: 'user',
          content: "Genera un resumen detallado de esta conversación, resaltando los puntos clave de la conversación para la empresa, su negocio y su equipo, tanto dados por el usuario como por el asistente"
        }
      ]);
      
      if (!summary) {
        console.error('OpenAI no generó un resumen válido');
        return;
      }
      
      console.log('Resumen generado correctamente:', summary.substring(0, 50) + '...');
      
      // Guardar el resumen con embedding en `chat_summaries`
      console.log('Guardando resumen con embedding en la base de datos...');
      
      const success = await saveSummaryWithEmbedding(summary, userId, realActivityId);
      
      console.log(`Guardando resumen para actividad real: ${realActivityId}`);
      
      if (!success) {
        console.error('Error al guardar el resumen con embedding en chat_summaries');
        return;
      }
      
      console.log('Resumen con embedding guardado correctamente');
      
      // Nota: Temporalmente desactivamos la eliminación de interacciones antiguas
      // para mantener el historial completo en la base de datos
      /*
      // Eliminar interacciones antiguas para liberar espacio
      console.log(`Eliminando las ${interactions.length - 5} interacciones más antiguas...`);
      
      for (const interaction of interactions.slice(0, interactions.length - 5)) {
        const { error: deleteError } = await supabase
          .from('activity_interactions')
          .delete()
          .eq('id', interaction.id);
          
        if (deleteError) {
          console.error(`Error al eliminar la interacción ${interaction.id}:`, deleteError);
        }
      }
      */
      
      console.log('Proceso de generación de resumen completado con éxito (sin eliminación de interacciones)');
    } catch (openaiError) {
      console.error('Error en la generación del resumen con OpenAI:', openaiError);
    }
  } catch (error) {
    console.error('Error general en cleanUpInteractions:', error);
  }
};

/**
 * Obtiene el perfil de la empresa del usuario
 * @param userId ID del usuario
 * @returns Datos de la empresa o null si no existe
 */
async function fetchCompanyProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.log('No se encontró perfil de empresa para el usuario:', userId);
      return null;
    }

    return {
      name: data.name,
      industry: data.industry,
      size: data.size,
      annual_revenue: data.annual_revenue,
      website: data.website
    };
  } catch (error) {
    console.error('Error al obtener el perfil de la empresa:', error);
    return null;
  }
}

/**
 * Obtiene el resumen del diagnóstico de la empresa
 * @param userId ID del usuario
 * @returns Datos del diagnóstico o null si no existe
 */
async function fetchDiagnosticSummary(userId: string) {
  try {
    const { data, error } = await supabase
      .from('diagnostics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.log('No se encontró diagnóstico para el usuario:', userId);
      return null;
    }

    return data.diagnostic_data;
  } catch (error) {
    console.error('Error al obtener el diagnóstico:', error);
    return null;
  }
}

/**
 * Obtiene resúmenes relevantes basados en una consulta usando embeddings
 * @param query Consulta para buscar resúmenes relevantes
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @param limit Número máximo de resúmenes a devolver
 * @returns Array de resúmenes relevantes con su puntuación de similitud
 */
async function getRelevantSummaries(
  query: string,
  userId: string,
  activityId: string,
  limit: number = 3
): Promise<{summary: string, similarity: number}[]> {
  try {
    // Obtener el ID real de la actividad
    const realActivityId = await getRealActivityId(activityId) || activityId;
    
    // Generar embedding para la consulta
    const queryEmbedding = await generateEmbedding(query);
    
    // Buscar resúmenes relevantes usando la función RPC
    const { data, error } = await supabase.rpc('match_summaries', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit,
      activity_id_param: realActivityId,
      user_id_param: userId
    });
    
    if (error) {
      console.error('Error al buscar resúmenes relevantes:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      console.log('No se encontraron resúmenes relevantes para la consulta');
      return [];
    }
    
    console.log(`Se encontraron ${data.length} resúmenes relevantes para la consulta`);
    return data.map((item: {summary: string, similarity: number}) => ({
      summary: item.summary,
      similarity: item.similarity
    }));
  } catch (error) {
    console.error('Error al obtener resúmenes relevantes:', error);
    return [];
  }
}

/**
 * Guarda un resumen con su embedding
 * @param summary Texto del resumen
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @returns true si se guardó correctamente, false en caso contrario
 */
export async function saveSummaryWithEmbedding(
  summary: string,
  userId: string,
  activityId: string
): Promise<boolean> {
  try {
    // Generar embedding para el resumen
    const embedding = await generateEmbedding(summary);
    
    // Guardar en la base de datos con el embedding
    const { error } = await supabase.from('chat_summaries').insert({
      user_id: userId,
      activity_id: activityId,
      summary: summary,
      embedding: embedding
    });
    
    if (error) {
      console.error('Error al guardar resumen con embedding:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error al vectorizar y guardar resumen:', error);
    return false;
  }
}

/**
 * Obtiene los resúmenes de memoria a largo plazo
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @param userMessage Mensaje del usuario para buscar resúmenes relevantes
 * @returns Array de resúmenes o array vacío si no existen
 */
async function fetchLongTermMemorySummaries(
  userId: string,
  activityId: string,
  userMessage: string = ''
) {
  try {
    // Obtener el ID real de la actividad
    const realActivityId = await getRealActivityId(activityId) || activityId;
    
    // Si tenemos un mensaje del usuario, usarlo para buscar resúmenes relevantes
    if (userMessage && userMessage.trim().length > 0) {
      const relevantSummaries = await getRelevantSummaries(
        userMessage,
        userId,
        realActivityId
      );
      
      if (relevantSummaries.length > 0) {
        console.log(`Se encontraron ${relevantSummaries.length} resúmenes relevantes para el mensaje del usuario`);
        return relevantSummaries.map(item => {
          const similarityPercentage = Math.round(item.similarity * 100);
          return `[Relevancia: ${similarityPercentage}%] ${item.summary}`;
        });
      }
    }
    
    // Si no hay mensaje o no se encontraron resúmenes relevantes, usar el enfoque tradicional
    console.log(`Buscando resúmenes para actividad real: ${realActivityId}`);
    
    const { data, error } = await supabase
      .from('chat_summaries')
      .select('summary, created_at')
      .eq('user_id', userId)
      .eq('activity_id', realActivityId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !data || data.length === 0) {
      console.log('No se encontraron resúmenes para el usuario:', userId, 'y actividad:', activityId);
      return [];
    }

    console.log(`Se encontraron ${data.length} resúmenes para el usuario ${userId} y actividad ${realActivityId}`);
    return data.map(item => item.summary);
  } catch (error) {
    console.error('Error al obtener resúmenes de memoria a largo plazo:', error);
    return [];
  }
}

/**
 * Genera el contexto completo para OpenAI
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @param userMessage Mensaje del usuario
 * @param systemInstructions Instrucciones del sistema para OpenAI
 * @param isForEvaluation Indica si el contexto es para evaluación
 * @returns Contexto completo para OpenAI
 */
import { getContextConfiguration, ContextConfig } from '../services/contextConfigService';

export async function generateContextForOpenAI(
  userId: string,
  activityId: string,
  userMessage: string,
  systemInstructions?: string,
  options?: {
    isForEvaluation?: boolean;
    overrideConfig?: ContextConfig;
  }
) {
  // Determinar si es para evaluación
  const isForEvaluation = options?.isForEvaluation || false;
  
  // Obtener la configuración de contexto de la base de datos
  const contextConfig = await getContextConfiguration(activityId);
  
  // Determinar qué configuración usar
  const config = options?.overrideConfig || 
                (isForEvaluation ? 
                  contextConfig.evaluation_context : 
                  contextConfig.activity_context);
                  
  console.log(`🔧 Usando configuración de contexto para ${isForEvaluation ? 'evaluación' : 'actividad'}:`, config);
  try {
    // Verificar que tenemos los datos necesarios
    if (!userId || !activityId) {
      console.error('Error: userId o activityId no disponibles para generar contexto');
      return [
        {
          role: 'system',
          content: 'Eres un asistente de estrategia. Responde de manera concisa y útil.'
        },
        {
          role: 'user',
          content: userMessage
        }
      ];
    }

    // Obtener memoria a corto plazo
    let chatHistory = [...getShortTermMemory()];
    
    // Filtrar mensajes del sistema si es para evaluación
    // Solo mantenemos los mensajes del usuario y del asistente
    if (isForEvaluation) {
      chatHistory = chatHistory.filter(msg => msg.role !== 'system');
      console.log(`🔍 Filtrados mensajes del sistema para evaluación. Quedan ${chatHistory.length} mensajes.`);
    }
    
    // Obtener dependencias y otra información relevante
    const dependencies = await fetchDependencies(activityId);
    const companyProfile = await fetchCompanyProfile(userId);
    const diagnosticSummary = await fetchDiagnosticSummary(userId);
    
    // Obtener resúmenes de memoria a largo plazo relevantes al mensaje del usuario
    const longTermMemorySummaries = await fetchLongTermMemorySummaries(userId, activityId, userMessage);
    
    // Construir el contexto para OpenAI
    let context = [];
    
    // Si NO es para evaluación, añadir instrucciones del sistema
    if (!isForEvaluation) {
      // Añadir instrucciones del sistema si están disponibles
      if (systemInstructions) {
        context.push({
          role: 'system',
          content: systemInstructions
        });
      } else {
        context.push({
          role: 'system',
          content: 'Eres un asistente de estrategia empresarial. Ayuda al usuario con su consulta basándote en el contexto proporcionado.'
        });
      }
    }
    
    // Añadir información de la empresa si está configurado
    if (companyProfile && config?.includeCompanyInfo) {
      context.push({
        role: 'system',
        content: `Información de la empresa: ${JSON.stringify(companyProfile)}`
      });
    }
    
    // Añadir resumen del diagnóstico si está configurado
    if (diagnosticSummary && config?.includeDiagnostic) {
      context.push({
        role: 'system',
        content: `Resumen del diagnóstico: ${JSON.stringify(diagnosticSummary)}`
      });
    }
    
    // Añadir dependencias y su contenido si están configuradas
    if (dependencies && dependencies.length > 0 && config?.includeDependencies) {
      console.log(`Procesando ${dependencies.length} dependencias para actividad ${activityId}`);
      
      // 1. Obtener interacciones relevantes usando búsqueda vectorial
      const relevantInteractions = await fetchDependencyInteractions(
        userId,
        dependencies,
        userMessage
      );
      
      if (relevantInteractions && relevantInteractions.length > 0) {
        // Formatear las interacciones relevantes de manera estructurada
        let interactionsContext = "Conversaciones previas relacionadas con tu consulta:\n\n";
        
        relevantInteractions.forEach(activity => {
          interactionsContext += `## ${activity.title}\n`;
          if (activity.section) interactionsContext += `Sección: ${activity.section}\n`;
          
          activity.interactions.forEach((interaction: { similarity: number; user_message: string; ai_response: string }) => {
            const similarityPercentage = Math.round(interaction.similarity * 100);
            interactionsContext += `[Similitud: ${similarityPercentage}%]\n`;
            interactionsContext += `- Usuario: ${interaction.user_message}\n`;
            interactionsContext += `- Asistente: ${interaction.ai_response}\n\n`;
          });
          
          interactionsContext += "---\n\n";
        });
        
        context.push({
          role: 'system',
          content: interactionsContext
        });
        
        console.log('Añadido contexto de interacciones relevantes de actividades dependientes');
      }
      
      // 2. Obtener resúmenes de las actividades dependientes
      const dependencySummaries = await fetchDependencySummaries(userId, dependencies);
      
      if (dependencySummaries && dependencySummaries.length > 0) {
        let summariesContext = "Resúmenes de actividades relacionadas:\n\n";
        
        dependencySummaries.forEach(summary => {
          summariesContext += `## ${summary.title}\n`;
          if (summary.section) summariesContext += `Sección: ${summary.section}\n`;
          summariesContext += `${summary.content}\n\n`;
          summariesContext += "---\n\n";
        });
        
        context.push({
          role: 'system',
          content: summariesContext
        });
        
        console.log('Añadido contexto de resúmenes de actividades dependientes');
      }
      
      // Si no se encontró ninguna información relevante, al menos incluir los IDs
      if (!relevantInteractions.length && !dependencySummaries.length) {
        context.push({
          role: 'system',
          content: `Esta actividad tiene dependencias (${dependencies.join(', ')}), pero no se encontró información relevante.`
        });
        
        console.log('No se encontró información relevante para las dependencias');
      }
    }
    
    // Añadir resúmenes de memoria a largo plazo si están configurados
    if (longTermMemorySummaries && longTermMemorySummaries.length > 0 && config?.includeMemorySummaries) {
      context.push({
        role: 'system',
        content: `Resúmenes de conversaciones anteriores: ${JSON.stringify(longTermMemorySummaries)}`
      });
    }
    
    // Eliminar posibles duplicados en el historial de chat
    const uniqueMessages = new Map();
    
    // Procesar cada mensaje del historial para eliminar duplicados
    chatHistory.forEach((msg, index) => {
      // Crear una clave única para cada mensaje basada en su rol y contenido
      const key = `${msg.role}_${msg.content.substring(0, 50)}`;
      
      // Si es un mensaje duplicado, solo mantener la última ocurrencia
      if (!uniqueMessages.has(key) || index > uniqueMessages.get(key)) {
        uniqueMessages.set(key, index);
      }
    });
    
    // Reconstruir el historial sin duplicados
    const deduplicatedHistory = Array.from(uniqueMessages.entries())
      .sort((a, b) => a[1] - b[1]) // Ordenar por el índice original
      .map(([_, index]) => chatHistory[index]);
    
    console.log(`Historial original: ${chatHistory.length} mensajes, Historial sin duplicados: ${deduplicatedHistory.length} mensajes`);
    
    // Añadir historial de chat a corto plazo sin duplicados
    context = [...context, ...deduplicatedHistory];
    
    // Verificar si el último mensaje en el historial sin duplicados ya es el mensaje actual del usuario
    const lastMessage = deduplicatedHistory.length > 0 ? deduplicatedHistory[deduplicatedHistory.length - 1] : null;
    const isLastMessageFromUser = lastMessage && lastMessage.role === 'user';
    const isLastMessageSameAsCurrentMessage = isLastMessageFromUser && lastMessage.content === userMessage;
    
    // Añadir mensaje actual del usuario solo si no está ya incluido en el historial
    if (!isLastMessageSameAsCurrentMessage) {
      context.push({
        role: 'user',
        content: userMessage
      });
    }
    
    return context;
  } catch (error) {
    console.error('Error generando contexto para OpenAI:', error);
    // Devolver un contexto mínimo en caso de error
    return [
      {
        role: 'system',
        content: 'Eres un asistente de estrategia. Responde de manera concisa y útil.'
      },
      {
        role: 'user',
        content: userMessage
      }
    ];
  }
}

/**
 * Guarda un insight del usuario
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @param content Contenido del insight
 * @returns Resultado de la operación
 */
export const saveUserInsight = async (
  userId: string,
  activityId: string,
  content: string
): Promise<UserInsight | null> => {
  try {
    // Obtener el ID real de la actividad
    const realActivityId = await getRealActivityId(activityId) || activityId;
    console.log(`Guardando insight para actividad real: ${realActivityId}`);
    
    const { data, error } = await supabase
      .from('user_insights')
      .insert([{
        user_id: userId,
        activity_id: realActivityId,
        content: content,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error al guardar insight:', error);
      return null;
    }

    return data as UserInsight;
  } catch (error) {
    console.error('Error en saveUserInsight:', error);
    return null;
  }
};

/**
 * Obtiene los insights de un usuario para una actividad
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @returns Array de insights del usuario
 */
export const fetchUserInsights = async (
  userId: string,
  activityId: string
): Promise<UserInsight[]> => {
  try {
    // Obtener el ID real de la actividad
    const realActivityId = await getRealActivityId(activityId) || activityId;
    console.log(`Buscando insights para actividad real: ${realActivityId}`);
    
    const { data, error } = await supabase
      .from('user_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_id', realActivityId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al recuperar insights:', error);
      return [];
    }

    return data as UserInsight[];
  } catch (error) {
    console.error('Error en fetchUserInsights:', error);
    return [];
  }
};
