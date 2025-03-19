import { generateBotResponse } from '../lib/openai';
import { 
  generateContextForOpenAI,
  cleanUpInteractions
} from '../lib/chatMemoryService';
import { supabase } from '../lib/supabase';

export const chatService = {
  // Generar respuesta del bot
  generateResponse: async (
    userMessage: string, 
    activityContent: any, 
    company: any = null,
    interactionCount: number = 0
  ) => {
    try {
      // Extraer información necesaria para el contexto
      const userId = activityContent?.user_id || '';
      const activityId = activityContent?.id || '';
      const stageName = activityContent?.stage_name || 'Consultoría';
      const activityTitle = activityContent?.title || 'Conversación';
      
      // Verificar que tenemos los datos necesarios
      if (!userId) {
        console.error('Error: userId no disponible para generar respuesta');
        return 'Lo siento, no puedo procesar tu mensaje porque no se ha identificado correctamente el usuario. Por favor, intenta recargar la página.';
      }
      
      if (!activityId) {
        console.error('Error: activityId no disponible para generar respuesta');
        return 'Lo siento, no puedo procesar tu mensaje porque no se ha identificado correctamente la actividad. Por favor, intenta recargar la página.';
      }
      
      console.log('Generando respuesta con:', { userId, activityId, stageName, activityTitle });
      
      // Obtener instrucciones específicas de la actividad
      const systemInstructions = activityContent?.activity_data?.system_instructions || '';
      const promptTemplate = activityContent?.activity_data?.prompt || activityContent?.content || '';
      
      console.log('Instrucciones del sistema:', systemInstructions ? 'Disponibles' : 'No disponibles');
      console.log('Plantilla de prompt:', promptTemplate ? 'Disponible' : 'No disponible');
      
      // Determinar si es el primer mensaje (mensaje de bienvenida)
      const isFirstMessage = userMessage === "Hola, ¿puedes ayudarme con esta actividad?";
      
      // Para el primer mensaje, usamos un contexto más simple pero con las instrucciones específicas
      if (isFirstMessage) {
        console.log('Generando respuesta de bienvenida');
        
        // Crear un contexto para el primer mensaje que incluya las instrucciones específicas
        const botContext = {
          systemPrompt: systemInstructions || 
            `Eres un consultor de estrategia ayudando con la actividad "${activityTitle}" en la etapa "${stageName}". 
            Da una bienvenida breve y concisa (máximo 1 párrafo) explicando el propósito de esta actividad.
            ${promptTemplate ? `\nInstrucciones específicas: ${promptTemplate}` : ''}
            No incluyas información detallada sobre la empresa ni historial de conversaciones previas.`,
          stage: stageName || '',
          activity: activityTitle || '',
          previousMessages: [] as Array<{role: 'user' | 'assistant', content: string}>,
          context: company ? { 
            name: company.name,
            industry: company.industry
          } : null
        };
        
        // Generar respuesta con el contexto específico
        const botResponse = await generateBotResponse(
          userMessage, 
          botContext,
          userId,
          activityId
        );
        
        if (!botResponse) {
          throw new Error('No se pudo generar una respuesta de bienvenida');
        }
        
        return botResponse;
      }
      
      // Para mensajes normales, usamos el contexto completo con las instrucciones específicas
      // Generar contexto para la API de OpenAI
      const context = await generateContextForOpenAI(
        userId,
        activityId,
        userMessage,
        systemInstructions // Pasar las instrucciones específicas al contexto
      );
      
      // Filtrar los mensajes para que solo incluyan 'user' y 'assistant'
      const filteredContext = context
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant', // Asegurar que el tipo sea correcto
          content: msg.content
        }));
      
      // Crear el objeto de contexto en el formato esperado por generateBotResponse
      const botContext = {
        systemPrompt: systemInstructions || 
          `Eres un consultor de estrategia ayudando con la etapa "${stageName}", específicamente en la actividad "${activityTitle}".
          ${promptTemplate ? `\nInstrucciones específicas: ${promptTemplate}` : ''}`,
        stage: stageName,
        activity: activityTitle,
        previousMessages: filteredContext,
        context: company
      };
      
      // Generar respuesta
      const botResponse = await generateBotResponse(
        userMessage, 
        botContext,
        userId,
        activityId
      );
      
      if (!botResponse) {
        throw new Error('No se pudo generar una respuesta');
      }
      
      // Limpiar interacciones antiguas si hay muchas
      if (interactionCount > 10) {
        await chatService.cleanUpOldInteractions(userId, activityId, interactionCount);
      }
      
      return botResponse;
    } catch (error) {
      console.error('Error generating bot response:', error);
      throw error;
    }
  },
  
  // Procesar comandos especiales
  processSpecialCommands: (message: string) => {
    // Comando para guardar insight
    if (message.startsWith('/guardar ')) {
      const insightContent = message.substring('/guardar '.length).trim();
      return {
        type: 'save_insight',
        content: insightContent
      };
    }
    
    // Comando para limpiar el chat
    if (message === '/limpiar') {
      return {
        type: 'clear_chat'
      };
    }
    
    // No es un comando especial
    return {
      type: 'normal_message',
      content: message
    };
  },
  
  // Limpiar interacciones antiguas
  cleanUpOldInteractions: async (userId: string, activityId: string, interactionCount: number) => {
    // Si hay más de 10 interacciones, limpiar las más antiguas
    if (interactionCount > 10) {
      try {
        await cleanUpInteractions(userId, activityId);
        return true;
      } catch (error) {
        console.error('Error cleaning up interactions:', error);
        return false;
      }
    }
    return false;
  },
  
  // Obtener dependencias de una actividad
  fetchDependencies: async (activityId: string) => {
    try {
      const { data, error } = await supabase
        .from('stage_content')
        .select('dependencies')
        .eq('id', activityId)
        .single();

      if (error) {
        console.error('Error fetching dependencies:', error);
        return [];
      }

      if (!data || !data.dependencies) {
        console.log('No se encontraron dependencias para la actividad:', activityId);
        return [];
      }

      console.log('Dependencias encontradas:', data.dependencies);
      return data.dependencies;
    } catch (error) {
      console.error('Error fetching dependencies:', error);
      return [];
    }
  }
};
