import { ActivityContent } from '../types';
import { generateBotResponse } from '../lib/openai';
import { supabase } from '../lib/supabase';

// Interfaz para el resultado de evaluación
interface EvaluationResult {
  isCompleted: boolean;
  message: string;
  details?: any;
}

// Caché para evitar solicitudes duplicadas
const requestCache = new Map<string, { 
  response: string; 
  timestamp: number; 
  evaluationResult?: EvaluationResult | null 
}>();

// Tiempo de expiración de la caché en milisegundos (5 minutos)
const CACHE_EXPIRATION = 5 * 60 * 1000;

export const chatService = {
  /**
   * Obtiene una respuesta cacheada si existe
   * @param cacheKey Clave de la caché
   * @returns Respuesta cacheada o null si no existe
   */
  getCachedResponse(cacheKey: string) {
    const cachedItem = requestCache.get(cacheKey);
    
    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_EXPIRATION) {
      return cachedItem;
    }
    
    return null;
  },
  /**
   * Genera una respuesta del bot basada en un mensaje del usuario
   * @param userMessage Mensaje del usuario
   * @param activityContent Contenido de la actividad actual
   * @param company Información de la empresa
   * @param interactionCount Número de interacciones previas
   * @returns Objeto con la respuesta generada y el resultado de la evaluación
   */
  async generateResponse(
    userMessage: string,
    activityContent: ActivityContent,
    company?: any,
    interactionCount: number = 0
  ): Promise<{ message: string; evaluationResult: EvaluationResult | null }> {
    try {
      console.log('Generando respuesta para mensaje:', userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''));
      
      // Crear una clave única para la caché basada en el mensaje y el contexto
      const cacheActivityId = activityContent?.id || 'unknown';
      const cacheUserId = activityContent?.user_id || 'unknown';
      const cacheKey = `${cacheActivityId}_${cacheUserId}_${interactionCount}_${userMessage}`;
      
      // Verificar si tenemos una respuesta en caché
      const cachedResponse = requestCache.get(cacheKey);
      const now = Date.now();
      
      if (cachedResponse && (now - cachedResponse.timestamp) < CACHE_EXPIRATION) {
        console.log('Usando respuesta en caché para evitar duplicados');
        return {
          message: cachedResponse.response,
          evaluationResult: cachedResponse.evaluationResult || null
        };
      }
      
      // Verificar si tenemos un ID de actividad válido
      if (!activityContent || !activityContent.id) {
        console.warn('⚠️ No hay ID de actividad válido para generar respuesta contextual');
        return {
          message: "Lo siento, no puedo procesar tu solicitud porque falta información sobre la actividad actual.",
          evaluationResult: null
        };
      }
      
      // Obtener el userId del activityContent
      const userId = activityContent.user_id;
      if (!userId) {
        console.warn('⚠️ No hay user_id en activityContent para generar respuesta contextual');
        return {
          message: "Lo siento, no puedo procesar tu solicitud porque falta información sobre el usuario.",
          evaluationResult: null
        };
      }
      
      const activityId = activityContent.id;
      console.log(`Generando respuesta para actividad ${activityId} y usuario ${userId}`);
      
      // Obtener las instrucciones del sistema si están disponibles
      let systemInstructions = null;
      
      // Intentar obtener las instrucciones del sistema de diferentes fuentes posibles
      if (activityContent.system_instructions) {
        systemInstructions = activityContent.system_instructions;
      } else if (typeof activityContent.activity_data === 'object' && activityContent.activity_data?.system_instructions) {
        systemInstructions = activityContent.activity_data.system_instructions;
      } else if (typeof activityContent.activity_data === 'string') {
        try {
          const parsedData = JSON.parse(activityContent.activity_data);
          systemInstructions = parsedData.system_instructions;
        } catch (e) {
          console.error('Error al parsear activity_data para obtener system_instructions:', e);
        }
      }
      
      // Obtener el prompt específico de la actividad
      let activityPrompt = null;
      
      // Intentar obtener el prompt de diferentes fuentes posibles
      if (activityContent.prompt) {
        activityPrompt = activityContent.prompt;
      } else if (typeof activityContent.activity_data === 'object' && activityContent.activity_data?.prompt) {
        activityPrompt = activityContent.activity_data.prompt;
      } else if (typeof activityContent.activity_data === 'string') {
        try {
          const parsedData = JSON.parse(activityContent.activity_data);
          activityPrompt = parsedData.prompt;
        } catch (e) {
          // Error ya registrado anteriormente
        }
      }
      
      // Obtener información del programa al que pertenece la actividad
      let programContext = `Eres un consultor de negocios especializado`;
      try {
        // Primero intentamos obtener el programa desde stage_content
        if (activityContent.stage_id) {
          const { data: stageData, error: stageError } = await supabase
            .from('strategy_stages')
            .select('program_id')
            .eq('id', activityContent.stage_id)
            .single();
          
          if (stageError) {
            console.error('Error al obtener el stage_id:', stageError);
          } else if (stageData?.program_id) {
            // Verificar que el program_id sea un UUID válido antes de hacer la consulta
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(stageData.program_id)) {
              const { data: programData, error: programError } = await supabase
                .from('programs')
                .select("name, description")
                .eq('id', stageData.program_id)
                .single();
              
              if (programError) {
                console.error('Error al obtener información del programa:', programError);
              } else if (programData) {
                programContext = `Eres un consultor de negocios especializado en ${programData.name}. ${programData.description || ''}`;
              }
            } else {
              console.error('ID de programa inválido:', stageData.program_id);
            }
          }
        }
      } catch (error) {
        console.error('Error al obtener información del programa:', error);
      }
      
      // Construir el prompt completo para las instrucciones del sistema
      let finalPrompt = `Responde a la siguiente consulta del usuario: "${userMessage}"`;
      
      if (activityPrompt) {
        finalPrompt += `\n\nInstrucciones específicas para esta actividad: ${activityPrompt}`;
      }
      
      if (systemInstructions) {
        finalPrompt += `\n\nComportamiento esperado: ${systemInstructions}`;
      }
      
      // Añadir información de la empresa si está disponible
      if (company) {
        finalPrompt += `\n\nInformación de la empresa: ${company.name}, Industria: ${company.industry}, Tamaño: ${company.size}`;
      }
      
      // Generar instrucciones de evaluación si corresponde
      let evaluationInstructions = '';
      try {
        // Importar la función para generar instrucciones de evaluación
        const { shouldEvaluate, generateEvaluationInstructions } = await import('./activityCompletionService');
        
        // Verificar si esta interacción debe incluir evaluación
        const shouldIncludeEvaluation = await shouldEvaluate(activityId, interactionCount);
        
        // Generar instrucciones de evaluación si corresponde
        if (shouldIncludeEvaluation && activityContent.activity_data) {
          evaluationInstructions = await generateEvaluationInstructions(
            activityId,
            activityContent.activity_data as any,
            interactionCount
          );
          console.log(`🔍 Añadiendo instrucciones de evaluación para interacción ${interactionCount}`);
        }
      } catch (error) {
        console.error('Error al generar instrucciones de evaluación:', error);
      }
      
      // Importar la función para generar el contexto
      const { generateContextForOpenAI } = await import('../lib/chatMemoryService');
      
      // Generar el contexto completo que incluye historial, resúmenes y dependencias
      const context = await generateContextForOpenAI(
        userId,
        activityId,
        userMessage,
        finalPrompt
      );
      
      // Añadir las instrucciones de evaluación como segundo mensaje del sistema (después del contexto del programa)
      // Esto hace que las instrucciones sean más prominentes para el modelo
      if (evaluationInstructions) {
        context.unshift({ role: 'system', content: evaluationInstructions });
      }
      
      // Añadir el contexto del programa como primer mensaje del sistema
      context.unshift({ role: 'system', content: programContext });
      
      // Log detallado del prompt solo en desarrollo
      if (import.meta.env.DEV) {
        console.log('\n🔎 [DEV ONLY] DETALLES DEL PROMPT CONSTRUIDO EN CHAT SERVICE:');
        console.log('Contexto del programa:', programContext);
        console.log('Prompt final:', finalPrompt);
        console.log('Contexto de conversación:', context ? `${context.length - 2} mensajes previos` : 'Ninguno');
        console.log('Mensaje del usuario:', userMessage);
        console.log('-------------------------------------------\n');
      }
      
      // Generar la respuesta
      const fullResponse = await generateBotResponse(context);
      
      // Procesar la respuesta para extraer la evaluación si existe
      let response = fullResponse;
      let evaluationResult = null;
      
      // Buscar la sección de evaluación en la respuesta usando diferentes posibles separadores
      // Esto hace que la extracción sea más robusta frente a variaciones en el formato
      const possibleSeparators = [
        '---EVALUACION---',
        '---EVALUACIÓN---',
        '--- EVALUACION ---',
        '--- EVALUACIÓN ---',
        'EVALUACION:',
        'EVALUACIÓN:',
        '\n\nEVALUACION\n',
        '\n\nEVALUACIÓN\n'
      ];
      
      console.log(`🔍 Verificando si la respuesta contiene evaluación (longitud de respuesta: ${fullResponse.length} caracteres)`);
      
      // Buscar el primer separador que funcione
      let foundSeparator: string | null = null;
      let parts: string[] = [];
      
      for (const separator of possibleSeparators) {
        if (fullResponse.includes(separator)) {
          parts = fullResponse.split(separator);
          if (parts.length > 1) {
            foundSeparator = separator;
            console.log(`✅ Separador de evaluación encontrado: "${separator}"`);
            break;
          }
        }
      }
      
      // Si encontramos un separador válido
      if (foundSeparator && parts.length > 1) {
        // Extraer la respuesta normal y la evaluación
        response = parts[0].trim();
        let evaluationText = parts[1].trim();
        
        console.log(`✅ Evaluación encontrada en la respuesta. Texto de evaluación: ${evaluationText.substring(0, 50)}...`);
        
        // Limpiar el texto de evaluación para asegurar que sea JSON válido
        // Eliminar comillas iniciales y finales adicionales si existen
        evaluationText = evaluationText.replace(/^["'\s{]+/, '{').replace(/["'\s}]+$/, '}');
        
        // Intentar parsear el JSON de evaluación
        try {
          evaluationResult = JSON.parse(evaluationText);
          console.log('🔍 Evaluación extraída de la respuesta:', evaluationResult.isCompleted ? '✅ Completada' : '❌ No completada');
          
          // Procesar el resultado de la evaluación
          if (evaluationResult.isCompleted) {
            try {
              // Importar la función para registrar la evaluación
              const { logEvaluation } = await import('./activityCompletionService');
              
              // Crear el registro de evaluación
              // Generar un hash simple para la conversación
              const conversationHash = `${userId}_${activityId}_${Date.now()}`;
              console.log(`Generando hash de conversación para evaluación: ${conversationHash}`);
              
              await logEvaluation({
                activityId: activityId,
                userId: userId,
                rubricScores: evaluationResult.details?.rubric || {},
                overallScore: evaluationResult.details?.overallScore || 1.0,
                feedbackMessage: evaluationResult.message,
                isCompleted: true,
                conversationHash: conversationHash
              });
              
              console.log('✅ Evaluación registrada en la base de datos');
            } catch (evalError) {
              console.error('Error al registrar la evaluación:', evalError);
            }
          }
        } catch (parseError) {
          console.error('Error al parsear la evaluación:', parseError);
        }
      } else {
        console.log('⚠️ No se encontró la sección de evaluación en la respuesta. Esto puede indicar un problema con las instrucciones o con el modelo.');
        console.log('💡 Contenido parcial de la respuesta:', fullResponse.substring(0, 100) + '...');
        
        // Verificar si deberíamos haber tenido una evaluación según la lógica existente
        const { shouldEvaluate } = await import('./activityCompletionService');
        const shouldHaveEvaluation = await shouldEvaluate(activityId, interactionCount);
        
        if (shouldHaveEvaluation) {
          console.log('⚠️ ADVERTENCIA: Esta interacción debería haber incluido una evaluación. Revise las instrucciones del modelo.');
          
          // Obtener información adicional de diagnóstico
          try {
            // Importar el servicio completo para acceder a sus funciones internas
            const activityService = await import('./activityCompletionService');
            
            // Verificar si hay datos de actividad
            if (activityContent.activity_data) {
              console.log(`📑 Datos de actividad disponibles: ${Object.keys(activityContent.activity_data).join(', ')}`);
              
              // Verificar criterios de completitud
              if (activityContent.activity_data.completion_criteria) {
                console.log(`📑 Criterios de completitud: ${JSON.stringify(activityContent.activity_data.completion_criteria)}`);
              }
              
              // Verificar si usa evaluación avanzada (si existe la propiedad)
              const advancedEval = (activityContent.activity_data as any).use_advanced_evaluation;
              if (advancedEval !== undefined) {
                console.log(`📑 Usa evaluación avanzada: ${advancedEval}`);
              }
              
              // Generar instrucciones de evaluación para ver qué contendrían
              const evalInstructions = await activityService.generateEvaluationInstructions(
                activityId,
                activityContent.activity_data as any,
                interactionCount
              );
              
              // Verificar si las instrucciones contienen secciones importantes
              console.log(`📝 Longitud de instrucciones de evaluación: ${evalInstructions.length} caracteres`);
              console.log(`📝 Contiene sección de entregables: ${evalInstructions.includes('Entregables Requeridos')}`);
              console.log(`📝 Contiene sección de rúbrica: ${evalInstructions.includes('Criterios de Evaluación')}`);
              console.log(`📝 Contiene criterios básicos: ${evalInstructions.includes('Criterios Básicos')}`);
            } else {
              console.log('⚠️ No hay datos de actividad disponibles para la evaluación');
            }
          } catch (error) {
            console.error('Error al obtener información de diagnóstico para la evaluación:', error);
          }
        } else {
          console.log('ℹ️ Información: Esta interacción no requiere evaluación según la lógica actual (cada 3 interacciones o la primera).');
        }
      }
      
      // Guardar la respuesta en la caché para evitar solicitudes duplicadas
      requestCache.set(cacheKey, {
        response,
        timestamp: Date.now(),
        evaluationResult
      });
      console.log('Respuesta guardada en caché con clave:', cacheKey.substring(0, 30) + '...');
      
      // Guardar la interacción en la base de datos con embeddings
      try {
        // Importamos la función directamente para evitar problemas de importación circular
        const { saveInteractionWithEmbeddings } = await import('../lib/openai');
        
        // Guardar la interacción y obtener el ID real utilizado
        // Este ID puede ser diferente del original si hay mapeos en content_registry
        const realActivityId = await saveInteractionWithEmbeddings(userId, activityId, userMessage, response);
        
        // Si el ID real es diferente del original, registrarlo para futuras referencias
        if (realActivityId !== activityId) {
          console.log(`🔑 ID original: ${activityId} -> ID real utilizado: ${realActivityId}`);
          
          // Actualizar el ID en activityContent para futuras operaciones
          // Esto asegura que las evaluaciones usen el ID correcto
          if (activityContent) {
            activityContent.real_activity_id = realActivityId;
          }
        }
        
        console.log('✅ Interacción guardada correctamente para activity_id:', realActivityId);
      } catch (error) {
        console.error('Error al guardar interacción con embeddings:', error);
        
        // Intento de respaldo: guardar sin embeddings
        try {
          await supabase.from('activity_interactions').insert({
            user_id: userId,
            activity_id: activityId,
            user_message: userMessage,
            ai_response: response,
            timestamp: new Date().toISOString()
          });
          console.log('✅ Interacción guardada correctamente sin embeddings (respaldo)');
        } catch (backupError) {
          console.error('Error al guardar interacción sin embeddings:', backupError);
        }
      }
      
      // Limpiar interacciones antiguas si hay demasiadas
      if (interactionCount > 10) {
        // Importar la función cleanUpInteractions para generar resúmenes
        const { cleanUpInteractions } = await import('../lib/chatMemoryService');
        await cleanUpInteractions(userId, activityId);
      }
      
      return {
        message: response,
        evaluationResult
      };
    } catch (error) {
      console.error('Error al generar respuesta:', error);
      return {
        message: "Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo.",
        evaluationResult: null
      };
    }
  },
  
  /**
   * Genera una respuesta inicial del bot sin necesidad de un mensaje del usuario
   * @param activityContent Contenido de la actividad actual
   * @param company Información de la empresa
   * @param systemMessage Mensaje del sistema para guiar la generación
   * @returns Respuesta generada
   */
  async generateInitialResponse(
    activityContent: ActivityContent,
    company?: any,
    systemMessage?: { role: string, content: string }
  ): Promise<string> {
    try {
      // Verificar si tenemos un ID de actividad válido
      if (!activityContent || !activityContent.id) {
        console.warn('⚠️ No hay ID de actividad válido para generar respuesta inicial');
        return "Lo siento, no puedo iniciar la conversación porque falta información sobre la actividad actual.";
      }
      
      // Obtener el userId del activityContent
      const userId = activityContent.user_id;
      if (!userId) {
        console.warn('⚠️ No hay user_id en activityContent para generar respuesta inicial');
        return "Lo siento, no puedo iniciar la conversación porque falta información sobre el usuario.";
      }
      
      const activityId = activityContent.id;
      console.log(`Generando respuesta inicial para actividad ${activityId} y usuario ${userId}`);
      
      // Obtener las instrucciones del sistema si están disponibles
      let systemInstructions = null;
      
      // Intentar obtener las instrucciones del sistema de diferentes fuentes posibles
      if (activityContent.system_instructions) {
        systemInstructions = activityContent.system_instructions;
      } else if (typeof activityContent.activity_data === 'object' && activityContent.activity_data?.system_instructions) {
        systemInstructions = activityContent.activity_data.system_instructions;
      } else if (typeof activityContent.activity_data === 'string') {
        try {
          const parsedData = JSON.parse(activityContent.activity_data);
          systemInstructions = parsedData.system_instructions;
        } catch (e) {
          console.error('Error al parsear activity_data para obtener system_instructions:', e);
        }
      }
      
      // Obtener el prompt específico de la actividad
      let activityPrompt = null;
      
      // Intentar obtener el prompt de diferentes fuentes posibles
      if (activityContent.prompt) {
        activityPrompt = activityContent.prompt;
      } else if (typeof activityContent.activity_data === 'object' && activityContent.activity_data?.prompt) {
        activityPrompt = activityContent.activity_data.prompt;
      } else if (typeof activityContent.activity_data === 'string') {
        try {
          const parsedData = JSON.parse(activityContent.activity_data);
          activityPrompt = parsedData.prompt;
        } catch (e) {
          // Error ya registrado anteriormente
        }
      }
      
      // Obtener información del programa al que pertenece la actividad
      let programContext = `Eres un consultor de negocios especializado`;
      try {
        // Primero intentamos obtener el programa desde stage_content
        if (activityContent.stage_id) {
          const { data: stageData, error: stageError } = await supabase
            .from('strategy_stages')
            .select('program_id')
            .eq('id', activityContent.stage_id)
            .single();
          
          if (stageError) {
            console.error('Error al obtener el stage_id:', stageError);
          } else if (stageData?.program_id) {
            // Verificar que el program_id sea un UUID válido antes de hacer la consulta
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(stageData.program_id)) {
              const { data: programData, error: programError } = await supabase
                .from('programs')
                .select("name, description")
                .eq('id', stageData.program_id)
                .single();
              
              if (programError) {
                console.error('Error al obtener información del programa:', programError);
              } else if (programData) {
                programContext = `Eres un consultor de negocios especializado en ${programData.title}. ${programData.description || ''}`;
              }
            } else {
              console.error('ID de programa inválido:', stageData.program_id);
            }
          }
        }
      } catch (error) {
        console.error('Error al obtener información del programa:', error);
      }
      
      // Construir el prompt completo para las instrucciones del sistema
      let finalPrompt = systemMessage?.content || 
        `Inicia la conversación para la actividad "${activityContent.title}". Explica brevemente el propósito de esta actividad y cómo puede ayudar al usuario.`;
      
      if (activityPrompt) {
        finalPrompt += `\n\nInstrucciones específicas para esta actividad: ${activityPrompt}`;
      }
      
      if (systemInstructions) {
        finalPrompt += `\n\nComportamiento esperado: ${systemInstructions}`;
      }
      
      // Añadir información de la empresa si está disponible
      if (company) {
        finalPrompt += `\n\nInformación de la empresa: ${company.name}, Industria: ${company.industry}, Tamaño: ${company.size}`;
      }
      
      // Importar la función generateContextForOpenAI para obtener el contexto completo
      const { generateContextForOpenAI } = await import('../lib/chatMemoryService');
      
      // Generar el contexto completo que incluye historial, resúmenes y dependencias
      const context = await generateContextForOpenAI(
        userId,
        activityId,
        'INICIO_CONVERSACION',
        finalPrompt
      );
      
      // Añadir el contexto del programa como primer mensaje del sistema
      context.unshift({ role: 'system', content: programContext });
      
      // Log detallado del prompt solo en desarrollo
      if (import.meta.env.DEV) {
        console.log('\n🔎 [DEV ONLY] DETALLES DEL PROMPT CONSTRUIDO EN CHAT SERVICE:');
        console.log('Contexto del programa:', programContext);
        console.log('Prompt final:', finalPrompt);
        console.log('Contexto de conversación:', context ? `${context.length - 2} mensajes previos` : 'Ninguno');
        console.log('Mensaje del sistema:', systemMessage?.content || 'No hay mensaje del sistema');
        console.log('-------------------------------------------\n');
      }
      
      // Generar la respuesta
      const response = await generateBotResponse(context);
      
      // Guardar la interacción en la base de datos
      try {
        // Primero intentamos guardar con embeddings para mejorar la búsqueda vectorial
        try {
          // Importamos la función directamente para evitar problemas de importación circular
          const { saveInteractionWithEmbeddings } = await import('../lib/openai');
          await saveInteractionWithEmbeddings(userId, activityId, 'INICIO_CONVERSACION', response);
          console.log('✅ Interacción inicial guardada correctamente con embeddings');
        } catch (embeddingError) {
          console.error('Error al guardar interacción inicial con embeddings:', embeddingError);
          
          // Si falla, guardamos sin embeddings como respaldo
          await supabase.from('activity_interactions').insert({
            user_id: userId,
            activity_id: activityId,
            user_message: 'INICIO_CONVERSACION',
            ai_response: response,
            interaction_type: 'initial',
            timestamp: new Date().toISOString()
          });
          console.log('✅ Interacción inicial guardada sin embeddings (respaldo)');
        }
      } catch (error) {
        console.error('Error al guardar la interacción inicial:', error);
      }
      
      return response;
    } catch (error) {
      console.error('Error al generar respuesta inicial:', error);
      return 'Lo siento, ha ocurrido un error al iniciar la conversación. Por favor, intenta nuevamente.';
    }
  },
  
  // Procesar comandos especiales en los mensajes
  processSpecialCommands: (message: string) => {
    // Comando para limpiar el chat
    if (message.trim().toLowerCase() === '/clear') {
      return { type: 'clear_chat', content: '' };
    }
    
    // Comando para guardar un insight
    if (message.trim().toLowerCase().startsWith('/save ')) {
      const content = message.substring(6).trim();
      if (content) {
        return { type: 'save_insight', content };
      }
    }
    
    // No es un comando especial
    return { type: 'normal', content: message };
  },
  
  // Obtener el historial de chat para evaluación
  async getChatHistoryForEvaluation(userId: string, activityId: string): Promise<Array<{role: string, content: string}>> {
    try {
      // Verificar si hay un ID real para la actividad
      let realActivityId = activityId;
      const { data: registryData } = await supabase
        .from('content_registry')
        .select('content_id')
        .eq('id', activityId)
        .maybeSingle();
      
      if (registryData?.content_id) {
        realActivityId = registryData.content_id;
        console.log(`✅ Usando ID real para obtener historial: ${realActivityId}`);
      }
      
      // Obtener las últimas 20 interacciones
      const { data: interactions, error } = await supabase
        .from('chat_interactions')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_id', realActivityId)
        .order('created_at', { ascending: true })
        .limit(20);
      
      if (error) {
        console.error('Error al obtener interacciones:', error);
        return [];
      }
      
      if (!interactions || interactions.length === 0) {
        console.log('No se encontraron interacciones para la evaluación');
        return [];
      }
      
      console.log(`✅ Se encontraron ${interactions.length} interacciones para la evaluación`);
      
      // Convertir las interacciones al formato requerido
      const chatHistory = interactions.flatMap(interaction => [
        { role: 'user', content: interaction.user_message },
        { role: 'assistant', content: interaction.bot_message }
      ]);
      
      return chatHistory;
    } catch (error) {
      console.error('Error al obtener historial de chat para evaluación:', error);
      return [];
    }
  },
  
  // Limpiar interacciones antiguas para mantener el rendimiento
  async cleanUpOldInteractions(userId: string, activityId: string, currentCount: number) {
    try {
      // Solo mantener las últimas 10 interacciones
      const keepCount = 10;
      
      if (currentCount <= keepCount) {
        return; // No hay necesidad de limpiar
      }
      
      console.log(`Limpiando interacciones antiguas para usuario ${userId} y actividad ${activityId}`);
      
      // Obtener todas las interacciones ordenadas por fecha
      const { data, error } = await supabase
        .from('activity_interactions')
        .select('id, timestamp')
        .eq('user_id', userId)
        .eq('activity_id', activityId)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Error obteniendo interacciones para limpiar:', error);
        return;
      }
      
      if (!data || data.length <= keepCount) {
        return; // No hay suficientes interacciones para limpiar
      }
      
      // Calcular cuántas interacciones eliminar
      const deleteCount = data.length - keepCount;
      const idsToDelete = data.slice(0, deleteCount).map(item => item.id);
      
      // Eliminar las interacciones más antiguas
      const { error: deleteError } = await supabase
        .from('activity_interactions')
        .delete()
        .in('id', idsToDelete);
      
      if (deleteError) {
        console.error('Error eliminando interacciones antiguas:', deleteError);
      } else {
        console.log(`Se eliminaron ${deleteCount} interacciones antiguas`);
      }
    } catch (error) {
      console.error('Error en cleanUpOldInteractions:', error);
    }
  }
};

// Interfaz para los mensajes del contexto
// Esta interfaz ya no se utiliza porque la función getChatContext está comentada
/*
interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
*/

/**
 * Obtiene el contexto de chat para una actividad
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @returns Array de mensajes para el contexto
 * @deprecated Esta función ya no se utiliza. Se ha reemplazado por generateContextForOpenAI en chatMemoryService.ts
 */
/*
async function getChatContext(userId: string, activityId: string): Promise<any[]> {
  try {
    // Obtener las últimas 5 interacciones para este usuario y actividad
    const { data, error } = await supabase
      .from('activity_interactions')
      .select('user_message, ai_response, timestamp')
      .eq('user_id', userId)
      .eq('activity_id', activityId)
      .order('timestamp', { ascending: true })
      .limit(5);
    
    if (error) {
      console.error('Error obteniendo contexto de chat:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Convertir las interacciones en formato de contexto para OpenAI
    const context: any[] = [];
    
    data.forEach(interaction => {
      // Añadir mensaje del usuario
      context.push({
        role: 'user',
        content: interaction.user_message
      });
      
      // Añadir respuesta de la IA
      context.push({
        role: 'assistant',
        content: interaction.ai_response
      });
    });
    
    return context;
  } catch (error) {
    console.error('Error en getChatContext:', error);
    return [];
  }
}
*/
