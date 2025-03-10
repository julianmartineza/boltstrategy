import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, API calls should go through your backend
});

interface ChatContext {
  systemPrompt?: string;
  stage: string;
  activity: string;
  previousMessages: Array<{role: 'user' | 'assistant', content: string}>;
  context?: any;
}

export interface SimilarMessage {
  id: string;
  user_message: string;
  ai_response: string;
  similarity: number;
}

/**
 * Genera un embedding vectorial para un texto usando el modelo de OpenAI
 * @param text Texto para generar el embedding
 * @returns Vector de embedding
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generando embedding:', error);
    throw error;
  }
}

/**
 * Busca mensajes similares en la base de datos usando embeddings vectoriales
 * @param text Texto para buscar mensajes similares
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @param threshold Umbral de similitud (0-1)
 * @param limit Número máximo de resultados
 * @returns Array de mensajes similares
 */
export async function findSimilarMessages(
  text: string,
  userId: string,
  activityId: string,
  threshold: number = 0.7,
  limit: number = 5
): Promise<SimilarMessage[]> {
  try {
    // Generar embedding para el texto de búsqueda
    const embedding = await generateEmbedding(text);
    
    // Llamar a la función de búsqueda de Supabase
    const { data, error } = await supabase.rpc(
      'search_similar_interactions',
      {
        search_embedding: embedding,
        user_id_param: userId,
        activity_id_param: activityId,
        match_threshold: threshold,
        match_count: limit
      }
    );
    
    if (error) {
      console.error('Error buscando mensajes similares:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en búsqueda de mensajes similares:', error);
    return [];
  }
}

/**
 * Guarda una interacción con embeddings vectoriales
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @param userMessage Mensaje del usuario
 * @param aiResponse Respuesta de la IA
 */
export async function saveInteractionWithEmbeddings(
  userId: string,
  activityId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  try {
    // Generar embeddings para el mensaje del usuario y la respuesta de la IA
    const [userEmbedding, aiEmbedding] = await Promise.all([
      generateEmbedding(userMessage),
      generateEmbedding(aiResponse)
    ]);
    
    // Guardar en la base de datos
    const { error } = await supabase
      .from('activity_interactions')
      .insert({
        user_id: userId,
        activity_id: activityId,
        user_message: userMessage,
        ai_response: aiResponse,
        user_embedding: userEmbedding,
        ai_embedding: aiEmbedding,
        timestamp: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error guardando interacción con embeddings:', error);
    }
  } catch (error) {
    console.error('Error en saveInteractionWithEmbeddings:', error);
  }
}

export async function generateBotResponse(
  input: string, 
  context: ChatContext,
  userId?: string,
  activityId?: string
) {
  try {
    // Si tenemos userId y activityId, buscamos mensajes similares
    let relevantMessages: SimilarMessage[] = [];
    if (userId && activityId) {
      relevantMessages = await findSimilarMessages(input, userId, activityId);
      console.log('Mensajes similares encontrados:', relevantMessages.length);
    }
    
    const messages = [
      {
        role: 'system',
        content: context.systemPrompt || `You are an AI strategy consultant helping with the "${context.stage}" stage, 
        specifically the "${context.activity}" activity. Use the provided context to guide the conversation effectively.`
      },
      // Add context if available
      ...(context.context ? [{
        role: 'system',
        content: `Context Information: ${JSON.stringify(context.context)}`
      }] : []),
      // Add relevant previous messages if available
      ...(relevantMessages.length > 0 ? [{
        role: 'system',
        content: `Mensajes relevantes de conversaciones anteriores:\n${relevantMessages
          .map(m => `Usuario: ${m.user_message}\nAsistente: ${m.ai_response}`)
          .join('\n\n')}`
      }] : []),
      // Add previous conversation context (from current session)
      ...context.previousMessages,
      // Add current user input
      {
        role: 'user',
        content: input
      }
    ];

    const completion = await openai.chat.completions.create({
      messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 1000,
      presence_penalty: 0.6,
      frequency_penalty: 0.3
    });

    const response = completion.choices[0].message.content;
    
    // Si tenemos userId y activityId, guardamos la interacción con embeddings
    if (userId && activityId && response) {
      saveInteractionWithEmbeddings(userId, activityId, input, response)
        .catch(err => console.error('Error guardando interacción:', err));
    }

    return response;
  } catch (error) {
    console.error('Error generating bot response:', error);
    throw error;
  }
}