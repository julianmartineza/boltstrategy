import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useProgramStore } from '../store/programStore';
import { findSimilarMessages, saveInteractionWithEmbeddings, SimilarMessage } from '../lib/openai';

// Acceder a la clave API de OpenAI desde las variables de entorno
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface Company {
  id: string;
  name: string;
  industry: string;
  size: string;
  website: string;
  annual_revenue: number;
}

interface Diagnostic {
  id: string;
  diagnostic_data: {
    currentChallenges: string;
    marketPosition: string;
    keyStrengths: string;
    growthAspiration: string;
  };
}

interface ActivityData {
  prompt: string;
  system_instructions?: string;
  initial_message?: string;
  max_exchanges?: number;
}

interface ActivityContent {
  id: string;
  title: string;
  content: string;
  content_type: string; // Cambiado de 'activity' a string para ser compatible con "video" | "text" | "activity"
  activity_data: ActivityData;
  metadata?: any; // Añadido para ser compatible con el tipo en StageContent
  stage_id?: string; // Añadido para ser compatible con el tipo en StageContent
  order_num?: number; // Añadido para ser compatible con el tipo en StageContent
  created_at?: string; // Añadido para ser compatible con el tipo en StageContent
}

interface ChatProps {
  stageContentId?: string;
  activityContentProp?: ActivityContent;
}

export default function Chat({ stageContentId, activityContentProp }: ChatProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [company, setCompany] = useState<Company | null>(null);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(null);
  const [activityContent, setActivityContent] = useState<ActivityContent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuthStore();
  const { currentActivity, completeActivity } = useProgramStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchCompanyAndDiagnostic = async () => {
      if (!user) return;

      // Fetch company data
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (companyError) {
        console.error('Error fetching company:', companyError);
        return;
      }

      if (companies) {
        setCompany(companies);

        // Fetch diagnostic data
        const { data: diagnostics, error: diagnosticError } = await supabase
          .from('diagnostics')
          .select('*')
          .eq('company_id', companies.id)
          .limit(1)
          .single();

        if (diagnosticError) {
          console.error('Error fetching diagnostic:', diagnosticError);
          return;
        }

        if (diagnostics) {
          setDiagnostic(diagnostics);
        }
      }
    };

    fetchCompanyAndDiagnostic();
  }, [user]);
  
  // Efecto para cargar actividades previas completadas
  useEffect(() => {
    const fetchCompletedActivities = async () => {
      if (!user) return [];
      
      // Obtener actividades completadas del usuario actual
      const { data, error } = await supabase
        .from('activity_completions')
        .select('*, stage_content(*)')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });
      
      if (error) {
        console.error('Error al cargar actividades completadas:', error);
        return [];
      }
      
      return data || [];
    };
    
    // Almacenar las actividades completadas para usarlas en el contexto
    fetchCompletedActivities().then(activities => {
      console.log('Actividades completadas cargadas:', activities.length);
    });
  }, [user]);

  // Efecto para cargar mensajes previos de la actividad
  useEffect(() => {
    const loadPreviousMessages = async () => {
      if (!user || !activityContent) return;
      
      console.log('Cargando mensajes previos para la actividad:', activityContent.id);
      
      // Obtener interacciones previas para esta actividad
      const { data, error } = await supabase
        .from('activity_interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('activity_id', activityContent.id)
        .order('timestamp', { ascending: true });
      
      if (error) {
        console.error('Error al cargar mensajes previos:', error);
        return;
      }
      
      if (data && data.length > 0) {
        console.log(`Se encontraron ${data.length} mensajes previos`);
        
        // Convertir las interacciones a mensajes
        const previousMessages: Message[] = [];
        
        // Si hay un mensaje inicial en la actividad, agregarlo primero
        if (activityContent.activity_data?.initial_message) {
          previousMessages.push({
            id: 'initial-message',
            content: activityContent.activity_data.initial_message,
            sender: 'ai',
            timestamp: new Date(data[0].timestamp) // Usar la fecha del primer mensaje como referencia
          });
        }
        
        // Agregar los mensajes de las interacciones
        data.forEach(interaction => {
          // Mensaje del usuario
          previousMessages.push({
            id: `user-${interaction.id}`,
            content: interaction.user_message,
            sender: 'user',
            timestamp: new Date(interaction.timestamp)
          });
          
          // Respuesta de la IA
          previousMessages.push({
            id: `ai-${interaction.id}`,
            content: interaction.ai_response,
            sender: 'ai',
            timestamp: new Date(interaction.timestamp)
          });
        });
        
        // Actualizar el estado de mensajes
        setMessages(previousMessages);
      } else {
        console.log('No se encontraron mensajes previos');
        
        // Si no hay mensajes previos pero hay un mensaje inicial en la actividad, agregarlo
        if (activityContent.activity_data?.initial_message) {
          const initialMessage: Message = {
            id: Date.now().toString(),
            content: activityContent.activity_data.initial_message,
            sender: 'ai',
            timestamp: new Date()
          };
          
          setMessages([initialMessage]);
        }
      }
    };
    
    loadPreviousMessages();
  }, [user, activityContent]);
  
  // Efecto para cargar la actividad actual
  useEffect(() => {
    // Si se proporciona la actividad como prop, la usamos directamente
    if (activityContentProp) {
      console.log('Usando actividad proporcionada como prop:', activityContentProp);
      setActivityContent(activityContentProp);
      return;
    }
    
    const fetchActivityContent = async () => {
      // Si se proporciona un ID específico, lo usamos
      const contentId = stageContentId || (currentActivity?.stage_content_id);
      
      if (!contentId) {
        // Si no hay actividad actual ni ID proporcionado, intentamos cargar una actividad de ejemplo
        console.log('No hay actividad actual, buscando actividades disponibles...');
        
        const { data: activities, error: activitiesError } = await supabase
          .from('stage_content')
          .select('*')
          .eq('content_type', 'activity')
          .limit(1);
        
        if (activitiesError) {
          console.error('Error al buscar actividades:', activitiesError);
          return;
        }
        
        if (activities && activities.length > 0) {
          console.log('Actividad encontrada:', activities[0]);
          setActivityContent(activities[0] as ActivityContent);
          
          // Si hay un mensaje inicial, agregarlo como mensaje del AI
          if (activities[0].activity_data?.initial_message) {
            const initialMessage: Message = {
              id: Date.now().toString(),
              content: activities[0].activity_data.initial_message,
              sender: 'ai',
              timestamp: new Date()
            };
            
            setMessages([initialMessage]);
          }
          return;
        }
        
        console.log('No se encontraron actividades disponibles');
        return;
      }
      
      // Buscar el contenido de la actividad en stage_content
      const { data, error } = await supabase
        .from('stage_content')
        .select('*')
        .eq('id', contentId)
        .eq('content_type', 'activity')
        .single();
      
      if (error) {
        console.error('Error al cargar el contenido de la actividad:', error);
        return;
      }
      
      if (data) {
        console.log('Actividad cargada:', data);
        setActivityContent(data as ActivityContent);
        
        // Si hay un mensaje inicial, agregarlo como mensaje del AI
        if (data.activity_data?.initial_message) {
          const initialMessage: Message = {
            id: Date.now().toString(),
            content: data.activity_data.initial_message,
            sender: 'ai',
            timestamp: new Date()
          };
          
          setMessages([initialMessage]);
        }
      }
    };
    
    fetchActivityContent();
  }, [currentActivity, stageContentId, activityContentProp]);
  
  // Efecto para hacer scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !company || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // Si estamos en una actividad, usamos el prompt de la actividad
      if (activityContent && activityContent.activity_data && activityContent.content_type === 'activity') {
        // Preparar los datos para la API de OpenAI
        const promptText = activityContent.activity_data.prompt;
        const systemInstructionsText = activityContent.activity_data.system_instructions || 
          'Eres un asistente de estrategia empresarial que ayuda a los usuarios a completar actividades estratégicas.';
        
        // Obtener actividades previas completadas para contexto
        const { data: completedActivities, error: activitiesError } = await supabase
          .from('activity_completions')
          .select('*, stage_content(*)')
          .eq('user_id', user?.id || '')
          .order('completed_at', { ascending: false })
          .limit(5);
          
        if (activitiesError) {
          console.error('Error al cargar actividades previas:', activitiesError);
        }
        
        // Preparar el contexto para la API con información enriquecida
        const contextData = {
          company: company ? {
            name: company.name,
            industry: company.industry,
            size: company.size,
            annual_revenue: company.annual_revenue,
            website: company.website
          } : null,
          diagnostic: diagnostic ? {
            currentChallenges: diagnostic.diagnostic_data?.currentChallenges,
            marketPosition: diagnostic.diagnostic_data?.marketPosition,
            keyStrengths: diagnostic.diagnostic_data?.keyStrengths,
            growthAspiration: diagnostic.diagnostic_data?.growthAspiration
          } : null,
          activity: {
            id: activityContent.id,
            title: activityContent.title,
            content: activityContent.content,
            type: activityContent.content_type
          },
          previousActivities: completedActivities ? completedActivities.map(act => ({
            id: act.stage_content?.id,
            title: act.stage_content?.title,
            completedAt: act.completed_at,
            userResponses: act.user_responses
          })) : [],
          messages: [...messages, userMessage].map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        };
        
        console.log('Procesando actividad con contexto enriquecido:', {
          prompt: promptText,
          systemInstructions: systemInstructionsText,
          context: contextData
        });
        
        // Llamar a la API de OpenAI directamente
        let aiResponse = '';
        
        try {
          console.log('Llamando a la API de OpenAI con la clave:', OPENAI_API_KEY ? 'API Key disponible' : 'API Key no disponible');
          
          // Importar la interfaz SimilarMessage de openai.ts
          
          // Buscar mensajes similares usando embeddings vectoriales
          let relevantMessages: SimilarMessage[] = [];
          if (user?.id) {
            try {
              relevantMessages = await findSimilarMessages(
                userMessage.content,
                user.id,
                activityContent.id,
                0.7, // umbral de similitud
                5    // número máximo de resultados
              );
              console.log(`Se encontraron ${relevantMessages.length} mensajes relevantes usando embeddings`);
            } catch (searchError) {
              console.error('Error al buscar mensajes similares:', searchError);
            }
          }
          
          // Preparar los mensajes para OpenAI en formato correcto
          const messagesForAPI = [
            {
              role: 'system',
              content: systemInstructionsText
            },
            // Convertir el prompt en un mensaje del sistema
            {
              role: 'system',
              content: `Prompt de la actividad: ${promptText}\n\nInformación de contexto:\n${JSON.stringify(contextData, null, 2)}`
            },
            // Incluir mensajes relevantes de conversaciones anteriores si existen
            ...(relevantMessages.length > 0 ? [{
              role: 'system',
              content: `Mensajes relevantes de conversaciones anteriores:\n${relevantMessages
                .map(m => `Usuario: ${m.user_message}\nAsistente: ${m.ai_response}`)
                .join('\n\n')}`
            }] : []),
            // Incluir mensajes de la conversación actual (limitados a los últimos 10 para no sobrecargar)
            ...messages.slice(-10).map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.content
            })),
            // Añadir el mensaje actual del usuario
            {
              role: 'user',
              content: userMessage.content
            }
          ];
          
          // Llamada a la API de OpenAI
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
              model: 'gpt-4-turbo-preview',  // Usar el modelo más avanzado disponible
              messages: messagesForAPI,
              temperature: 0.7,
              max_tokens: 1000,
              top_p: 1,
              frequency_penalty: 0,
              presence_penalty: 0
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Error en la respuesta de OpenAI:', errorData);
            throw new Error(`Error al generar respuesta de IA: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('Respuesta de OpenAI:', data);
          
          // Extraer la respuesta del modelo
          aiResponse = data.choices[0].message.content;
          
          // Guardar la interacción con embeddings vectoriales
          try {
            if (user?.id) {
              await saveInteractionWithEmbeddings(
                user.id,
                activityContent.id,
                userMessage.content,
                aiResponse
              );
              console.log('Interacción guardada con embeddings vectoriales');
            }
          } catch (saveError) {
            console.error('Error al guardar la interacción con embeddings:', saveError);
          }
        } catch (openAiError) {
          console.error('Error al llamar a la API de OpenAI:', openAiError);
          
          // Si hay un error con la API, usar una respuesta de fallback
          aiResponse = `Lo siento, ha ocurrido un error al procesar tu respuesta para la actividad "${activityContent.title}".\n\n`;
          aiResponse += "Estamos experimentando problemas de conexión con nuestro servicio de IA. Por favor, intenta nuevamente en unos momentos.";
          
          // Si tenemos información de contexto, añadir una respuesta más personalizada
          if (company) {
            aiResponse += `\n\nMientras tanto, puedes reflexionar sobre cómo ${company.name} podría abordar sus desafíos actuales considerando su posición en el sector ${company.industry}.`;
          }
        }
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
        
        // Verificar si hemos alcanzado el número máximo de intercambios
        const maxExchanges = activityContent.activity_data.max_exchanges || 5;
        if (messages.filter(m => m.sender === 'user').length >= maxExchanges) {
          // Completar la actividad automáticamente después del último intercambio
          if (currentActivity) {
            await completeActivity(currentActivity.id, {
              messages: [...messages, userMessage, aiMessage],
              completed_at: new Date().toISOString()
            });
          }
        }
      } else {
        // Comportamiento normal del chat sin actividad
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Soy tu consultor de estrategia para ${company.name}. ¿En qué puedo ayudarte hoy?`,
          sender: 'ai',
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error al generar respuesta:', error);
      // Mostrar mensaje de error al usuario
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta nuevamente.',
        sender: 'ai',
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Mostrar un indicador de carga mientras se cargan los datos
  if ((!activityContent || (activityContent && activityContent.content_type !== 'activity')) && !company) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }
  
  // Si estamos en una actividad, mostrar información de la actividad
  const headerTitle = activityContent ? activityContent.title : (company?.name || 'Consultoría Estratégica');
  const headerSubtitle = activityContent 
    ? 'Actividad interactiva' 
    : (company ? `${company.industry} • ${company.size}` : 'Información de la empresa no disponible');

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">{headerTitle}</h1>
        <p className="text-sm text-gray-500">{headerSubtitle}</p>
      </div>

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
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.content.split('\n').map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  {i < message.content.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg px-4 py-2 flex items-center">
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              <span>Generando respuesta...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}