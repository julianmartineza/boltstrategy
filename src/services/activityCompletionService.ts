import { supabase } from '../lib/supabase';
// Eliminamos la importación de crypto que no es compatible con el navegador

// Usar la interfaz ActivityData directamente aquí para evitar problemas de importación
interface ActivityData {
  prompt?: string;
  system_instructions?: string;
  initial_message?: string;
  max_exchanges?: number;
  type?: string;
  description?: string;
  prompt_template?: string;
  required_steps?: string[];
  completion_criteria?: any;
  completion_message?: string;
  generate_custom_completion_message?: boolean;
  step?: number;
  prompt_section?: string;
  dependencies?: string[];
  title?: string;
  use_advanced_evaluation?: boolean;
}

// Nuevas interfaces para el sistema de evaluación avanzado
interface Deliverable { 
  code: string; 
  description: string; 
  detection_query: any;
  detected?: boolean;
}

interface RubricItem { 
  id: string; 
  weight: number; 
  success_criteria: string; 
  score?: number;
  explanation?: string;
}

interface EvaluationLog { 
  activityId: string;
  userId: string;
  rubricScores: Record<string, number>;
  overallScore: number;
  feedbackMessage: string;
  isCompleted: boolean;
  conversationHash?: string;
}

// Interfaz para los criterios de finalización
interface CompletionCriteria {
  required_topics?: string[];
  min_interactions?: number;
  max_interactions?: number;
  required_keywords?: string[];
  custom_evaluation?: string;
}

// Interfaz para el resultado de la evaluación
export interface CompletionEvaluationResult {
  isCompleted: boolean;
  message: string;
  details?: {
    topicsCovered?: string[];
    missingTopics?: string[];
    interactionsCount?: number;
    keywordsFound?: string[];
    missingKeywords?: string[];
    customEvaluationResult?: any;
    // Propiedades para el sistema de evaluación avanzado
    rubric?: ScoredRubricItem[];
    overallScore?: number;
    detectionPercentage?: number; // Porcentaje de entregables detectados
    deliverables?: {
      detected?: string[];
      missing?: string[];
    };
  };
}

// Interfaz para un elemento de rúbrica con puntuación
export interface ScoredRubricItem extends RubricItem {
  score: number;
  explanation?: string;
}

// Caché para almacenar mapeos de IDs y evitar consultas repetidas
const idMappingCache = new Map<string, string>();

/**
 * Resuelve el ID real de una actividad consultando content_registry si es necesario
 * @param activityId ID de la actividad a resolver
 * @returns ID real de la actividad
 */
async function resolveActivityId(activityId: string): Promise<string> {
  // Si ya tenemos este ID en caché, usarlo directamente
  if (idMappingCache.has(activityId)) {
    return idMappingCache.get(activityId)!;
  }
  
  // Verificar si el ID está en content_registry
  const { data, error } = await supabase
    .from('content_registry')
    .select('content_id')
    .eq('id', activityId)
    .maybeSingle();
  
  if (error) {
    console.error('Error al verificar content_registry:', error);
    return activityId; // Devolver el ID original en caso de error
  }
  
  if (data && data.content_id) {
    // Guardar en caché para futuras consultas
    idMappingCache.set(activityId, data.content_id);
    return data.content_id;
  }
  
  // Si no se encuentra en content_registry, devolver el ID original
  return activityId;
}

/**
 * Obtiene los entregables definidos para una actividad
 * @param activityId ID de la actividad
 * @returns Lista de entregables
 */
async function getDeliverables(activityId: string): Promise<Deliverable[]> {
  try {
    console.log('Buscando entregables para actividad ID:', activityId);
    
    // Paso 1: Intentar obtener entregables directamente con el ID proporcionado
    let { data, error } = await supabase
      .from('activity_deliverables')
      .select('*')
      .eq('activity_id', activityId);
    
    if (error) {
      console.error('Error al obtener entregables:', error);
    }
    
    // Si encontramos entregables, devolverlos
    if (data && data.length > 0) {
      console.log(`✅ Encontrados ${data.length} entregables directamente con ID: ${activityId}`);
      return data.map(d => ({
        code: d.code,
        description: d.description,
        detection_query: d.detection_query
      }));
    }
    
    // Paso 2: Si no encontramos entregables, intentar resolver el ID real
    console.log('No se encontraron entregables directamente, intentando resolver ID real...');
    const resolvedId = await resolveActivityId(activityId);
    
    // Si el ID resuelto es diferente del original, intentar nuevamente
    if (resolvedId !== activityId) {
      console.log(`Usando ID resuelto: ${resolvedId} para buscar entregables...`);
      
      const { data: resolvedData, error: resolvedError } = await supabase
        .from('activity_deliverables')
        .select('*')
        .eq('activity_id', resolvedId);
      
      if (resolvedError) {
        console.error('Error al obtener entregables con ID resuelto:', resolvedError);
      } else if (resolvedData && resolvedData.length > 0) {
        console.log(`✅ Encontrados ${resolvedData.length} entregables con ID resuelto: ${resolvedId}`);
        return resolvedData.map(d => ({
          code: d.code,
          description: d.description,
          detection_query: d.detection_query
        }));
      }
    }
    
    console.log('⚠️ No se encontraron entregables para esta actividad');
    return [];
  } catch (error) {
    console.error('Error al obtener entregables:', error);
    return [];
  }
}

/**
 * Obtiene la rúbrica definida para una actividad
 * @param activityId ID de la actividad
 * @returns Lista de criterios de la rúbrica
 */
async function getRubric(activityId: string): Promise<RubricItem[]> {
  try {
    console.log('Buscando criterios de rúbrica para actividad ID:', activityId);
    
    // Paso 1: Intentar obtener rúbrica directamente con el ID proporcionado
    let { data, error } = await supabase
      .from('evaluation_rubrics')
      .select('*')
      .eq('activity_id', activityId);
    
    if (error) {
      console.error('Error al obtener rúbrica:', error);
    }
    
    // Si encontramos criterios de rúbrica, devolverlos
    if (data && data.length > 0) {
      console.log(`✅ Encontrados ${data.length} criterios de rúbrica directamente con ID: ${activityId}`);
      return data;
    }
    
    // Paso 2: Si no encontramos criterios, intentar resolver el ID real
    console.log('No se encontraron criterios de rúbrica directamente, intentando resolver ID real...');
    const resolvedId = await resolveActivityId(activityId);
    
    // Si el ID resuelto es diferente del original, intentar nuevamente
    if (resolvedId !== activityId) {
      console.log(`Usando ID resuelto: ${resolvedId} para buscar criterios de rúbrica...`);
      
      const { data: resolvedData, error: resolvedError } = await supabase
        .from('evaluation_rubrics')
        .select('*')
        .eq('activity_id', resolvedId);
      
      if (resolvedError) {
        console.error('Error al obtener criterios de rúbrica con ID resuelto:', resolvedError);
      } else if (resolvedData && resolvedData.length > 0) {
        console.log(`✅ Encontrados ${resolvedData.length} criterios de rúbrica con ID resuelto: ${resolvedId}`);
        return resolvedData;
      }
    }
    
    console.log('⚠️ No se encontraron criterios de rúbrica para esta actividad');
    return [];
  } catch (error) {
    console.error('Error al obtener rúbrica:', error);
    return [];
  }
}

/**
 * Registra una evaluación en la base de datos
 * @param evaluationLog Datos de la evaluación
 */
export async function logEvaluation(evaluationLog: EvaluationLog): Promise<void> {
  try {
    // Verificar si ya existe una evaluación con el mismo hash de conversación
    const { data: existingLogs, error: searchError } = await supabase
      .from('evaluation_logs')
      .select('id')
      .eq('activity_id', evaluationLog.activityId)
      .eq('user_id', evaluationLog.userId)
      .eq('conversation_hash', evaluationLog.conversationHash);
    
    if (searchError) {
      console.error('Error al buscar evaluaciones existentes:', searchError);
      return;
    }
    
    // Si ya existe una evaluación con el mismo hash, no registrar de nuevo
    if (existingLogs && existingLogs.length > 0) {
      console.log('Evaluación ya registrada para esta conversación');
      return;
    }
    
    // Insertar la nueva evaluación
    const { error: insertError } = await supabase
      .from('evaluation_logs')
      .insert({
        activity_id: evaluationLog.activityId,
        user_id: evaluationLog.userId,
        rubric_scores: evaluationLog.rubricScores,
        overall_score: evaluationLog.overallScore,
        feedback: evaluationLog.feedbackMessage,
        is_completed: evaluationLog.isCompleted,
        conversation_hash: evaluationLog.conversationHash,
        created_at: new Date().toISOString()
      });
    
    if (insertError) {
      console.error('Error al registrar evaluación:', insertError);
    }
  } catch (error) {
    console.error('Error al registrar evaluación:', error);
  }
}

/**
 * Detecta entregables en una conversación
 * @param interactions Interacciones de la conversación
 * @param deliverables Entregables a detectar
 * @returns Resultados de la detección
 */
async function detectDeliverables(
  interactions: Array<{
    user_message?: string;
    ai_message?: string;
    created_at?: string;
  }>,
  deliverables: Deliverable[]
): Promise<{ detected: Deliverable[]; missing: Deliverable[] }> {
  // Si no hay interacciones o entregables, devolver arrays vacíos
  if (!interactions.length || !deliverables.length) {
    console.log('No hay interacciones o entregables para evaluar');
    return { detected: [], missing: [...deliverables] };
  }

  // Construir el texto completo de la conversación
  const conversationText = interactions
    .map(interaction => `Usuario: ${interaction.user_message || ''}\nAsistente: ${interaction.ai_message || ''}`)
    .join('\n\n');
  
  // En Vite, las variables de entorno se acceden a través de import.meta.env
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const openaiEndpoint = import.meta.env.VITE_OPENAI_API_ENDPOINT || 'https://api.openai.com/v1';
  
  console.log('Usando API Key para detectDeliverables:', openaiKey ? 'Disponible' : 'No disponible');
  console.log('Usando endpoint para detectDeliverables:', openaiEndpoint);
  
  const detectedDeliverables: Deliverable[] = [];
  const missingDeliverables: Deliverable[] = [];
  
  // Crear un mapa para rastrear los entregables ya evaluados y evitar duplicados
  const evaluatedDeliverables = new Map<string, boolean>();
  
  // Para cada entregable, verificar si está presente en la conversación
  for (const deliverable of deliverables) {
    // Verificar si ya hemos evaluado este entregable
    const deliverableKey = `${deliverable.code}_${deliverable.description.substring(0, 30)}`;
    if (evaluatedDeliverables.has(deliverableKey)) {
      console.log(`Entregable ya evaluado: ${deliverable.code}`);
      const isDetected = evaluatedDeliverables.get(deliverableKey);
      if (isDetected) {
        detectedDeliverables.push(deliverable);
      } else {
        missingDeliverables.push(deliverable);
      }
      continue;
    }
    
    let isDetected = false;
    
    // Si el detection_query contiene un regex, usarlo
    if (deliverable.detection_query.regex) {
      try {
        const regex = new RegExp(deliverable.detection_query.regex, 'i');
        isDetected = regex.test(conversationText);
        console.log(`Evaluación por regex para ${deliverable.code}: ${isDetected ? 'Detectado' : 'No detectado'}`);
      } catch (error) {
        console.error(`Error al evaluar regex para entregable ${deliverable.code}:`, error);
      }
    }
    // Si el detection_query contiene un prompt, usar OpenAI
    else if (deliverable.detection_query.prompt && openaiKey) {
      try {
        // Mejorar el prompt para una detección más precisa
        const improvedPrompt = `Eres un evaluador experto que determina si un entregable específico está presente en una conversación.
        
Entregable requerido: "${deliverable.description}"

Instrucciones:
1. Analiza cuidadosamente si el entregable aparece explícitamente en la conversación
2. Busca frases o ideas que cumplan con el requisito del entregable, incluso si no usan exactamente las mismas palabras
3. Considera el contexto completo de la conversación

Responde únicamente con 'SÍ' si el entregable está claramente presente, o 'NO' si no lo está o es ambiguo.`;
        
        const response = await fetch(`${openaiEndpoint}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini', // Usar un modelo más capaz para mejor detección
            messages: [
              {
                role: "system",
                content: improvedPrompt
              },
              {
                role: "user",
                content: `Conversación a evaluar:\n\n${conversationText}\n\n¿Está presente el entregable? Responde únicamente con SÍ o NO.`
              }
            ],
            temperature: 0.1, // Temperatura baja para respuestas más deterministas
            max_tokens: 10
          })
        });
        
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
          const content = data.choices[0].message.content.trim().toUpperCase();
          isDetected = content.includes('SÍ') || content.includes('SI') || content.includes('YES');
          console.log(`Evaluación por IA para ${deliverable.code}: ${content} (${isDetected ? 'Detectado' : 'No detectado'})`);
        } else {
          console.error(`Respuesta inválida de OpenAI para entregable ${deliverable.code}:`, data);
        }
      } catch (error) {
        console.error(`Error al evaluar entregable ${deliverable.code} con OpenAI:`, error);
      }
    }
    
    // Guardar el resultado de la evaluación en el mapa
    evaluatedDeliverables.set(deliverableKey, isDetected);
    
    // Actualizar el estado del entregable
    deliverable.detected = isDetected;
    
    if (isDetected) {
      detectedDeliverables.push(deliverable);
    } else {
      missingDeliverables.push(deliverable);
    }
  }
  
  console.log(`Entregables detectados: ${detectedDeliverables.length}, Faltantes: ${missingDeliverables.length}`);
  
  return {
    detected: detectedDeliverables,
    missing: missingDeliverables
  };
}

/**
 * Evalúa la calidad de la conversación según la rúbrica definida
 * @param interactions Interacciones de la conversación
 * @param rubric Rúbrica para evaluar
 * @returns Rúbrica con puntuaciones
 */
async function scoreWithRubric(
  interactions: Array<{
    user_message?: string;
    ai_message?: string;
    created_at?: string;
  }>,
  rubric: RubricItem[]
): Promise<ScoredRubricItem[]> {
  const conversationText = interactions
    .map(interaction => `Usuario: ${interaction.user_message || ''}\nAsistente: ${interaction.ai_message || ''}`)
    .join('\n\n');
  
  // En Vite, las variables de entorno se acceden a través de import.meta.env
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
  const openaiEndpoint = import.meta.env.VITE_OPENAI_API_ENDPOINT || 'https://api.openai.com/v1';
  
  console.log('Usando API Key para detectDeliverables:', openaiKey ? 'Disponible' : 'No disponible');
  console.log('Usando endpoint para detectDeliverables:', openaiEndpoint);
  
  if (!openaiKey) {
    console.error('No se encontró la clave de API de OpenAI');
    // Convertir a ScoredRubricItem[] para cumplir con el tipo de retorno
    return rubric.map(item => ({
      ...item,
      score: 0 // Asignar puntuación 0 por defecto
    }));
  }
  
  try {
    // Formatear la rúbrica para el prompt
    const rubricText = rubric.map(item => 
      `ID: ${item.id}\nCriterio: ${item.success_criteria}\nPeso: ${item.weight}`
    ).join('\n\n');
    
    const response = await fetch(`${openaiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: "system",
            content: `Eres un auditor de calidad de consultoría.
Debes evaluar una conversación según una rúbrica y devolver un JSON con el formato: [{"id": "criterio_id", "score": 0.X, "explanation": "explicación"}]`
          },
          {
            role: "user",
            content: `Conversación: <<<${conversationText}>>>\nRúbrica: <<<${rubricText}>>>`
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extraer el JSON de la respuesta
    const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/) || content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        const evaluationResults = JSON.parse(jsonMatch[0]);
        
        // Combinar la rúbrica original con las puntuaciones
        const scoredRubric: ScoredRubricItem[] = rubric.map(item => {
          const evaluation = evaluationResults.find((e: any) => e.id === item.id);
          
          return {
            ...item,
            score: evaluation ? evaluation.score : 0,
            explanation: evaluation ? evaluation.explanation : 'No evaluado'
          } as ScoredRubricItem; // Forzar el tipo correcto
        });

        return scoredRubric;
      } catch (error) {
        console.error('Error al evaluar con rúbrica:', error);
        // En caso de error, devolver la rúbrica con puntuación 0
        return rubric.map(item => ({
          ...item,
          score: 0,
          explanation: 'Error en la evaluación'
        }) as ScoredRubricItem); // Forzar el tipo correcto
      }
    }
    
    // Si llegamos aquí, no se pudo extraer un JSON válido
    return rubric.map(item => ({
      ...item,
      score: 0,
      explanation: 'No se pudo evaluar correctamente'
    }) as ScoredRubricItem);
  } catch (error) {
    console.error('Error al evaluar con rúbrica:', error);
    // En caso de error, devolver la rúbrica con puntuación 0
    return rubric.map(item => ({
      ...item,
      score: 0,
      explanation: 'Error en la evaluación'
    }) as ScoredRubricItem);
  }
}

/**
 * Calcula la puntuación total ponderada de una evaluación
 * @param rubric Rúbrica con puntuaciones
 * @returns Puntuación total (0-1)
 */
function calculateOverallScore(rubric: RubricItem[]): number {
  if (rubric.length === 0) return 0;
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const item of rubric) {
    totalWeight += item.weight;
    weightedScore += (item.score || 0) * item.weight;
  }
  
  // Normalizar si los pesos no suman 1
  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

/**
 * Genera un mensaje de retroalimentación basado en la evaluación
 * @param rubric Rúbrica con puntuaciones
 * @param overallScore Puntuación total
 * @returns Mensaje de retroalimentación
 */
function generateFeedback(rubric: RubricItem[], overallScore: number): string {
  const threshold = 0.8; // Umbral para considerar completada la actividad
  
  if (overallScore >= threshold) {
    const strengths = rubric
      .filter(item => (item.score || 0) >= 0.8)
      .map(item => item.success_criteria);
    
    return `¡Excelente trabajo! Has completado esta actividad con éxito.\n\nPuntos fuertes:\n- ${strengths.join('\n- ')}\n\nPuntuación: ${Math.round(overallScore * 100)}%`;
  } else {
    const weaknesses = rubric
      .filter(item => (item.score || 0) < 0.7)
      .map(item => `${item.success_criteria} (${item.explanation || 'Necesita mejorar'})`);
    
    return `Estás avanzando bien, pero aún hay aspectos que puedes mejorar:\n\n- ${weaknesses.join('\n- ')}\n\nPuntuación actual: ${Math.round(overallScore * 100)}%`;
  }
}

/**
 * Evalúa si una actividad se ha completado basándose en los criterios definidos
 * @param activityId ID de la actividad (puede ser de content_registry o activity_contents)
 * @param userId ID del usuario
 * @param activityData Datos de la actividad
 * @returns Resultado de la evaluación
 */
export const evaluateCompletion = async (
  activityId: string,
  userId: string,
  activityData: ActivityData
): Promise<CompletionEvaluationResult> => {
  try {
    console.log(`⏳ Iniciando evaluación de actividad ${activityId} para usuario ${userId}`);
    
    // Verificar si los IDs son válidos antes de consultar
    if (!activityId || !userId) {
      console.error('⚠️ IDs inválidos para evaluación:', { activityId, userId });
      return {
        isCompleted: false,
        message: "No se puede evaluar la actividad con información incompleta."
      };
    }
    
    // Obtener directamente el ID de activity_contents para esta actividad
    let realActivityId = activityId;
    
    // Verificar si el ID proporcionado es de content_registry
    // Si es así, obtener el ID real de activity_contents
    const { data: registryData } = await supabase
      .from('content_registry')
      .select('content_id, content_type, content_table')
      .eq('id', activityId)
      .maybeSingle();
    
    if (registryData && registryData.content_type === 'activity' && 
        registryData.content_table === 'activity_contents' && registryData.content_id) {
      realActivityId = registryData.content_id;
      console.log(`🔍 ID de content_registry detectado: ${activityId} -> ID real de activity_contents: ${realActivityId}`);
    }
    
    // Buscar interacciones usando el ID real de activity_contents
    console.log(`🔎 Buscando interacciones con ID: ${realActivityId}`);
    const { data: dbInteractions, error } = await supabase
      .from('activity_interactions')
      .select('*')
      .eq('activity_id', realActivityId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error al obtener interacciones de la base de datos:', error);
      return {
        isCompleted: false,
        message: "Error al evaluar la finalización de la actividad."
      };
    }
    
    // Si no encontramos interacciones, verificar si hay alguna inconsistencia
    let finalInteractions = dbInteractions || [];
    
    if (finalInteractions.length === 0) {
      console.log(`⚠️ No se encontraron interacciones con el ID real. Verificando interacciones para esta actividad...`);
      
      // Buscar directamente todas las interacciones para este usuario
      // Esto nos ayudará a diagnosticar problemas de IDs
      const { data: simpleInteractions } = await supabase
        .from('activity_interactions')
        .select('activity_id')
        .eq('user_id', userId)
        .limit(20);
        
      if (simpleInteractions && simpleInteractions.length > 0) {
        // Contar ocurrencias de cada activity_id
        const activityCounts = simpleInteractions.reduce((acc, item) => {
          const id = item.activity_id;
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        console.log(`📊 Interacciones encontradas para este usuario:`, activityCounts);
        console.log(`🔍 IDs de actividades con interacciones:`, Object.keys(activityCounts));
        
        // Verificar si alguno de los IDs coincide con el ID real o el ID original
        const hasMatchingId = Object.keys(activityCounts).some(
          id => id === realActivityId || id === activityId
        );
        
        if (hasMatchingId) {
          console.log(`⚠️ Se encontraron interacciones con IDs relacionados, pero no con la consulta principal`);
        } else {
          console.log(`⚠️ Ninguno de los IDs de interacciones coincide con el ID de actividad actual`);
        }
      } else {
        console.log(`⚠️ No se encontraron interacciones para este usuario`);
      }
    }
    
    // Si no hay interacciones, no podemos evaluar
    if (finalInteractions.length === 0) {
      console.log('No hay interacciones para evaluar');
      return {
        isCompleted: false,
        message: "Inicia la conversación para completar esta actividad.",
        details: {
          interactionsCount: 0
        }
      };
    }
    
    // Importar la función para obtener la memoria a corto plazo
    const { getShortTermMemory } = await import('../lib/chatMemoryService');
    
    // Obtener interacciones de la memoria a corto plazo
    const shortTermMemory = getShortTermMemory();
    console.log(`💭 Memoria a corto plazo: ${shortTermMemory.length} mensajes`);
    
    // Convertir la memoria a corto plazo al formato de interacciones
    const memoryInteractions = shortTermMemory.map(msg => ({
      user_message: msg.role === 'user' ? msg.content : undefined,
      ai_message: msg.role === 'assistant' ? msg.content : undefined,
      created_at: new Date().toISOString()
    }));
    
    // Combinar interacciones de la base de datos y memoria a corto plazo
    // Eliminar duplicados basados en el contenido del mensaje
    const allInteractions = [...finalInteractions];
    
    // Añadir interacciones de memoria que no estén ya en la base de datos
    for (const memoryItem of memoryInteractions) {
      const isDuplicate = finalInteractions.some(dbItem => 
        (memoryItem.user_message && dbItem.user_message === memoryItem.user_message) ||
        (memoryItem.ai_message && dbItem.ai_message === memoryItem.ai_message)
      );
      
      if (!isDuplicate) {
        allInteractions.push(memoryItem);
      }
    }
    
    console.log(`💭 Total de interacciones para evaluación: ${allInteractions.length} (BD: ${finalInteractions.length}, Memoria: ${memoryInteractions.length})`);
    
    // Usar las interacciones combinadas para la evaluación
    const interactions = allInteractions;
    
    // Generamos un ID simple para la conversación basado en timestamp y un número aleatorio
    // Esto es una solución compatible con navegadores que no requiere el módulo crypto
    const timestamp = new Date().getTime();
    const randomPart = Math.floor(Math.random() * 1000000);
    const conversationHash = `${timestamp}-${randomPart}`;
    
    console.log('Evaluando actividad:', activityId);
    
    // Verificar si la evaluación avanzada está habilitada
    const useAdvancedEvaluation = activityData.use_advanced_evaluation === true;
    console.log('Evaluación avanzada habilitada:', useAdvancedEvaluation ? 'Sí' : 'No');
    
    // Solo obtener entregables y rúbrica si la evaluación avanzada está habilitada
    // Esto evita consultas innecesarias a la base de datos
    let deliverables: Deliverable[] = [];
    let rubric: RubricItem[] = [];
    
    if (useAdvancedEvaluation) {
      // Obtener entregables y rúbrica en paralelo para mejorar el rendimiento
      const [deliverablesResult, rubricResult] = await Promise.all([
        getDeliverables(activityId),
        getRubric(activityId)
      ]);
      
      deliverables = deliverablesResult;
      rubric = rubricResult;
      
      console.log('Entregables encontrados:', deliverables.length);
      console.log('Criterios de rúbrica encontrados:', rubric.length);
    }
    
    console.log('Criterios básicos definidos:', activityData.completion_criteria ? 'Sí' : 'No');
    
    // Si no hay entregables ni rúbrica, intentar usar criterios básicos
    if (deliverables.length === 0 && rubric.length === 0) {
      console.log('No se encontraron entregables ni rúbrica, verificando criterios básicos');
      
      // Verificar si hay criterios básicos definidos
      if (!activityData.completion_criteria) {
        console.log('No se encontraron criterios de evaluación explícitos, usando criterio por defecto');
        
        // Usar un criterio por defecto basado en interacciones
        const defaultCriteria: CompletionCriteria = {
          min_interactions: 2 // Requerir al menos 2 interacciones para completar la actividad
        };
        
        // Asignar el criterio por defecto
        activityData.completion_criteria = defaultCriteria;
        console.log('Criterio por defecto aplicado:', defaultCriteria);
      }
      
      console.log('Usando criterios básicos de evaluación:', activityData.completion_criteria);
      
      // Usar criterios definidos para evaluar la actividad
      const criteria = activityData.completion_criteria as CompletionCriteria;
      console.log('🔍 Evaluando con criterios:', JSON.stringify(criteria));
      console.log(`🔍 Número de interacciones: ${interactions.length}`);
      
      // Crear un objeto para almacenar los detalles de la evaluación
      const evaluationDetails: any = { 
        interactionsCount: interactions.length,
        criteriosEvaluados: []
      };
      
      // Verificar criterio de interacciones mínimas
      if (criteria.min_interactions !== undefined) {
        evaluationDetails.criteriosEvaluados.push({
          tipo: 'min_interactions',
          valor: criteria.min_interactions,
          cumplido: interactions.length >= criteria.min_interactions
        });
        
        if (interactions.length < criteria.min_interactions) {
          console.log(`❌ No cumple criterio de interacciones mínimas: ${interactions.length}/${criteria.min_interactions}`);
          return {
            isCompleted: false,
            message: `Necesitas al menos ${criteria.min_interactions} interacciones para completar esta actividad.`,
            details: evaluationDetails
          };
        } else {
          console.log(`✅ Cumple criterio de interacciones mínimas: ${interactions.length}/${criteria.min_interactions}`);
        }
      }
      
      // Verificar criterio de interacciones máximas
      if (criteria.max_interactions !== undefined) {
        evaluationDetails.criteriosEvaluados.push({
          tipo: 'max_interactions',
          valor: criteria.max_interactions,
          cumplido: interactions.length >= criteria.max_interactions
        });
        
        if (interactions.length >= criteria.max_interactions) {
          console.log(`✅ Alcanzó el máximo de interacciones: ${interactions.length}/${criteria.max_interactions}`);
          return {
            isCompleted: true,
            message: generateCompletionMessage(activityData),
            details: evaluationDetails
          };
        }
      }
      
      // Verificar criterio de temas requeridos
      if (criteria.required_topics && criteria.required_topics.length > 0) {
        // Implementación simplificada: buscar los temas en las interacciones
        const topicsCovered: string[] = [];
        const missingTopics: string[] = [];
        
        for (const topic of criteria.required_topics) {
          const topicFound = interactions.some(interaction => 
            (interaction.user_message && interaction.user_message.toLowerCase().includes(topic.toLowerCase())) ||
            (interaction.ai_message && interaction.ai_message.toLowerCase().includes(topic.toLowerCase()))
          );
          
          if (topicFound) {
            topicsCovered.push(topic);
          } else {
            missingTopics.push(topic);
          }
        }
        
        evaluationDetails.criteriosEvaluados.push({
          tipo: 'required_topics',
          valor: criteria.required_topics,
          cubiertos: topicsCovered,
          faltantes: missingTopics,
          cumplido: missingTopics.length === 0
        });
        
        evaluationDetails.topicsCovered = topicsCovered;
        evaluationDetails.missingTopics = missingTopics;
        
        console.log(`🔍 Temas cubiertos: ${topicsCovered.length}/${criteria.required_topics.length}`);
        
        if (missingTopics.length > 0) {
          console.log(`❌ Faltan temas por cubrir: ${missingTopics.join(', ')}`);
          return {
            isCompleted: false,
            message: `Faltan temas por cubrir: ${missingTopics.join(', ')}`,
            details: evaluationDetails
          };
        } else {
          console.log(`✅ Todos los temas requeridos han sido cubiertos`);
        }
      }
      
      // Verificar criterio de palabras clave requeridas
      if (criteria.required_keywords && criteria.required_keywords.length > 0) {
        const keywordsFound: string[] = [];
        const missingKeywords: string[] = [];
        
        for (const keyword of criteria.required_keywords) {
          const keywordFound = interactions.some(interaction => 
            (interaction.user_message && interaction.user_message.toLowerCase().includes(keyword.toLowerCase())) ||
            (interaction.ai_message && interaction.ai_message.toLowerCase().includes(keyword.toLowerCase()))
          );
          
          if (keywordFound) {
            keywordsFound.push(keyword);
          } else {
            missingKeywords.push(keyword);
          }
        }
        
        evaluationDetails.criteriosEvaluados.push({
          tipo: 'required_keywords',
          valor: criteria.required_keywords,
          encontradas: keywordsFound,
          faltantes: missingKeywords,
          cumplido: missingKeywords.length === 0
        });
        
        evaluationDetails.keywordsFound = keywordsFound;
        evaluationDetails.missingKeywords = missingKeywords;
        
        console.log(`🔍 Palabras clave encontradas: ${keywordsFound.length}/${criteria.required_keywords.length}`);
        
        if (missingKeywords.length > 0) {
          console.log(`❌ Faltan palabras clave: ${missingKeywords.join(', ')}`);
          return {
            isCompleted: false,
            message: `Faltan palabras clave: ${missingKeywords.join(', ')}`,
            details: evaluationDetails
          };
        } else {
          console.log(`✅ Todas las palabras clave requeridas han sido encontradas`);
        }
      }
      
      // Si todos los criterios se cumplen o solo hay criterio de interacciones mínimas y se cumple
      if (criteria.min_interactions !== undefined && interactions.length >= criteria.min_interactions) {
        console.log(`✅ Actividad completada: se cumplen todos los criterios de evaluación`);
        return {
          isCompleted: true,
          message: generateCompletionMessage(activityData),
          details: evaluationDetails
        };
      }
      
      // Si llegamos aquí, significa que hay criterios pero no se cumplen todos todavía
      console.log(`❌ Actividad no completada: no se cumplen todos los criterios`);
      return {
        isCompleted: false,
        message: "Continúa interactuando para completar la actividad.",
        details: evaluationDetails
      };
    }
    
    // Detectar entregables
    const deliverableResults = await detectDeliverables(interactions, deliverables);
    
    // Si no hay interacciones, no podemos evaluar
    if (interactions.length === 0) {
      console.log('No hay interacciones para evaluar');
      return {
        isCompleted: false,
        message: "Inicia la conversación para completar esta actividad.",
        details: {
          interactionsCount: 0
        }
      };
    }
    
    // Verificar si hay suficientes interacciones para una evaluación precisa
    // Requerimos al menos 3 interacciones para una evaluación más completa
    const MIN_INTERACTIONS_FOR_EVALUATION = 3;
    if (interactions.length < MIN_INTERACTIONS_FOR_EVALUATION) {
      console.log(`Solo hay ${interactions.length} interacciones, esperando al menos ${MIN_INTERACTIONS_FOR_EVALUATION} para una evaluación completa`);
      return {
        isCompleted: false,
        message: "Continúa la conversación para completar la actividad. Se necesitan más interacciones para evaluar tu progreso.",
        details: {
          interactionsCount: interactions.length
        }
      };
    }
    
    // Calcular el porcentaje de entregables detectados
    const totalDeliverables = deliverables.length;
    const detectedCount = deliverableResults.detected.length;
    const detectionPercentage = totalDeliverables > 0 ? (detectedCount / totalDeliverables) * 100 : 0;
    
    console.log(`Porcentaje de entregables detectados: ${detectionPercentage.toFixed(1)}% (${detectedCount}/${totalDeliverables})`);
    
    // Si faltan entregables, informar al usuario
    if (deliverableResults.missing.length > 0) {
      // Limitar el número de entregables faltantes que se muestran para no abrumar al usuario
      const maxMissingToShow = 1; // Mostrar solo el primer entregable faltante
      const missingDescriptions = deliverableResults.missing
        .slice(0, maxMissingToShow)
        .map(d => d.description);
      
      // Si hay más entregables faltantes de los que mostramos, indicarlo
      const additionalMissingCount = deliverableResults.missing.length - maxMissingToShow;
      const additionalMissingText = additionalMissingCount > 0 ? 
        ` y ${additionalMissingCount} ${additionalMissingCount === 1 ? 'otro entregable' : 'otros entregables'} más` : '';
      
      return {
        isCompleted: false,
        message: `Aún falta el siguiente entregable: ${missingDescriptions.join(', ')}${additionalMissingText}.`,
        details: {
          deliverables: {
            detected: deliverableResults.detected.map(d => d.code),
            missing: deliverableResults.missing.map(d => d.code)
          },
          detectionPercentage: detectionPercentage
        }
      };
    }
    
    // Evaluar con la rúbrica
    const scoredRubric: ScoredRubricItem[] = await scoreWithRubric(interactions, rubric);
    
    // Calcular puntuación total
    const overallScore = calculateOverallScore(scoredRubric);
    
    // Generar feedback
    const feedbackMessage = generateFeedback(scoredRubric, overallScore);
    
    // Determinar si la actividad está completada (umbral de 0.8)
    const SUCCESS_THRESHOLD = 0.8;
    // Si la puntuación total es suficiente para completar la actividad
    if (overallScore >= SUCCESS_THRESHOLD) {
      // Verificar si el usuario ha confirmado que desea finalizar
      const userConfirmed = hasUserConfirmed(interactions);
      
      // Si el usuario ha confirmado, completar la actividad
      if (userConfirmed) {
        // Generar mensaje de retroalimentación
        const feedbackMessage = generateFeedback(scoredRubric, overallScore);
        
        // Registrar la evaluación en la base de datos
        // Solo registramos evaluaciones completas o cuando hay una puntuación significativa
        // Esto reduce las escrituras innecesarias en la base de datos
        if (overallScore >= 0.5) {
          try {
            await logEvaluation({
              activityId,
              userId,
              rubricScores: scoredRubric.reduce((acc, item) => {
                acc[item.id] = item.score;
                return acc;
              }, {} as Record<string, number>),
              overallScore,
              feedbackMessage,
              isCompleted: overallScore >= SUCCESS_THRESHOLD,
              conversationHash
            });
            console.log(`Evaluación registrada correctamente (puntuación: ${overallScore.toFixed(2)})`);
          } catch (logError) {
            console.error('Error al registrar la evaluación:', logError);
          }
        } else {
          console.log(`Omitiendo registro de evaluación con puntuación baja: ${overallScore.toFixed(2)}`);
        }
        
        return {
          isCompleted: true,
          message: feedbackMessage,
          details: {
            rubric: scoredRubric,
            overallScore,
            deliverables: {
              detected: deliverableResults.detected.map(d => d.code),
              missing: deliverableResults.missing.map(d => d.code)
            }
          }
        };
      } else {
        // Si el usuario no ha confirmado, solicitar confirmación
        const confirmationMessage = promptUserConfirmation(scoredRubric, overallScore);
        
        return {
          isCompleted: false,
          message: confirmationMessage,
          details: {
            rubric: scoredRubric,
            overallScore,
            deliverables: {
              detected: deliverableResults.detected.map(d => d.code),
              missing: deliverableResults.missing.map(d => d.code)
            }
          }
        };
      }
    } else {
      // Si la puntuación total no es suficiente, no completar la actividad
      return {
        isCompleted: false,
        message: feedbackMessage,
        details: {
          rubric: scoredRubric,
          overallScore,
          deliverables: {
            detected: deliverableResults.detected.map(d => d.code),
            missing: deliverableResults.missing.map(d => d.code)
          }
        }
      };
    }
  } catch (error) {
    console.error('Error al evaluar la finalización de la actividad:', error);
    return {
      isCompleted: false,
      message: "Error al evaluar la finalización de la actividad."
    };
  }
};



/**
 * Genera un mensaje de finalización para la actividad
 * @param activityData Datos de la actividad
 * @returns Mensaje de finalización
 */
/**
 * Genera un mensaje para solicitar confirmación al usuario antes de finalizar la actividad
 * @param scoredRubric Rúbrica con puntuaciones
 * @param overallScore Puntuación total
 * @returns Mensaje de solicitud de confirmación
 */
export const promptUserConfirmation = (scoredRubric: ScoredRubricItem[], overallScore: number): string => {
  // Formatear la puntuación como porcentaje
  const scorePercentage = Math.round(overallScore * 100);
  
  // Filtrar solo los elementos con puntuación válida
  const validRubricItems = scoredRubric.filter(item => 
    typeof item.score === 'number' && 
    typeof item.success_criteria === 'string'
  ) as Array<ScoredRubricItem & {success_criteria: string}>;
  
  // Ordenar por puntuación
  const sortedItems = [...validRubricItems].sort((a, b) => b.score - a.score);
  
  // Obtener el mejor y peor criterio
  const bestCriterion = sortedItems.length > 0 ? sortedItems[0] : null;
  const worstCriterion = sortedItems.length > 1 ? sortedItems[sortedItems.length - 1] : null;
  
  // Construir el mensaje
  let message = `Basado en nuestra conversación, has alcanzado un ${scorePercentage}% de los criterios de evaluación para esta actividad.\n\n`;
  
  if (bestCriterion) {
    message += `Destacas especialmente en: **${bestCriterion.success_criteria}**\n\n`;
  }
  
  if (worstCriterion && worstCriterion.score < 0.7) {
    message += `Podrías mejorar en: **${worstCriterion.success_criteria}**\n\n`;
  }
  
  message += "¿Te gustaría finalizar esta actividad ahora o prefieres continuar trabajando en ella?\n\n";
  message += "Responde **FINALIZAR** si estás conforme con el resultado actual, o continúa la conversación si deseas mejorar tu puntuación.";
  
  return message;
};

/**
 * Verifica si el usuario ha confirmado que desea finalizar la actividad
 * @param interactions Interacciones de la conversación
 * @returns true si el usuario ha confirmado, false en caso contrario
 */
export const hasUserConfirmed = (interactions: Array<{ user_message?: string; ai_message?: string; created_at?: string; }>): boolean => {
  // Buscar en los últimos 3 mensajes del usuario
  const userMessages = interactions
    .filter(interaction => interaction.user_message)
    .map(interaction => interaction.user_message || '')
    .slice(-3);
  
  // Verificar si alguno de los mensajes contiene la palabra clave de confirmación
  return userMessages.some(message => {
    const normalizedMessage = message.toUpperCase().trim();
    return normalizedMessage.includes('FINALIZAR') || 
           normalizedMessage.includes('TERMINAR') || 
           normalizedMessage.includes('COMPLETAR') ||
           normalizedMessage.includes('LISTO');
  });
};

export const generateCompletionMessage = (activityData: ActivityData): string => {
  // Si hay un mensaje de finalización personalizado, usarlo
  if (activityData.completion_message) {
    return activityData.completion_message;
  }
  
  // Si no hay mensaje personalizado, generar uno genérico
  return "¡Felicidades! Has completado esta actividad correctamente.";
}

/**
 * Genera instrucciones de evaluación para incluir en el prompt del chat
 * @param activityId ID de la actividad
 * @param activityData Datos de la actividad
 * @param interactionCount Número de interacciones
 * @returns Instrucciones de evaluación para el prompt
 */
// Función para determinar si una interacción específica debería incluir evaluación
export async function shouldEvaluate(
  _activityId: string, // Prefijo con guion bajo para indicar que no se usa
  interactionCount: number
): Promise<boolean> {
  try {
    // Verificar según la lógica actual: evaluar cada 3 interacciones o en la primera
    return interactionCount % 3 === 0 || interactionCount === 1;
    
    // Nota: actualmente no usamos activityId, pero lo mantenemos como parámetro
    // para posibles personalizaciones futuras basadas en el tipo de actividad
  } catch (error) {
    console.error('Error al verificar si se debe evaluar:', error);
    return false;
  }
}

export async function generateEvaluationInstructions(
  activityId: string,
  activityData: ActivityData,
  interactionCount: number
): Promise<string> {
  try {
    // Solo evaluar cada 3 interacciones o en la primera
    if (interactionCount % 3 !== 0 && interactionCount !== 1) {
      return '';
    }
    
    console.log(`🔍 Generando instrucciones de evaluación para interacción ${interactionCount}`);
    
    // Obtener el ID real de la actividad
    const realActivityId = await resolveActivityId(activityId);
    
    // Mostrar un resumen de las instrucciones generadas para depuración
    let instructions = `\n\n### INSTRUCCIONES DE EVALUACIÓN (NO MOSTRAR AL USUARIO)\nEvalúa si el usuario ha completado la actividad basándote en la conversación anterior.\n`;
    console.log(`📝 Instrucciones de evaluación generadas: ${instructions.length} caracteres`);
    
    // Siempre intentar obtener entregables y rúbrica, independientemente de la configuración
    const deliverables = await getDeliverables(realActivityId);
    const rubric = await getRubric(realActivityId);
    
    console.log(`📊 Entregables encontrados: ${deliverables.length}`);
    console.log(`📊 Criterios de rúbrica encontrados: ${rubric.length}`);
    
    // Añadir entregables y rúbrica si existen, independientemente de la configuración
    if (deliverables.length > 0) {
      instructions += `\n#### Entregables Requeridos:\n`;
      deliverables.forEach(d => {
        instructions += `- ${d.code}: ${d.description}\n`;
      });
    }
    
    if (rubric.length > 0) {
      instructions += `\n#### Criterios de Evaluación:\n`;
      rubric.forEach(r => {
        instructions += `- ${r.id} (Peso: ${r.weight}): ${r.success_criteria}\n`;
      });
    }
    
    // Añadir criterios básicos si están definidos
    if (activityData.completion_criteria) {
      const criteria = activityData.completion_criteria as CompletionCriteria;
      instructions += `\n#### Criterios Básicos:\n`;
      
      if (criteria.min_interactions !== undefined) {
        instructions += `- Interacciones mínimas: ${criteria.min_interactions}\n`;
      }
      
      if (criteria.max_interactions !== undefined) {
        instructions += `- Interacciones máximas: ${criteria.max_interactions}\n`;
      }
      
      if (criteria.required_topics && criteria.required_topics.length > 0) {
        instructions += `- Temas requeridos: ${criteria.required_topics.join(', ')}\n`;
      }
      
      if (criteria.required_keywords && criteria.required_keywords.length > 0) {
        instructions += `- Palabras clave requeridas: ${criteria.required_keywords.join(', ')}\n`;
      }
    } else if (!deliverables.length && !rubric.length) {
      // Solo usar criterio por defecto si no hay entregables ni rúbrica
      instructions += `\n#### Criterios Básicos:\n- Interacciones mínimas: 2\n`;
    }
    
    // Añadir instrucciones para el formato de respuesta con mayor énfasis y claridad
    instructions += `\n\n################################################
### FORMATO DE RESPUESTA (ABSOLUTAMENTE OBLIGATORIO) ###
################################################\n\n⚠️⚠️⚠️ ATENCIÓN MODELO: DEBES INCLUIR UNA EVALUACIÓN AL FINAL DE TU RESPUESTA. ESTO ES PARTE ESENCIAL DE TU TAREA. ⚠️⚠️⚠️\n\nTu respuesta DEBE terminar con el siguiente formato exacto:\n\n---EVALUACION---\n{
  "isCompleted": true/false,
  "message": "Mensaje de evaluación",
  "details": {
    "overallScore": número entre 0.0 y 1.0,
    "rubric": {
      "criterio1": puntuación,
      "criterio2": puntuación
    },
    "interactionsCount": número de interacciones,
    "criteriosEvaluados": [
      {
        "tipo": "tipo de criterio",
        "valor": valor del criterio,
        "cumplido": true/false
      }
    ]
  }
}\n`;
    
    // Añadir un ejemplo concreto más destacado
    instructions += `\n\n### EJEMPLO EXACTO DE CÓMO DEBE VERSE TU RESPUESTA COMPLETA:\n\nTu respuesta normal al usuario...\n\n---EVALUACION---\n{\n  "isCompleted": true,\n  "message": "El usuario ha completado la actividad correctamente",\n  "details": {\n    "overallScore": 0.85,\n    "rubric": {\n      "criterio1": 0.9,\n      "criterio2": 0.8\n    },\n    "interactionsCount": 5,\n    "criteriosEvaluados": [\n      {\n        "tipo": "interacciones",\n        "valor": 5,\n        "cumplido": true\n      }\n    ]\n  }\n}\n`;
    
    // Añadir múltiples advertencias para reforzar la importancia
    instructions += `\n\n⚠️⚠️⚠️ INSTRUCCIONES FINALES EXTREMADAMENTE IMPORTANTES ⚠️⚠️⚠️\n\n1. SIEMPRE debes terminar tu respuesta con la sección ---EVALUACION--- seguida del JSON.\n2. NUNCA omitas esta sección bajo ninguna circunstancia.\n3. Esta sección NO debe mostrarse al usuario, pero DEBE estar presente en tu respuesta.\n4. El sistema DEPENDE de esta sección para funcionar correctamente.\n5. Si no incluyes esta sección, el sistema fallará y tu tarea no se completará correctamente.\n\nEsta es tu PRIORIDAD MÁXIMA: incluir la sección de evaluación al final de tu respuesta.\n\n⚠️⚠️⚠️ RECUERDA: TU RESPUESTA DEBE TERMINAR CON LA SECCIÓN ---EVALUACION--- SEGUIDA DEL JSON. ESTO ES OBLIGATORIO. ⚠️⚠️⚠️\n`;
    
    // Mostrar un resumen de las instrucciones generadas para depuración
    console.log(`📝 Instrucciones de evaluación generadas: ${instructions.length} caracteres`);
    console.log(`📝 Contiene entregables: ${instructions.includes('Entregables Requeridos')}`);
    console.log(`📝 Contiene rúbrica: ${instructions.includes('Criterios de Evaluación')}`);
    console.log(`📝 Contiene criterios básicos: ${instructions.includes('Criterios Básicos')}`);
    
    return instructions;
  } catch (error) {
    console.error('Error al generar instrucciones de evaluación:', error);
    return '';
  }
}
