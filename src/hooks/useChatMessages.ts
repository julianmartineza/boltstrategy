import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: Date;
  metadata?: {
    type?: 'error' | 'info' | 'warning' | 'success';
    isQuotaError?: boolean;
  };
}

export function useChatMessages(userId?: string, activityId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const isLoadingRef = useRef(false);
  
  // Cargar mensajes previos
  const loadPreviousMessages = useCallback(async (forceReload: boolean = false) => {
    if (!userId || !activityId) {
      console.log('No se pueden cargar mensajes sin userId o activityId');
      setMessagesLoaded(true);
      return;
    }
    
    // Si ya están cargados y no se fuerza recarga, no hacer nada
    if (messagesLoaded && !forceReload) {
      console.log('Mensajes ya cargados, omitiendo carga');
      return;
    }
    
    // Evitar cargas simultáneas
    if (isLoadingRef.current) {
      console.log('Ya hay una carga en progreso, omitiendo');
      return;
    }
    
    isLoadingRef.current = true;
    console.log(`Cargando mensajes para usuario ${userId} y actividad ${activityId}`);
    
    try {
      // Verificar si el activity_id es válido
      if (!activityId || activityId === 'undefined' || activityId === 'null') {
        console.error('❌ No se pueden cargar mensajes: activity_id no válido', { activityId });
        setMessagesLoaded(true);
        isLoadingRef.current = false;
        return;
      }
      
      // Validar el ID de actividad (similar a saveInteractionWithEmbeddings)
      let validActivityId = activityId;
      let shouldCheckAlternativeId = true;
      
      // Paso 1: Intentar cargar mensajes con el ID original
      let { data, error } = await supabase
        .from('activity_interactions')
        .select('user_message, ai_response, timestamp')
        .eq('user_id', userId)
        .eq('activity_id', activityId)
        .order('timestamp', { ascending: true });
      
      // Si encontramos mensajes, no necesitamos buscar IDs alternativos
      if (!error && data && data.length > 0) {
        shouldCheckAlternativeId = false;
        console.log(`✅ Mensajes encontrados directamente con el ID original: ${activityId}`);
      } else {
        console.log(`⚠️ No se encontraron mensajes con el ID original: ${activityId}, buscando alternativas...`);
      }
      
      // Paso 2: Si no encontramos mensajes, verificar si el ID está en content_registry
      if (shouldCheckAlternativeId) {
        // Verificar si el ID es un ID de content_registry
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
            console.log('✅ Usando content_id como validActivityId:', validActivityId);
            
            // Intentar cargar mensajes con el ID validado
            const { data: validData, error: validError } = await supabase
              .from('activity_interactions')
              .select('user_message, ai_response, timestamp')
              .eq('user_id', userId)
              .eq('activity_id', validActivityId)
              .order('timestamp', { ascending: true });
            
            if (!validError) {
              data = validData;
              error = null;
            }
          }
        } else {
          // Paso 3: Verificar si existe una entrada en content_registry que mapee este ID como content_id
          const { data: contentRegistryData, error: contentRegistryError } = await supabase
            .from('content_registry')
            .select('id')
            .eq('content_table', 'activity_contents')
            .eq('content_type', 'activity')
            .eq('content_id', activityId)
            .maybeSingle();
          
          if (!contentRegistryError && contentRegistryData && contentRegistryData.id) {
            console.log('✅ Encontrado mapeo en content_registry a activity_contents:', contentRegistryData.id);
            validActivityId = contentRegistryData.id;
            
            // Intentar cargar mensajes con el ID validado
            const { data: validData, error: validError } = await supabase
              .from('activity_interactions')
              .select('user_message, ai_response, timestamp')
              .eq('user_id', userId)
              .eq('activity_id', validActivityId)
              .order('timestamp', { ascending: true });
            
            if (!validError) {
              data = validData;
              error = null;
            }
          } else {
            console.warn('⚠️ No se encontró mapeo en content_registry');
          }
        }
      }
      
      if (error) {
        console.error('Error cargando mensajes:', error);
        setMessagesLoaded(true);
        return;
      }
      
      if (data && data.length > 0) {
        const formattedMessages: ChatMessage[] = [];
        
        data.forEach(interaction => {
          // Mensaje del usuario
          formattedMessages.push({
            id: uuidv4(),
            sender: 'user',
            content: interaction.user_message,
            timestamp: new Date(interaction.timestamp)
          });
          
          // Respuesta de la IA
          formattedMessages.push({
            id: uuidv4(),
            sender: 'ai',
            content: interaction.ai_response,
            timestamp: new Date(interaction.timestamp)
          });
        });
        
        setMessages(formattedMessages);
        setInteractionCount(data.length);
        console.log(`Cargados ${data.length} interacciones (${formattedMessages.length} mensajes)`);
      } else {
        console.log('No hay mensajes previos para esta actividad');
      }
    } catch (error) {
      console.error('Error en loadPreviousMessages:', error);
    } finally {
      setMessagesLoaded(true);
      isLoadingRef.current = false;
    }
  }, [userId, activityId]);
  
  // Cargar mensajes cuando cambian userId o activityId
  useEffect(() => {
    // Resetear el estado cuando cambia el usuario o la actividad
    setMessages([]);
    setInteractionCount(0);
    setMessagesLoaded(false);
    
    if (userId && activityId) {
      loadPreviousMessages(true);
    }
  }, [userId, activityId]);
  
  // Añadir mensaje del usuario
  const addUserMessage = useCallback((content: string) => {
    // Verificar si el mensaje ya existe para evitar duplicados
    const isDuplicate = messages.some(
      msg => msg.sender === 'user' && msg.content === content && 
      // Verificar si el mensaje se añadió en los últimos 2 segundos
      (new Date().getTime() - msg.timestamp.getTime() < 2000)
    );
    
    if (isDuplicate) {
      console.log('Evitando mensaje duplicado del usuario:', content.substring(0, 30));
      return;
    }
    
    const newMessage: ChatMessage = {
      id: uuidv4(),
      sender: 'user',
      content,
      timestamp: new Date()
    };
    
    // Actualizar la memoria a corto plazo con el mensaje del usuario
    import('../lib/chatMemoryService').then(({ updateShortTermMemoryWithParams }) => {
      updateShortTermMemoryWithParams(content, 'user');
    }).catch(error => {
      console.error('Error al actualizar la memoria a corto plazo:', error);
    });
    
    setMessages(prev => [...prev, newMessage]);
  }, [messages]);
  
  // Añadir mensaje de la IA
  const addAIMessage = useCallback((content: string, metadata?: ChatMessage['metadata']) => {
    // Verificar si el mensaje ya existe para evitar duplicados
    const isDuplicate = messages.some(
      msg => msg.sender === 'ai' && msg.content === content && 
      // Verificar si el mensaje se añadió en los últimos 2 segundos
      (new Date().getTime() - msg.timestamp.getTime() < 2000)
    );
    
    if (isDuplicate) {
      console.log('Evitando mensaje duplicado de la IA:', content.substring(0, 30));
      return;
    }
    
    const newMessage: ChatMessage = {
      id: uuidv4(),
      sender: 'ai',
      content,
      timestamp: new Date(),
      metadata
    };
    
    // Actualizar la memoria a corto plazo con el mensaje de la IA
    // Solo actualizar si no es un mensaje de error
    if (!metadata?.type) {
      import('../lib/chatMemoryService').then(({ updateShortTermMemoryWithParams }) => {
        updateShortTermMemoryWithParams(content, 'assistant');
      }).catch(error => {
        console.error('Error al actualizar la memoria a corto plazo:', error);
      });
    }
    
    setMessages(prev => [...prev, newMessage]);
    
    // Solo incrementar contador si no es un mensaje de error
    if (!metadata?.type) {
      setInteractionCount(prev => prev + 1);
    }
  }, [messages]);
  
  // Limpiar mensajes
  const clearMessages = useCallback(() => {
    setMessages([]);
    setInteractionCount(0);
  }, []);
  
  // Obtener mensajes para el contexto de OpenAI
  const getMessagesForContext = useCallback(() => {
    return messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  }, [messages]);
  
  return {
    messages,
    interactionCount,
    messagesLoaded,
    loadPreviousMessages,
    addUserMessage,
    addAIMessage,
    clearMessages,
    getMessagesForContext
  };
}
