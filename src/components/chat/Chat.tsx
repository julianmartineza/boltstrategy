import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useProgramStore } from '../../store/programStore';
import { ActivityContent } from '../../types';
import { chatService } from '../../services/chatService';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { WelcomeMessage } from './WelcomeMessage';
import { InsightsList } from './InsightsList';
import { useActivityContent } from '../../hooks/useActivityContent';
import { useChatMessages } from '../../hooks/useChatMessages';
import { useChatInsights } from '../../hooks/useChatInsights';
import { TypingIndicator } from './TypingIndicator';
import { MessageSquare, Lightbulb, BookOpen } from 'lucide-react';

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
    saveInteraction,
    clearMessages,
    messagesLoaded
  } = useChatMessages(user?.id, activityContent?.id);
  
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
      const userMsg = addUserMessage(userMessage);
      setInput('');
      
      // Generar respuesta del bot
      const botResponse = await chatService.generateResponse(
        userMessage,
        activityContent,
        company,
        interactionCount
      );
      
      // Añadir respuesta del bot a la UI
      addAIMessage(botResponse);
      
      // Guardar la interacción en la base de datos
      // Usamos un ID único para evitar duplicados
      const messageId = userMsg.id.replace('user-', '');
      await saveInteraction(userMessage, botResponse, messageId);
      
      // Limpiar interacciones antiguas si es necesario
      if (interactionCount > 10) {
        await chatService.cleanUpOldInteractions(user.id, activityContent.id, interactionCount);
      }
      
      // Mostrar botón de guardar insight
      showInsightButtonAfterResponse();
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

  // Manejar el inicio de la conversación con un mensaje predeterminado
  const handleStartConversation = async () => {
    if (!user || !user.id) {
      console.error('No hay usuario autenticado para iniciar la conversación');
      addAIMessage('Por favor, inicia sesión para continuar con la actividad.', { type: 'error' });
      return;
    }
    
    if (!activityContent || !activityContent.id) {
      console.error('No hay contenido de actividad disponible');
      addAIMessage('No se puede iniciar la conversación porque no hay información de la actividad.', { type: 'error' });
      return;
    }
    
    // Asegurarse de que la empresa esté cargada antes de iniciar la conversación
    if (!company && user.id) {
      console.log('Cargando datos de empresa para el usuario:', user.id);
      await loadCompanyAndDiagnostic(user.id);
    }
    
    setIsLoading(true);
    
    try {
      // Añadir mensaje predeterminado del usuario - Mensaje más simple
      const defaultMessage = "Hola, ¿puedes ayudarme con esta actividad?";
      const userMsg = addUserMessage(defaultMessage);
      
      // Asegurarnos de que el objeto activityContent tenga los campos necesarios
      const enrichedActivityContent = {
        ...activityContent,
        user_id: user.id,  // Asegurarnos de que user_id esté presente
        id: activityContent.id || stageContentId  // Usar stageContentId como fallback
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
      
      // Generar respuesta del bot
      const botResponse = await chatService.generateResponse(
        defaultMessage,
        enrichedActivityContent,
        company,
        interactionCount
      );
      
      // Añadir respuesta del bot a la UI
      addAIMessage(botResponse);
      
      // Guardar la interacción en la base de datos con un ID único
      const messageId = userMsg.id.replace('user-', '');
      await saveInteraction(defaultMessage, botResponse, messageId);
      
      // Mostrar botón de insight después de la respuesta
      showInsightButtonAfterResponse();
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
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md mr-3">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{headerTitle}</h1>
            <p className="text-sm text-gray-500">{headerSubtitle}</p>
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
        <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
          <div className="flex items-center mb-3">
            <Lightbulb className="h-5 w-5 text-yellow-500 mr-2" />
            <h2 className="text-lg font-medium text-gray-800">Insights Guardados</h2>
          </div>
          {insights.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {insights.map(insight => (
                <div key={insight.id} className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 hover:border-yellow-200 transition-colors">
                  <div className="flex items-start">
                    <BookOpen className="h-4 w-4 text-yellow-600 mt-1 mr-2 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{insight.content}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">No hay insights guardados para esta actividad.</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {loadingActivity ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <span className="text-gray-600 font-medium">Cargando actividad...</span>
          </div>
        ) : !messagesLoaded ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <span className="text-gray-600 font-medium">Cargando mensajes anteriores...</span>
          </div>
        ) : shouldShowWelcomeMessage ? (
          <WelcomeMessage 
            activityContent={activityContent} 
            onStartConversation={handleStartConversation} 
          />
        ) : (
          <div className="space-y-4 pb-2">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id}
                message={message}
                onSaveInsight={saveInsight}
                showInsightButton={showInsightButton && message.sender === 'ai' && !message.metadata?.type}
              />
            ))}
            {isLoading && <TypingIndicator />}
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
