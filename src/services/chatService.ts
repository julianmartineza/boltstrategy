import { ActivityContent } from '../types';
import { generateBotResponse } from '../lib/openai';
import { supabase } from '../lib/supabase';

export const chatService = {
  /**
   * Genera una respuesta del bot basada en un mensaje del usuario
   * @param userMessage Mensaje del usuario
   * @param activityContent Contenido de la actividad actual
   * @param company Información de la empresa
   * @param interactionCount Número de interacciones previas
   * @returns Respuesta generada
   */
  async generateResponse(
    userMessage: string,
    activityContent: ActivityContent,
    company?: any,
    interactionCount: number = 0
  ): Promise<string> {
    try {
      console.log('Generando respuesta para mensaje:', userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : ''));
      
      // Verificar si tenemos un ID de actividad válido
      if (!activityContent || !activityContent.id) {
        console.warn('⚠️ No hay ID de actividad válido para generar respuesta contextual');
        return "Lo siento, no puedo procesar tu solicitud porque falta información sobre la actividad actual.";
      }
      
      // Obtener el userId del activityContent
      const userId = activityContent.user_id;
      if (!userId) {
        console.warn('⚠️ No hay user_id en activityContent para generar respuesta contextual');
        return "Lo siento, no puedo procesar tu solicitud porque falta información sobre el usuario.";
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
          const { data: stageData } = await supabase
            .from('strategy_stages')
            .select('program_id')
            .eq('id', activityContent.stage_id)
            .single();
          
          if (stageData?.program_id) {
            const { data: programData } = await supabase
              .from('programs')
              .select('title, description')
              .eq('id', stageData.program_id)
              .single();
            
            if (programData) {
              programContext = `Eres un consultor de negocios especializado en ${programData.title}. ${programData.description || ''}`;
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
      
      // Importar la función generateContextForOpenAI para obtener el contexto completo
      const { generateContextForOpenAI } = await import('../lib/chatMemoryService');
      
      // Generar el contexto completo que incluye historial, resúmenes y dependencias
      const context = await generateContextForOpenAI(
        userId,
        activityId,
        userMessage,
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
        console.log('Mensaje del usuario:', userMessage);
        console.log('-------------------------------------------\n');
      }
      
      // Generar la respuesta
      const response = await generateBotResponse(context);
      
      // Guardar la interacción en la base de datos con embeddings
      try {
        // Importamos la función directamente para evitar problemas de importación circular
        const { saveInteractionWithEmbeddings } = await import('../lib/openai');
        await saveInteractionWithEmbeddings(userId, activityId, userMessage, response);
        console.log('✅ Interacción guardada correctamente con embeddings');
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
      
      return response;
    } catch (error) {
      console.error('Error al generar respuesta:', error);
      return 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta nuevamente.';
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
          const { data: stageData } = await supabase
            .from('strategy_stages')
            .select('program_id')
            .eq('id', activityContent.stage_id)
            .single();
          
          if (stageData?.program_id) {
            const { data: programData } = await supabase
              .from('programs')
              .select('title, description')
              .eq('id', stageData.program_id)
              .single();
            
            if (programData) {
              programContext = `Eres un consultor de negocios especializado en ${programData.title}. ${programData.description || ''}`;
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
  
  // Limpiar interacciones antiguas para mantener el rendimiento
  cleanUpOldInteractions: async (userId: string, activityId: string, currentCount: number) => {
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
interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Obtiene el contexto de la conversación para un usuario y actividad específicos
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @returns Array de mensajes para el contexto
 */
async function getChatContext(userId: string, activityId: string): Promise<ContextMessage[]> {
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
    const context: ContextMessage[] = [];
    
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
