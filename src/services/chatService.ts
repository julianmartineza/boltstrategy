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
      
      // Obtener el contexto de la conversación
      const context = await getChatContext(userId, activityId);
      
      // Obtener las instrucciones del sistema si están disponibles
      const systemInstructions = activityContent.system_instructions || '';
      
      // Obtener información de la etapa y actividad
      const stageName = activityContent.stage_name || 'Estrategia';
      const activityTitle = activityContent.title || 'Consultoría';
      
      // Obtener plantilla de prompt si existe
      const promptTemplate = activityContent.prompt_template || '';
      console.log('Plantilla de prompt:', promptTemplate ? 'Disponible' : 'No disponible');
      
      if (userMessage === "Hola, ¿puedes ayudarme con esta actividad?") {
        console.log('Generando respuesta de bienvenida');
      }
      
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
      
      // Limpiar interacciones antiguas si hay muchas
      if (interactionCount > 10) {
        await this.cleanUpOldInteractions(userId, activityId, interactionCount);
      }
      
      return botResponse;
    } catch (error) {
      console.error('Error generando respuesta:', error);
      return "Lo siento, ha ocurrido un error al generar una respuesta. Por favor, intenta de nuevo más tarde.";
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
