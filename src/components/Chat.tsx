import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, BookmarkPlus, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useProgramStore } from '../store/programStore';
import { generateBotResponse } from '../lib/openai';
import { Message, ActivityContent, UserInsight } from '../types';

interface ChatProps {
  stageContentId?: string;
  activityContentProp?: ActivityContent;
}

export default function Chat({ stageContentId, activityContentProp }: ChatProps = {}) {
  const { user } = useAuthStore();
  const { company, diagnostic, loadCompanyAndDiagnostic } = useProgramStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activityContent, setActivityContent] = useState<ActivityContent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Estado para el manejo de pasos
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [totalSteps, setTotalSteps] = useState<number>(1);
  const [stepValidated, setStepValidated] = useState<boolean>(false);
  const [showInsightButton, setShowInsightButton] = useState<boolean>(false);
  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [showInsights, setShowInsights] = useState<boolean>(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (activityContentProp) {
      setActivityContent(activityContentProp);
    } else if (stageContentId) {
      fetchActivityContent();
    }

    // Cargar datos de la empresa y diagnóstico si el usuario está autenticado
    if (user?.id) {
      loadCompanyAndDiagnostic(user.id);
    }
  }, [stageContentId, activityContentProp, user?.id, loadCompanyAndDiagnostic]);

  useEffect(() => {
    if (activityContent) {
      loadPreviousMessages();
      fetchTotalSteps();
      fetchInsights();
    }
  }, [activityContent]);

  const fetchActivityContent = async () => {
    if (!stageContentId) return;

    try {
      const { data, error } = await supabase
        .from('stage_content')
        .select('*')
        .eq('id', stageContentId)
        .single();

      if (error) {
        console.error('Error fetching activity content:', error);
        return;
      }

      setActivityContent(data as ActivityContent);
    } catch (error) {
      console.error('Error in fetchActivityContent:', error);
    }
  };

  const fetchTotalSteps = async () => {
    if (!activityContent?.id) return;

    try {
      const { data, error } = await supabase
        .from('stage_content')
        .select('step')
        .eq('stage_id', activityContent.stage_id)
        .eq('content_type', 'activity')
        .order('step', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching total steps:', error);
        return;
      }

      if (data && data.length > 0 && data[0].step) {
        setTotalSteps(data[0].step);
      }
    } catch (error) {
      console.error('Error in fetchTotalSteps:', error);
    }
  };

  const fetchInsights = async () => {
    if (!user?.id || !activityContent?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_insights')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_id', activityContent.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching insights:', error);
        return;
      }

      if (data) {
        setInsights(data);
      }
    } catch (error) {
      console.error('Error in fetchInsights:', error);
    }
  };

  const loadPreviousMessages = async () => {
    if (!user?.id || !activityContent?.id) return;

    try {
      // Cargar mensajes anteriores para esta actividad específica
      const { data: interactions, error } = await supabase
        .from('activity_interactions')
        .select('user_message, ai_response, timestamp')
        .eq('user_id', user.id)
        .eq('activity_id', activityContent.id)
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error loading previous messages:', error);
        return;
      }

      // Convertir los datos a formato de mensajes
      if (interactions && interactions.length > 0) {
        const loadedMessages: Message[] = [];
        
        interactions.forEach((interaction) => {
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
        });
        
        setMessages(loadedMessages);
        
        // Determinar el paso actual basado en los mensajes cargados
        // Asumimos que cada paso tiene al menos un intercambio (usuario + AI)
        const estimatedStep = Math.floor(loadedMessages.length / 2) + 1;
        setCurrentStep(Math.min(estimatedStep, totalSteps));
      } else {
        // Si no hay mensajes previos, iniciar con el mensaje inicial de la actividad
        await fetchActivityStep(1);
      }
    } catch (error) {
      console.error('Error in loadPreviousMessages:', error);
    }
  };

  const fetchActivityStep = async (step: number) => {
    if (!activityContent?.stage_id) return null;

    try {
      const { data, error } = await supabase
        .from('stage_content')
        .select('*')
        .eq('stage_id', activityContent.stage_id)
        .eq('content_type', 'activity')
        .eq('step', step)
        .single();

      if (error) {
        console.error(`Error fetching step ${step}:`, error);
        return null;
      }

      return data as ActivityContent;
    } catch (error) {
      console.error(`Error in fetchActivityStep for step ${step}:`, error);
      return null;
    }
  };

  const validateResponse = async (response: string, step: number) => {
    if (!activityContent) return false;

    try {
      // Obtener el paso actual para las instrucciones de validación
      const stepContent = await fetchActivityStep(step);
      if (!stepContent) return false;

      // Crear un prompt para validar la respuesta
      const validationPrompt = `
        Estás evaluando la respuesta de un usuario para una actividad de consultoría estratégica.
        
        PASO ${step}: ${stepContent.title}
        
        INSTRUCCIONES DE VALIDACIÓN:
        ${stepContent.system_instructions || 'Evalúa si la respuesta del usuario es adecuada para este paso.'}
        
        RESPUESTA DEL USUARIO:
        "${response}"
        
        Evalúa si la respuesta cumple con los requisitos mínimos para este paso.
        Responde SOLO con "VALIDO" si la respuesta es aceptable, o "INVALIDO: [razón]" si no es aceptable.
      `;

      // Llamar a la API para validar
      const validationResult = await generateBotResponse(
        validationPrompt,
        {
          systemPrompt: 'Eres un evaluador de respuestas para actividades de consultoría estratégica. Tu trabajo es determinar si las respuestas de los usuarios cumplen con los requisitos mínimos.',
          stage: activityContent.title,
          activity: 'Validación de respuesta',
          previousMessages: []
        },
        user?.id,
        activityContent.id
      );

      // Procesar el resultado
      if (validationResult?.toLowerCase().startsWith('valido')) {
        return true;
      } else {
        // Extraer el mensaje de error
        const errorMessage = validationResult?.split(':')[1]?.trim() || 'La respuesta no cumple con los requisitos.';
        
        // Añadir mensaje de error
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          content: `⚠️ ${errorMessage} Por favor, intenta de nuevo.`,
          sender: 'ai',
          timestamp: new Date(),
          metadata: { type: 'error' }
        }]);
        
        return false;
      }
    } catch (error) {
      console.error('Error validating response:', error);
      return false;
    }
  };

  const saveInsight = async (messageContent: string) => {
    if (!user?.id || !activityContent?.id) return;

    try {
      const { error } = await supabase
        .from('user_insights')
        .insert([{
          user_id: user.id,
          activity_id: activityContent.id,
          step: currentStep,
          content: messageContent
        }]);

      if (error) {
        console.error('Error saving insight:', error);
        return;
      }

      // Actualizar la lista de insights
      fetchInsights();
      
      // Mostrar confirmación
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        content: '✅ Insight guardado correctamente.',
        sender: 'ai',
        timestamp: new Date(),
        metadata: { type: 'system' }
      }]);
    } catch (error) {
      console.error('Error in saveInsight:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !activityContent) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setShowInsightButton(false);

    // Verificar si es un comando para guardar insight
    if (userMessage.toLowerCase().startsWith('/guardar')) {
      const insightContent = userMessage.substring('/guardar'.length).trim();
      if (insightContent) {
        await saveInsight(insightContent);
      } else {
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          content: 'Por favor, proporciona el contenido del insight después del comando /guardar.',
          sender: 'ai',
          timestamp: new Date(),
          metadata: { type: 'error' }
        }]);
      }
      setIsLoading(false);
      return;
    }

    // Añadir mensaje del usuario
    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      content: userMessage,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Si estamos en un paso que requiere validación
      if (!stepValidated) {
        const isValid = await validateResponse(userMessage, currentStep);
        if (!isValid) {
          setIsLoading(false);
          return;
        }
        setStepValidated(true);
      }

      // Obtener el contenido del paso actual
      const stepContent = await fetchActivityStep(currentStep);
      if (!stepContent) {
        throw new Error(`No se pudo obtener el contenido para el paso ${currentStep}`);
      }

      // Preparar el contexto para la respuesta del bot
      let contextData: Record<string, any> = {};
      if (company) {
        contextData.company = {
          name: company.name,
          industry: company.industry,
          size: company.size,
          annual_revenue: company.annual_revenue
        };
      }
      if (diagnostic) {
        contextData.diagnostic = {
          currentChallenges: diagnostic.diagnostic_data?.currentChallenges || diagnostic.currentChallenges,
          marketPosition: diagnostic.diagnostic_data?.marketPosition || diagnostic.marketPosition,
          keyStrengths: diagnostic.diagnostic_data?.keyStrengths || diagnostic.keyStrengths,
          growthAspiration: diagnostic.diagnostic_data?.growthAspiration || diagnostic.growthAspiration
        };
      }

      // Obtener mensajes previos para el contexto
      const previousMessages = messages
        .slice(-6) // Últimos 6 mensajes para mantener el contexto reciente
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content
        }));

      // Generar respuesta del bot
      const botResponse = await generateBotResponse(
        userMessage,
        {
          systemPrompt: stepContent.system_instructions || stepContent.activity_data?.system_instructions,
          stage: activityContent.title,
          activity: stepContent.title,
          previousMessages,
          context: contextData
        },
        user?.id,
        activityContent.id
      );

      if (!botResponse) {
        throw new Error('No se pudo generar una respuesta');
      }

      // Añadir respuesta del bot
      const newBotMessage: Message = {
        id: `ai-${Date.now()}`,
        content: botResponse,
        sender: 'ai',
        timestamp: new Date(),
        activity: {
          step: currentStep,
          totalSteps
        }
      };
      setMessages(prev => [...prev, newBotMessage]);

      // Mostrar botón de guardar insight después de la respuesta del bot
      setShowInsightButton(true);

      // Si la respuesta ha sido validada, preparar para el siguiente paso
      if (stepValidated && currentStep < totalSteps) {
        // Añadir mensaje de sistema para avanzar al siguiente paso
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `system-${Date.now()}`,
            content: `Has completado el paso ${currentStep} de ${totalSteps}. Puedes continuar al siguiente paso.`,
            sender: 'ai',
            timestamp: new Date(),
            metadata: { type: 'system' },
            activity: {
              step: currentStep,
              totalSteps
            }
          }]);
        }, 1000);
      } else if (stepValidated && currentStep === totalSteps) {
        // Mensaje de finalización de la actividad
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `system-${Date.now()}`,
            content: '¡Felicidades! Has completado todos los pasos de esta actividad.',
            sender: 'ai',
            timestamp: new Date(),
            metadata: { type: 'system' },
            activity: {
              step: currentStep,
              totalSteps
            }
          }]);
        }, 1000);
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        sender: 'ai',
        timestamp: new Date(),
        metadata: { type: 'error' }
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      setStepValidated(false);
      
      // Cargar el contenido del siguiente paso
      fetchActivityStep(currentStep + 1).then(stepContent => {
        if (stepContent) {
          // Añadir mensaje de inicio del nuevo paso
          setMessages(prev => [...prev, {
            id: `system-${Date.now()}`,
            content: `PASO ${currentStep + 1}: ${stepContent.title}`,
            sender: 'ai',
            timestamp: new Date(),
            metadata: { type: 'system' },
            activity: {
              step: currentStep + 1,
              totalSteps
            }
          }]);
          
          // Si hay un mensaje inicial para este paso, añadirlo
          if (stepContent.activity_data?.initial_message) {
            setMessages(prev => [...prev, {
              id: `ai-${Date.now()}`,
              content: stepContent.activity_data.initial_message || '',
              sender: 'ai',
              timestamp: new Date(),
              activity: {
                step: currentStep + 1,
                totalSteps
              }
            }]);
          }
        }
      });
    }
  };

  const handleSaveCurrentInsight = () => {
    // Obtener el último mensaje de la IA
    const lastAiMessage = [...messages].reverse().find(msg => msg.sender === 'ai' && !msg.metadata?.type);
    
    if (lastAiMessage) {
      saveInsight(lastAiMessage.content);
    }
  };

  // Si estamos en una actividad, mostrar información de la actividad
  const headerTitle = activityContent ? activityContent.title : (company?.name || 'Consultoría Estratégica');
  const headerSubtitle = activityContent 
    ? `Actividad interactiva • Paso ${currentStep} de ${totalSteps}` 
    : (company ? `${company.industry} • ${company.size}` : 'Información de la empresa no disponible');

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{headerTitle}</h1>
          <p className="text-sm text-gray-500">{headerSubtitle}</p>
        </div>
        {activityContent && (
          <div className="flex items-center">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="text-sm text-blue-600 hover:text-blue-800 mr-4"
            >
              {showInsights ? 'Ocultar insights' : `Insights (${insights.length})`}
            </button>
          </div>
        )}
      </div>

      {showInsights && (
        <div className="bg-gray-50 p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium mb-2">Insights Guardados</h2>
          {insights.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {insights.map(insight => (
                <div key={insight.id} className="bg-white p-3 rounded-lg border border-gray-200">
                  {insight.content}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay insights guardados para esta actividad.</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-lg rounded-lg px-4 py-2 ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.metadata?.type === 'error'
                  ? 'bg-red-100 text-red-800 border border-red-200'
                  : message.metadata?.type === 'system'
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < message.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
              
              {message.activity && (
                <div className="mt-2 text-xs text-gray-500">
                  Paso {message.activity.step} de {message.activity.totalSteps}
                </div>
              )}
              
              {message.sender === 'ai' && !message.metadata?.type && showInsightButton && (
                <button
                  onClick={handleSaveCurrentInsight}
                  className="mt-2 flex items-center text-xs text-blue-600 hover:text-blue-800"
                >
                  <BookmarkPlus className="h-3 w-3 mr-1" />
                  Guardar como insight
                </button>
              )}
            </div>
          </div>
        ))}
        
        {stepValidated && currentStep < totalSteps && (
          <div className="flex justify-center my-4">
            <button
              onClick={handleNextStep}
              className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Siguiente paso <ArrowRight className="h-4 w-4 ml-2" />
            </button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="ml-2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
        <div className="mt-2 text-xs text-gray-500">
          <p>Comandos especiales: <span className="font-mono">/guardar [texto]</span> para guardar un insight</p>
        </div>
      </div>
    </div>
  );
}