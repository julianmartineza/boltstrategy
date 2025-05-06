import OpenAI from 'openai';
import { supabase } from './supabase';

// Configuración de OpenAI con logging detallado
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
console.log('OpenAI API Key disponible:', apiKey ? 'Sí (primeros 4 caracteres: ' + apiKey.substring(0, 4) + '...)' : 'No');

// Usar modelo más ligero para reducir consumo de tokens
const CHAT_MODEL = 'gpt-4o-mini'; // Modelo con mayor límite de tokens (2.5M diarios)
const EMBEDDING_MODEL = 'text-embedding-3-small'; // Modelo más ligero para embeddings

// Caché de embeddings para evitar solicitudes duplicadas
const embeddingCache = new Map<string, number[]>();

const openai = new OpenAI({
  apiKey,
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
  // Verificar si ya tenemos este embedding en caché
  // Asegurarse de que la clave sea siempre un string
  const cacheKey = `${text.substring(0, 100)}`;
  if (embeddingCache.has(cacheKey)) {
    console.log('🔍 Usando embedding en caché para:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    const cachedEmbedding = embeddingCache.get(cacheKey);
    return cachedEmbedding || [];
  }
  
  console.log('🔍 Generando embedding para texto:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
  
  try {
    console.log(`📤 Enviando solicitud a OpenAI para generar embedding usando modelo: ${EMBEDDING_MODEL}`);
    console.time('⏱️ Tiempo de respuesta embedding');
    
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    
    console.timeEnd('⏱️ Tiempo de respuesta embedding');
    console.log('📥 Respuesta de embedding recibida, longitud:', response.data[0].embedding.length);
    
    // Guardar en caché para futuras solicitudes
    const embedding = response.data[0].embedding;
    embeddingCache.set(cacheKey, embedding);
    
    // Limitar el tamaño de la caché (máximo 50 embeddings)
    if (embeddingCache.size > 50) {
      const keys = Array.from(embeddingCache.keys());
      if (keys.length > 0) {
        const oldestKey = keys[0];
        embeddingCache.delete(oldestKey);
      }
    }
    
    return embedding;
  } catch (error: any) {
    console.error('❌ Error generando embedding:', error);
    console.error('Detalles del error:', {
      mensaje: error.message,
      status: error.status,
      tipo: error.type,
      stack: error.stack
    });
    
    // En caso de error, devolvemos un array vacío en lugar de lanzar una excepción
    return [];
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
    
    // Si no se pudo generar el embedding, devolvemos un array vacío
    if (embedding.length === 0) {
      console.log('No se pudo generar embedding para la búsqueda, omitiendo búsqueda de mensajes similares');
      return [];
    }
    
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
    // Verificamos si el activity_id es válido
    if (!activityId || activityId === 'undefined' || activityId === 'null') {
      console.error('❌ No se puede guardar la interacción: activity_id no válido', { activityId });
      return;
    }

    console.log('🔍 Intentando guardar interacción para activity_id:', activityId);
    
    // Verificar si el activity_id existe en activity_contents o en content_registry
    let activityExists = false;
    let validActivityId = activityId;
    
    // Paso 1: Verificar directamente en activity_contents
    const { data: activityContentData, error: activityContentError } = await supabase
      .from('activity_contents')
      .select('id')
      .eq('id', activityId)
      .maybeSingle();
    
    if (!activityContentError && activityContentData) {
      console.log('✅ Activity_id encontrado directamente en activity_contents:', activityId);
      activityExists = true;
    } else {
      console.log('⚠️ Activity_id no encontrado directamente en activity_contents, verificando en content_registry...');
      
      // Paso 2: Verificar si el ID es un ID de content_registry
      const { data: registryData, error: registryError } = await supabase
        .from('content_registry')
        .select('id, content_id, content_table, content_type')
        .eq('id', activityId)
        .maybeSingle();
      
      if (!registryError && registryData) {
        console.log('✅ ID encontrado en content_registry como ID de registro:', registryData);
        
        // Si es una actividad, usar el content_id
        if (registryData.content_type === 'activity' && registryData.content_table === 'activity_contents') {
          validActivityId = registryData.content_id;
          activityExists = true;
          console.log('✅ Usando content_id como validActivityId:', validActivityId);
        }
      } else {
        // Paso 3: Verificar si existe una entrada en content_registry que mapee este ID como content_id
        const { data: contentRegistryData, error: contentRegistryError } = await supabase
          .from('content_registry')
          .select('content_id')
          .eq('content_table', 'activity_contents')
          .eq('content_type', 'activity')
          .eq('content_id', activityId)
          .maybeSingle();
        
        if (!contentRegistryError && contentRegistryData && contentRegistryData.content_id) {
          console.log('✅ Encontrado mapeo en content_registry a activity_contents:', contentRegistryData.content_id);
          validActivityId = contentRegistryData.content_id;
          activityExists = true;
        } else {
          console.warn('⚠️ No se encontró mapeo en content_registry');
        }
      }
    }
    
    if (!activityExists) {
      console.error('❌ No se puede guardar la interacción: el activity_id no existe en activity_contents', {
        activityId,
        tablas_verificadas: ['activity_contents', 'content_registry']
      });
      return;
    }
    
    // Intentar generar embeddings, pero continuar incluso si fallan
    let userEmbedding: number[] = [];
    let aiEmbedding: number[] = [];
    
    try {
      // Generar embeddings en paralelo para optimizar
      [userEmbedding, aiEmbedding] = await Promise.all([
        generateEmbedding(userMessage),
        generateEmbedding(aiResponse)
      ]);
    } catch (embeddingError) {
      console.error('Error generando embeddings, continuando sin ellos:', embeddingError);
    }
    
    // Guardar en la base de datos
    const { error } = await supabase
      .from('activity_interactions')
      .insert({
        user_id: userId,
        activity_id: validActivityId, // Usar el ID validado
        user_message: userMessage,
        ai_response: aiResponse,
        user_embedding: userEmbedding.length > 0 ? userEmbedding : null,
        ai_embedding: aiEmbedding.length > 0 ? aiEmbedding : null,
        timestamp: new Date().toISOString()
      });
      
    if (error) {
      // Si el error es de clave foránea, significa que el activity_id no existe
      if (error.code === '23503') {
        console.error('❌ No se puede guardar la interacción: el activity_id no existe en activity_contents', {
          activityId: validActivityId,
          error
        });
      } else {
        console.error('Error guardando interacción con embeddings:', error);
      }
    } else {
      console.log('✅ Interacción guardada correctamente para activity_id:', validActivityId);
    }
  } catch (error) {
    console.error('Error en saveInteractionWithEmbeddings:', error);
  }
}

// Caché para respuestas de bienvenida para evitar solicitudes duplicadas
const welcomeResponseCache = new Map<string, string>();

export async function generateBotResponse(
  input: string, 
  context: ChatContext,
  userId?: string,
  activityId?: string
) {
  try {
    // Para mensajes de bienvenida, verificar si ya tenemos una respuesta en caché
    const isWelcomeMessage = input === "Hola, ¿puedes ayudarme con esta actividad?";
    
    // Asegurarse de que la clave sea siempre un string
    const welcomeCacheKey = activityId ? `${activityId}-welcome` : 'default-welcome';
    
    if (isWelcomeMessage && welcomeResponseCache.has(welcomeCacheKey)) {
      console.log('🔍 Usando respuesta de bienvenida en caché para actividad:', activityId || 'desconocida');
      const cachedResponse = welcomeResponseCache.get(welcomeCacheKey);
      return cachedResponse || "Lo siento, no pude recuperar la respuesta en caché.";
    }
    
    // Si tenemos userId y activityId, buscamos mensajes similares
    let relevantMessages: SimilarMessage[] = [];
    if (userId && activityId && !isWelcomeMessage) { // No buscar mensajes similares para el mensaje de bienvenida
      try {
        console.log(`🔍 Buscando mensajes similares para usuario ${userId} y actividad ${activityId}`);
        relevantMessages = await findSimilarMessages(input, userId, activityId);
        console.log('📊 Mensajes similares encontrados:', relevantMessages.length);
      } catch (error) {
        console.error('❌ Error buscando mensajes similares, continuando sin ellos:', error);
      }
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

    console.log(`📤 Enviando solicitud a OpenAI para generar respuesta usando modelo: ${CHAT_MODEL}`);
    console.log('📝 Estructura de mensajes:', JSON.stringify(messages.map(m => ({
      role: m.role,
      content_preview: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
    })), null, 2));
    
    try {
      console.time('⏱️ Tiempo de respuesta OpenAI');
      
      const completion = await openai.chat.completions.create({
        messages: messages.map(m => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content })),
        model: CHAT_MODEL,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      });

      console.timeEnd('⏱️ Tiempo de respuesta OpenAI');
      console.log('📥 Respuesta recibida de OpenAI:', {
        id: completion.id,
        model: completion.model,
        usage: completion.usage,
        finish_reason: completion.choices[0].finish_reason
      });

      const response = completion.choices[0].message.content || "";
      
      // Guardar respuesta de bienvenida en caché
      if (isWelcomeMessage && response) {
        welcomeResponseCache.set(welcomeCacheKey, response);
      }
      
      // Si tenemos userId y activityId, guardamos la interacción con embeddings
      if (userId && activityId && response) {
        // Usamos un catch para evitar que los errores al guardar interrumpan el flujo
        console.log('💾 Guardando interacción con embeddings');
        saveInteractionWithEmbeddings(userId, activityId, input, response)
          .catch(err => console.error('❌ Error guardando interacción:', err));
      }

      return response;
    } catch (error: any) {
      // Si es un error de límite de cuota, devolvemos un mensaje amigable
      if (error.status === 429) {
        console.error('⚠️ Error de límite de cuota en OpenAI:', error);
        return "Lo siento, en este momento no puedo procesar tu solicitud debido a que se ha alcanzado el límite de uso de la API. Por favor, intenta más tarde o contacta al administrador del sistema para resolver este problema.";
      }
      
      // Para otros errores, mostrar detalles y lanzar excepción
      console.error('❌ Error en la solicitud a OpenAI:', error);
      console.error('Detalles del error:', {
        mensaje: error.message,
        status: error.status,
        tipo: error.type,
        stack: error.stack
      });
      
      throw error;
    }
  } catch (error) {
    console.error('❌ Error general en generateBotResponse:', error);
    return "Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo más tarde.";
  }
}