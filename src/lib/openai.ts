import { supabase } from './supabase';

// Usar modelo más potente para mejorar la capacidad de seguir instrucciones complejas
const CHAT_MODEL = 'gpt-4o'; // Modelo con mejor capacidad para seguir instrucciones
const EMBEDDING_MODEL = 'text-embedding-3-small'; // Modelo más ligero para embeddings

// Caché de embeddings para evitar solicitudes duplicadas
const embeddingCache = new Map<string, number[]>();

// URL base para las APIs serverless
// En desarrollo usamos la API de OpenAI directamente, en producción usamos nuestras funciones serverless
const API_BASE_URL = import.meta.env.DEV ? 'https://api.openai.com/v1' : '/api';

// Obtener la clave API de OpenAI de las variables de entorno
const OPENAI_API_KEY = import.meta.env.OPENAI_API_KEY;

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
    console.log(`📤 Enviando solicitud a la API para generar embedding usando modelo: ${EMBEDDING_MODEL}`);
    console.time('⏱️ Tiempo de respuesta embedding');
    
    let response;
    if (import.meta.env.DEV) {
      // En desarrollo, llamamos directamente a la API de OpenAI
      response = await fetch(`${API_BASE_URL}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text
        })
      });
    } else {
      // En producción, usamos nuestras funciones serverless
      response = await fetch(`${API_BASE_URL}/openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'embedding',
          model: EMBEDDING_MODEL,
          input: text
        })
      });
    }
    
    if (!response.ok) {
      throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.timeEnd('⏱️ Tiempo de respuesta embedding');
    
    // Extraer el embedding según el formato de respuesta
    let embedding;
    if (import.meta.env.DEV) {
      // La API de OpenAI devuelve los embeddings en un formato diferente
      embedding = data.data[0].embedding;
      console.log('📥 Respuesta de embedding recibida, longitud:', embedding.length);
    } else {
      embedding = data.embedding;
      console.log('📥 Respuesta de embedding recibida, longitud:', embedding.length);
    }
    
    // Guardar en caché para futuras solicitudes
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
 * @returns El ID real utilizado para guardar la interacción (puede ser diferente del proporcionado)
 */
export async function saveInteractionWithEmbeddings(
  userId: string,
  activityId: string,
  userMessage: string,
  aiResponse: string
): Promise<string> {
  try {
    // Verificamos si el activity_id es válido
    if (!activityId || activityId === 'undefined' || activityId === 'null') {
      console.error('❌ No se puede guardar la interacción: activity_id no válido', { activityId });
      return activityId; // Devolver el ID original aunque no sea válido
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
      return activityId; // Devolver el ID original aunque no sea válido
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
    
    // Devolver el ID real utilizado para guardar la interacción
    // Esto permite que otras partes del código usen este ID para evaluaciones
    return validActivityId;
  } catch (error) {
    console.error('Error en saveInteractionWithEmbeddings:', error);
    // En caso de error, devolver el ID original
    return activityId;
  }
}

// Caché para respuestas de bienvenida para evitar solicitudes duplicadas
const welcomeResponseCache = new Map<string, string>();

/**
 * Genera una respuesta del bot usando el modelo de OpenAI
 * @param messages Mensajes para generar la respuesta
 * @returns Respuesta generada
 */
export async function generateBotResponse(
  messages: Array<{role: string, content: string}>
): Promise<string> {
  try {
    // Solo mostrar logs resumidos en producción
    console.log(`📤 Enviando solicitud a la API para generar respuesta usando modelo: ${CHAT_MODEL}`);
    console.log('📝 Estructura de mensajes:', JSON.stringify(messages.map(m => ({
      role: m.role,
      content_preview: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
    })), null, 2));
    
    // Logs detallados solo en desarrollo
    if (import.meta.env.DEV) {
      console.log('🔍 [DEV ONLY] PROMPT COMPLETO ENVIADO A LA API:');
      messages.forEach((msg, index) => {
        console.log(`\n--- MENSAJE ${index + 1} (${msg.role.toUpperCase()}) ---`);
        console.log(msg.content);
        console.log('-------------------------------------------');
      });
    }
    
    try {
      console.time('⏱️ Tiempo de respuesta API');
      
      let response;
      if (import.meta.env.DEV) {
        // En desarrollo, llamamos directamente a la API de OpenAI
        response = await fetch(`${API_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            messages: messages.map(m => ({ 
              role: m.role as 'system' | 'user' | 'assistant', 
              content: m.content 
            })),
            model: CHAT_MODEL,
            temperature: 0.7,
            max_tokens: 3000,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
          })
        });
      } else {
        // En producción, usamos nuestras funciones serverless
        response = await fetch(`${API_BASE_URL}/openai`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'chat',
            messages: messages.map(m => ({ 
              role: m.role as 'system' | 'user' | 'assistant', 
              content: m.content 
            })),
            model: CHAT_MODEL,
            temperature: 0.7,
            max_tokens: 3000,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
          })
        });
      }

      if (!response.ok) {
        // Verificar si es un error de límite de uso
        if (response.status === 429) {
          return "Lo siento, se ha alcanzado el límite de uso de la API. Por favor, intenta de nuevo más tarde.";
        }
        throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.timeEnd('⏱️ Tiempo de respuesta API');
      
      let botResponse;
      if (import.meta.env.DEV) {
        // La API de OpenAI devuelve la respuesta en un formato diferente
        botResponse = data.choices[0].message.content || 'Lo siento, no pude generar una respuesta.';
      } else {
        botResponse = data.response || 'Lo siento, no pude generar una respuesta.';
      }
      
      // Guardar respuesta de bienvenida en caché
      if (messages[0].role === 'user' && messages[0].content === "Hola, ¿puedes ayudarme con esta actividad?" && botResponse) {
        welcomeResponseCache.set('default-welcome', botResponse);
      }
      
      return botResponse;
    } catch (error: any) {
      console.error('❌ Error en la API:', error);
      
      // Verificar si es un error de límite de uso
      if (error.message?.includes('429')) {
        return "Lo siento, se ha alcanzado el límite de uso de la API. Por favor, intenta de nuevo más tarde.";
      }
      
      return "Lo siento, ha ocurrido un error al generar la respuesta. Por favor, intenta de nuevo.";
    }
  } catch (error) {
    console.error('Error general en generateBotResponse:', error);
    return "Lo siento, ha ocurrido un error inesperado. Por favor, intenta de nuevo más tarde.";
  }
}