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
    .from('stage_content')
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
  const { data: interactions, error } = await supabase
    .from('activity_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_id', activityId)
    .order('timestamp', { ascending: true });

  if (!error && interactions && interactions.length >= 10) {
    // Generar resumen con OpenAI
    const summaryPrompt = `
    Resume las siguientes interacciones manteniendo los puntos clave:
    ${interactions.map(m => `${m.role || (m.user_message ? 'Usuario' : 'Asistente')}: ${m.user_message || m.ai_response}`).join("\n")}
    `;

    const summary = await generateBotResponse(
      "Genera un resumen conciso de esta conversación", 
      {
        systemPrompt: summaryPrompt,
        stage: "Resumen de conversación",
        activity: "Generación de resumen",
        previousMessages: []
      }
    );

    if (summary) {
      // Guardar el resumen en `chat_summaries`
      await supabase.from('chat_summaries').insert([{ 
        user_id: userId, 
        activity_id: activityId, 
        summary: summary, 
        created_at: new Date().toISOString()
      }]);

      // Eliminar interacciones antiguas para liberar espacio
      for (const interaction of interactions.slice(0, interactions.length - 5)) {
        await supabase.from('activity_interactions').delete().eq('id', interaction.id);
      }
    }
  }
};

/**
 * Genera el contexto para OpenAI incluyendo memoria de corto y largo plazo
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @param userInput Mensaje del usuario
 * @returns Contexto completo para OpenAI
 */
export const generateContextForOpenAI = async (
  userId: string, 
  activityId: string, 
  userInput: string,
  systemPrompt?: string
) => {
  let chatHistory = [...getShortTermMemory()];

  // Obtener dependencias de la actividad actual
  const dependencies = await fetchDependencies(activityId);

  // Si hay dependencias, recuperar respuestas previas
  if (dependencies.length > 0) {
    const previousResponses = await fetchPreviousResponses(userId, dependencies);
    if (previousResponses && previousResponses.length > 0) {
      chatHistory.unshift({ 
        role: "system", 
        content: `Información relevante de actividades previas: ${JSON.stringify(previousResponses)}` 
      });
    }
  }

  // Obtener el perfil de la empresa
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!companyError && company) {
    chatHistory.unshift({ 
      role: "system", 
      content: `Contexto de la empresa: ${JSON.stringify(company)}` 
    });
  }

  // Obtener el diagnóstico de la empresa
  const { data: diagnostic, error: diagnosticError } = await supabase
    .from('diagnostics')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!diagnosticError && diagnostic) {
    chatHistory.unshift({ 
      role: "system", 
      content: `Diagnóstico de la empresa: ${JSON.stringify(diagnostic.diagnostic_data)}` 
    });
  }

  // Obtener el último resumen de memoria de largo plazo
  const { data: longTermMemory, error } = await supabase
    .from('chat_summaries')
    .select('summary')
    .eq('user_id', userId)
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!error && longTermMemory && longTermMemory.length > 0) {
    chatHistory.unshift({ 
      role: "system", 
      content: `Resumen de la conversación previa: ${longTermMemory[0].summary}` 
    });
  }

  // Añadir instrucciones del sistema si existen
  if (systemPrompt) {
    chatHistory.unshift({ 
      role: "system", 
      content: systemPrompt 
    });
  }

  // Añadir el mensaje del usuario
  chatHistory.push({ 
    role: "user", 
    content: userInput 
  });

  return chatHistory;
};

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
