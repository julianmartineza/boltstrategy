import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useProgramStore } from '../../store/programStore';
import { updateShortTermMemoryWithParams, clearShortTermMemory } from '../../lib/chatMemoryService';
import { useActivityContent } from '../../hooks/useActivityContent';
import { useChatMessages } from '../../hooks/useChatMessages';
import { useChatInsights } from '../../hooks/useChatInsights';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { InsightsList } from './InsightsList';
import { TypingIndicator } from './TypingIndicator';
import { ActivityContent } from '../../types';
import { chatService } from '../../services/chatService';
import { generateCompletionMessage } from '../../services/activityCompletionService';
import { MessageSquare, Lightbulb, BookOpen } from 'lucide-react';

import { WelcomeMessage } from './WelcomeMessage';

interface ChatProps {
  stageContentId?: string;
  activityContentProp?: ActivityContent;
}

export function Chat({ stageContentId, activityContentProp }: ChatProps = {}) {
  const { user } = useAuthStore();
  const { company, loadCompanyAndDiagnostic } = useProgramStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Usar hooks personalizados
  const { 
    activityContent, 
    setActivityContent,
    loading: activityLoading,
    error: activityError
  } = useActivityContent(stageContentId, activityContentProp);
  
  // Estado local para UI
  const [isLoading, setIsLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [loadingActivity, setLoadingActivity] = useState(false); // Estado local para tracking
  const [activityErrorMessage, setActivityErrorMessage] = useState<string | null>(null);
  const [isActivityCompleted, setIsActivityCompleted] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);

  // Sincronizar estado de carga de actividad
  useEffect(() => {
    setLoadingActivity(activityLoading);
    if (activityLoading) {
      console.log('Cargando contenido de actividad...');
    }
  }, [activityLoading]);

  // Guardar mensaje de error si ocurre
  useEffect(() => {
    if (activityError) {
      console.error('Error al cargar el contenido de la actividad:', activityError);
      setActivityErrorMessage('Lo siento, ha ocurrido un error al cargar la actividad. Por favor, intenta recargar la página.');
    }
  }, [activityError]);
  
  const { 
    messages, 
    interactionCount, 
    loadPreviousMessages, 
    addUserMessage, 
    addAIMessage, 
    clearMessages,
    messagesLoaded
  } = useChatMessages(user?.id, activityContent?.id);
  
  // Ya no necesitamos la función addSystemMessage porque la evaluación
  // ahora se integra directamente en la respuesta del chat
  
  // Mostrar mensaje de error si existe
  useEffect(() => {
    if (activityErrorMessage && addAIMessage) {
      addAIMessage(activityErrorMessage, { type: 'error' });
      setActivityErrorMessage(null);
    }
  }, [activityErrorMessage, addAIMessage]);
  
  const {
    insights,
    showInsightButton,
    saveInsight,
    showInsightButtonAfterResponse
  } = useChatInsights(user?.id, activityContent?.id);
  
  // Cargar datos iniciales
  useEffect(() => {
    if (user && user.id && !company) {
      loadCompanyAndDiagnostic(user.id);
    }
  }, [user, company, loadCompanyAndDiagnostic]);

  // Cargar mensajes previos cuando el contenido de la actividad esté disponible
  useEffect(() => {
    if (user && user.id && activityContent && activityContent.id && !messagesLoaded) {
      console.log(`Verificando carga de mensajes para actividad ${activityContent.id}`);
      // Solo cargar si no se han cargado previamente
      loadPreviousMessages(false);
    }
  }, [user, activityContent, loadPreviousMessages, messagesLoaded]);

  // Estado derivado para mostrar el mensaje de bienvenida
  const shouldShowWelcomeMessage = !loadingActivity && messagesLoaded && messages.length === 0;

  // Desplazarse al final de los mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Ya no necesitamos una función de evaluación separada porque la evaluación
  // ahora se realiza directamente en el servicio de chat

  // Manejar el envío de mensajes
  const handleSubmit = async () => {
    if (isLoading || !input.trim() || !user || !activityContent) return;
    
    // Procesar comandos especiales
    const commandResult = chatService.processSpecialCommands(input);
    
    if (commandResult.type === 'clear_chat') {
      clearMessages();
      setInput('');
      return;
    }
    
    if (commandResult.type === 'save_insight' && commandResult.content) {
      saveInsight(commandResult.content);
      setInput('');
      return;
    }
    
    // Mensaje normal
    const userMessage = commandResult.content || input;
    setIsLoading(true);
    
    try {
      // Añadir mensaje del usuario a la UI
      addUserMessage(userMessage);
      setInput('');
      
      // Actualizar la memoria a corto plazo con el mensaje del usuario
      updateShortTermMemoryWithParams(userMessage, 'user');
      
      // Log ANTES de llamar a generateResponse
      console.log('[handleSubmit] activityContent.id a punto de enviar:', activityContent.id);
      
      // Generar respuesta del bot (ahora incluye evaluación integrada)
      const response = await chatService.generateResponse(
        userMessage,
        activityContent,
        company,
        interactionCount
      );
      
          // La respuesta ahora es un objeto con mensaje y resultado de evaluación
      const botResponse = response.message;
      const evaluationResult = response.evaluationResult;
      
      // Actualizar la memoria a corto plazo con la respuesta del bot
      updateShortTermMemoryWithParams(botResponse, 'assistant');
      
      // Verificar si la respuesta contiene un mensaje de error de límite de cuota
      if (botResponse && botResponse.includes("límite de uso de la API")) {
        addAIMessage(botResponse, { type: 'error', isQuotaError: true });
      } else {
        // Añadir respuesta del bot a la UI
        addAIMessage(botResponse);
        
        // Mostrar botón de guardar insight
        showInsightButtonAfterResponse();
      }
      
      // Procesar el resultado de la evaluación si existe
      if (evaluationResult) {
        console.log('Resultado de evaluación recibido:', evaluationResult);
        
        if (evaluationResult.isCompleted && !isActivityCompleted) {
          setIsActivityCompleted(true);
          const completionMsg = evaluationResult.message || generateCompletionMessage(activityContent);
          setCompletionMessage(completionMsg);
          console.log('✅ Actividad completada:', completionMsg);
        }
      }
      
      // Actualizar contador de interacciones
      const newInteractionCount = interactionCount + 1;
      console.log(`Interacción ${newInteractionCount} completada`);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      addAIMessage(
        'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        { type: 'error' }
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Iniciar la conversación
  const handleStartConversation = async () => {
    // Limpiar la memoria a corto plazo al iniciar una nueva conversación
    clearShortTermMemory();
    if (!user || !user.id) {
      console.error('[handleStartConversation] No hay usuario logueado');
      addAIMessage('Por favor, inicia sesión para comenzar la conversación.', { type: 'error' });
      return;
    }
    
    if (!activityContent) {
      console.error('[handleStartConversation] No hay contenido de actividad disponible');
      addAIMessage('No se puede iniciar la conversación porque no hay información de la actividad.', { type: 'error' });
      return;
    }
    
    // Verificar que el ID de la actividad sea válido
    const activityId = activityContent.id || stageContentId;
    console.log('[handleStartConversation] activityId derivado:', activityId);
    
    if (!activityId) {
      console.error('[handleStartConversation] No hay ID de actividad disponible');
      addAIMessage('No se puede iniciar la conversación porque falta el identificador de la actividad.', { type: 'error' });
      return;
    }
    
    // Asegurarse de que la empresa esté cargada antes de iniciar la conversación
    if (!company && user.id) {
      console.log('Cargando datos de empresa para el usuario:', user.id);
      await loadCompanyAndDiagnostic(user.id);
    }
    
    setIsLoading(true);
    
    try {
      // Asegurarnos de que el objeto activityContent tenga los campos necesarios
      const enrichedActivityContent = {
        ...activityContent,
        user_id: user.id,  // Asegurarnos de que user_id esté presente
        id: activityId  // Usar el ID validado
      };
      
      console.log('Enviando datos enriquecidos al servicio de chat:', {
        userId: enrichedActivityContent.user_id,
        activityId: enrichedActivityContent.id,
        title: enrichedActivityContent.title
      });
      
      // Actualizar el activityContent con el user_id
      if (setActivityContent && typeof setActivityContent === 'function') {
        setActivityContent(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            user_id: user.id,
            id: prev.id || stageContentId || ''
          };
        });
      }
      
      // Obtener el mensaje inicial configurado
      let initialMessage = null;
      
      // Intentar obtener el mensaje inicial de diferentes fuentes posibles
      if (typeof enrichedActivityContent.activity_data === 'object' && 
          enrichedActivityContent.activity_data && 
          'initial_message' in enrichedActivityContent.activity_data) {
        initialMessage = (enrichedActivityContent.activity_data as any).initial_message;
      } else if (typeof enrichedActivityContent.activity_data === 'string') {
        try {
          const parsedData = JSON.parse(enrichedActivityContent.activity_data);
          if (parsedData && 'initial_message' in parsedData) {
            initialMessage = parsedData.initial_message;
          }
        } catch (e) {
          console.error('Error al parsear activity_data:', e);
        }
      } else if ('initial_message' in enrichedActivityContent) {
        initialMessage = (enrichedActivityContent as any).initial_message;
      }
      
      console.log('Mensaje inicial encontrado:', initialMessage ? 'Sí' : 'No');
      
      if (initialMessage && initialMessage.trim() !== '') {
        console.log('Usando mensaje inicial configurado:', initialMessage.substring(0, 50) + (initialMessage.length > 50 ? '...' : ''));
        
        // Mostrar directamente el mensaje inicial configurado sin mensaje previo del usuario
        addAIMessage(initialMessage);
        
        // Actualizar la memoria a corto plazo con el mensaje inicial
        updateShortTermMemoryWithParams(initialMessage, 'assistant');
        
        // Mostrar botón de insight después de la respuesta
        showInsightButtonAfterResponse();
      } else {
        console.log('No hay mensaje inicial configurado, generando respuesta con la API');
        
        // No hay mensaje inicial configurado, así que generaremos uno basado en la actividad
        // Primero, añadimos un mensaje del sistema (invisible para el usuario) para iniciar la conversación
        const systemMessage = {
          role: 'system',
          content: `Inicia la conversación para la actividad "${enrichedActivityContent.title || 'Actividad'}". 
                   Explica brevemente el propósito de esta actividad y cómo puede ayudar al usuario.`
        };
        
        // Generar respuesta del bot usando la API sin mensaje previo del usuario
        const botResponse = await chatService.generateInitialResponse(
          enrichedActivityContent,
          company,
          systemMessage
        );
        
        // Actualizar la memoria a corto plazo con la respuesta del bot
        updateShortTermMemoryWithParams(botResponse, 'assistant');
        
        // Verificar si la respuesta contiene un mensaje de error de límite de cuota
        if (botResponse && botResponse.includes("límite de uso de la API")) {
          addAIMessage(botResponse, { type: 'error', isQuotaError: true });
        } else {
          // Añadir respuesta del bot a la UI
          addAIMessage(botResponse);
          
          // Mostrar botón de insight después de la respuesta
          showInsightButtonAfterResponse();
        }
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      addAIMessage('Lo siento, ha ocurrido un error al iniciar la conversación. Por favor, intenta nuevamente.', { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Si estamos en una actividad, mostrar información de la actividad
  const headerTitle = activityContent ? activityContent.title : (company?.name || 'Consultoría Estratégica');
  const headerSubtitle = activityContent 
    ? `Actividad interactiva • ${activityContent.prompt_section || 'Consultoría'}` 
    : (company ? `${company.industry} • ${company.size}` : 'Información de la empresa no disponible');

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center shadow-sm">
        <div className="flex items-center w-full sm:w-auto mb-2 sm:mb-0">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md mr-3 flex-shrink-0">
            <MessageSquare size={20} />
          </div>
          <div className="overflow-hidden">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{headerTitle}</h1>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{headerSubtitle}</p>
          </div>
        </div>
        {activityContent && (
          <InsightsList 
            insights={insights}
            isVisible={showInsights}
            onToggleVisibility={() => setShowInsights(!showInsights)}
          />
        )}
      </div>

      {showInsights && (
        <div className="bg-white p-3 sm:p-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center mb-2 sm:mb-3">
            <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mr-2" />
            <h2 className="text-base sm:text-lg font-medium text-gray-800">Insights Guardados</h2>
          </div>
          {insights.length > 0 ? (
            <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto pr-2">
              {insights.map(insight => (
                <div key={insight.id} className="bg-yellow-50 p-2 sm:p-3 rounded-lg border border-yellow-100 hover:border-yellow-200 transition-colors">
                  <div className="flex items-start">
                    <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600 mt-1 mr-2 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-gray-700">{insight.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-xs sm:text-sm italic">No hay insights guardados para esta actividad.</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {loadingActivity ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500 mb-3 sm:mb-4"></div>
            <span className="text-sm sm:text-base text-gray-600 font-medium">Cargando actividad...</span>
          </div>
        ) : !messagesLoaded ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-500 mb-3 sm:mb-4"></div>
            <span className="text-sm sm:text-base text-gray-600 font-medium">Cargando mensajes anteriores...</span>
          </div>
        ) : shouldShowWelcomeMessage ? (
          <WelcomeMessage 
            activityContent={activityContent} 
            onStartConversation={handleStartConversation} 
          />
        ) : (
          <div className="space-y-3 sm:space-y-4 pb-2">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id}
                message={{
                  ...message,
                  metadata: message.metadata ? {
                    ...message.metadata,
                    // Convertir los tipos de metadata para que sean compatibles
                    type: message.metadata.type as any,
                  } : undefined
                }}
                onSaveInsight={saveInsight}
                showInsightButton={showInsightButton && message.sender === 'ai' && !message.metadata?.type}
              />
            ))}
            {isLoading && <TypingIndicator />}
            
            {/* Eliminamos la visualización de detalles de evaluación en la parte inferior del chat */}
            
            {isActivityCompleted && completionMessage && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200 mt-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">¡Actividad completada!</h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>{completionMessage}</p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        onClick={() => {
                          // Aquí podríamos implementar la navegación a la siguiente actividad
                          // Por ahora, solo cerraremos el mensaje
                          setIsActivityCompleted(false);
                        }}
                      >
                        Continuar a la siguiente actividad
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput 
        value={input}
        onChange={setInput}
        onSend={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}
