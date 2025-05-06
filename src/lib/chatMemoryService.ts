import { supabase } from './supabase';
import { UserInsight } from '../types';
import { generateBotResponse } from './openai';

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
 * @returns Array de nombres de actividades dependientes
 */
export const fetchDependencies = async (activityId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('activity_contents')
    .select('dependencies')
    .eq('id', activityId)
    .single();

  if (error || !data?.dependencies) {
    return [];
  }

  return data.dependencies;
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
    const { data: interactions, error } = await supabase
      .from('activity_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_id', activityId)
      .order('timestamp', { ascending: true });
    
    if (error) {
      console.error('Error al obtener interacciones:', error);
      return;
    }
    
    console.log(`Se encontraron ${interactions?.length || 0} interacciones para el usuario ${userId}`);
    
    if (!interactions || interactions.length < 10) {
      console.log('No hay suficientes interacciones para generar un resumen (mínimo 10)');
      return;
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
      
      const summary = await generateBotResponse(
        "Genera un resumen detallado de esta conversación, resaltando los puntos clave de la conversación para la empresa, su negocio y su equipo, tanto dados por el usuario como por el asistente", 
        {
          systemPrompt: summaryPrompt,
          stage: "Resumen de conversación",
          activity: "Generación de resumen",
          previousMessages: []
        }
      );
      
      if (!summary) {
        console.error('OpenAI no generó un resumen válido');
        return;
      }
      
      console.log('Resumen generado correctamente:', summary.substring(0, 50) + '...');
      
      // Guardar el resumen en `chat_summaries`
      console.log('Guardando resumen en la base de datos...');
      
      const { data, error: insertError } = await supabase.from('chat_summaries').insert([{ 
        user_id: userId, 
        activity_id: activityId, 
        summary: summary, 
        created_at: new Date().toISOString()
      }]).select();
      
      if (insertError) {
        console.error('Error al guardar el resumen en chat_summaries:', insertError);
        return;
      }
      
      console.log('Resumen guardado correctamente con ID:', data?.[0]?.id);
      
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
 * Obtiene los resúmenes de memoria a largo plazo
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @returns Array de resúmenes o array vacío si no existen
 */
async function fetchLongTermMemorySummaries(userId: string, activityId: string) {
  try {
    const { data, error } = await supabase
      .from('chat_summaries')
      .select('summary, created_at')
      .eq('user_id', userId)
      .eq('activity_id', activityId)
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !data || data.length === 0) {
      console.log('No se encontraron resúmenes para el usuario:', userId, 'y actividad:', activityId);
      return [];
    }

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
 * @returns Contexto completo para OpenAI
 */
export async function generateContextForOpenAI(
  userId: string,
  activityId: string,
  userMessage: string,
  systemInstructions?: string
) {
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
    
    // Obtener dependencias y otra información relevante
    const dependencies = await fetchDependencies(activityId);
    const companyProfile = await fetchCompanyProfile(userId);
    const diagnosticSummary = await fetchDiagnosticSummary(userId);
    
    // Obtener resúmenes de memoria a largo plazo
    const longTermMemorySummaries = await fetchLongTermMemorySummaries(userId, activityId);
    
    // Construir el contexto para OpenAI
    let context = [];
    
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
    
    // Añadir información de la empresa si está disponible
    if (companyProfile) {
      context.push({
        role: 'system',
        content: `Información de la empresa: ${JSON.stringify(companyProfile)}`
      });
    }
    
    // Añadir resumen del diagnóstico si está disponible
    if (diagnosticSummary) {
      context.push({
        role: 'system',
        content: `Resumen del diagnóstico: ${JSON.stringify(diagnosticSummary)}`
      });
    }
    
    // Añadir dependencias si están disponibles
    if (dependencies && dependencies.length > 0) {
      context.push({
        role: 'system',
        content: `Dependencias de la actividad: ${JSON.stringify(dependencies)}`
      });
    }
    
    // Añadir resúmenes de memoria a largo plazo si están disponibles
    if (longTermMemorySummaries && longTermMemorySummaries.length > 0) {
      context.push({
        role: 'system',
        content: `Resúmenes de conversaciones anteriores: ${JSON.stringify(longTermMemorySummaries)}`
      });
    }
    
    // Añadir historial de chat a corto plazo
    context = [...context, ...chatHistory];
    
    // Añadir mensaje actual del usuario
    context.push({
      role: 'user',
      content: userMessage
    });
    
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
    const { data, error } = await supabase
      .from('user_insights')
      .insert([{
        user_id: userId,
        activity_id: activityId,
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
    const { data, error } = await supabase
      .from('user_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_id', activityId)
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
