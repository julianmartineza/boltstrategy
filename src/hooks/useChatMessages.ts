import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types';
import { 
  updateShortTermMemoryWithParams, 
  clearShortTermMemory
} from '../lib/chatMemoryService';

export function useChatMessages(userId?: string, activityId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [interactionCount, setInteractionCount] = useState<number>(0);

  // Cargar mensajes previos
  const loadPreviousMessages = useCallback(async () => {
    if (!userId || !activityId || userId === undefined || activityId === undefined) {
      console.log('No se pueden cargar mensajes: userId o activityId no disponibles');
      return;
    }

    try {
      // Cargar mensajes anteriores para esta actividad específica
      const { data: interactions, error } = await supabase
        .from('activity_interactions')
        .select('user_message, ai_response, timestamp')
        .eq('user_id', userId)
        .eq('activity_id', activityId)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading previous messages:', error);
        return;
      }

      // Convertir los datos a formato de mensajes
      if (interactions && interactions.length > 0) {
        const loadedMessages: Message[] = [];
        
        // Procesar las interacciones fuera del bucle para evitar múltiples actualizaciones
        for (const interaction of interactions) {
          // Mensaje del usuario
          loadedMessages.push({
            id: `user-${interaction.timestamp}`,
            content: interaction.user_message,
            sender: 'user',
            timestamp: new Date(interaction.timestamp)
          });
          
          // Respuesta de la IA
          loadedMessages.push({
            id: `ai-${interaction.timestamp}`,
            content: interaction.ai_response,
            sender: 'ai',
            timestamp: new Date(interaction.timestamp)
          });
        }
        
        // Actualizar memoria de corto plazo una sola vez al final
        const memoryUpdates = [];
        for (const interaction of interactions) {
          memoryUpdates.push({
            role: 'user',
            content: interaction.user_message
          });
          
          memoryUpdates.push({
            role: 'assistant',
            content: interaction.ai_response
          });
        }
        
        // Limpiar primero para evitar duplicados
        clearShortTermMemory();
        
        // Aplicar todas las actualizaciones de memoria
        for (const update of memoryUpdates) {
          updateShortTermMemoryWithParams(update.content, update.role as 'user' | 'assistant' | 'system');
        }
        
        setMessages(loadedMessages);
        setInteractionCount(interactions.length);
      }
    } catch (error) {
      console.error('Error in loadPreviousMessages:', error);
    }
  }, [userId, activityId]);

  // Añadir mensaje del usuario
  const addUserMessage = useCallback((content: string) => {
    const newMessage: Message = {
      id: `user-${Date.now()}`,
      content,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Actualizar memoria de corto plazo utilizando la función con parámetros
    updateShortTermMemoryWithParams(content, 'user');
    
    return newMessage;
  }, []);

  // Añadir mensaje de la IA
  const addAIMessage = useCallback((content: string, metadata?: any) => {
    const newMessage: Message = {
      id: `ai-${Date.now()}`,
      content,
      sender: 'ai',
      timestamp: new Date(),
      metadata
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Actualizar memoria de corto plazo utilizando la función con parámetros
    updateShortTermMemoryWithParams(content, 'assistant');
    
    return newMessage;
  }, []);

  // Guardar interacción en la base de datos
  const saveInteraction = useCallback(async (userMessage: string, aiResponse: string) => {
    if (!userId || !activityId) return;
    
    try {
      const { error } = await supabase
        .from('activity_interactions')
        .insert({
          user_id: userId,
          activity_id: activityId,
          user_message: userMessage,
          ai_response: aiResponse,
          timestamp: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error saving interaction:', error);
      } else {
        setInteractionCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error in saveInteraction:', error);
    }
  }, [userId, activityId]);

  return {
    messages,
    interactionCount,
    loadPreviousMessages,
    addUserMessage,
    addAIMessage,
    saveInteraction,
    clearMessages: () => {
      setMessages([]);
      clearShortTermMemory();
    }
  };
}
