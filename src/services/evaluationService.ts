import { supabase } from '../lib/supabase';

// Definición de interfaces necesarias
export interface ActivityData {
  prompt?: string;
  system_instructions?: string;
  initial_message?: string;
  max_exchanges?: number;
  completion_criteria?: CompletionCriteria;
  step?: number;
  prompt_section?: string;
  dependencies?: string[];
}

export interface CompletionCriteria {
  min_interactions?: number;
  max_interactions?: number;
  required_topics?: string[];
  required_keywords?: string[];
}

// Interfaces para evaluaciones
export interface EvaluationResult {
  isCompleted: boolean;
  message: string;
  details?: {
    overallScore?: number;
    rubric?: Record<string, number>;
    interactionsCount?: number;
    criteriosEvaluados?: Array<{
      tipo: string;
      valor: any;
      cumplido: boolean;
    }>;
  };
}

export interface EvaluationLog {
  activityId: string;
  userId: string;
  rubricScores: Record<string, number>;
  overallScore: number;
  feedbackMessage: string;
  isCompleted: boolean;
  conversationHash: string;
}

export interface Deliverable {
  id: string;
  code: string;
  description: string;
  detection_query?: any;
}

export interface RubricCriterion {
  id: string;
  criterion_id: string;
  success_criteria: string;
  weight: number;
}

/**
 * Determina si una interacción específica debe incluir evaluación
 * @param activityId ID de la actividad
 * @param interactionCount Número de interacción actual
 * @returns Boolean indicando si debe incluir evaluación
 */
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

/**
 * Obtiene el ID real de una actividad a partir de su ID de registro
 * @param activityId ID de la actividad o registro
 * @returns ID real de la actividad
 */
export async function resolveActivityId(activityId: string): Promise<string> {
  try {
    // Verificar si es un ID de registro en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('content_id')
      .eq('id', activityId)
      .single();
    
    if (registryData && !registryError) {
      console.log(`✅ ID encontrado en content_registry, usando content_id: ${registryData.content_id}`);
      return registryData.content_id;
    }
    
    // Si no es un ID de registro, usar el ID original
    return activityId;
  } catch (error) {
    console.error('Error al resolver ID de actividad:', error);
    return activityId;
  }
}

/**
 * Obtiene los entregables para una actividad
 * @param activityId ID de la actividad
 * @returns Lista de entregables
 */
export async function getDeliverables(activityId: string): Promise<Deliverable[]> {
  try {
    console.log(`Buscando entregables para actividad ID: ${activityId}`);
    
    // Buscar entregables directamente con el ID proporcionado
    const { data: deliverables, error } = await supabase
      .from('activity_deliverables')
      .select('*')
      .eq('activity_id', activityId);
    
    if (error) {
      console.error('Error al obtener entregables:', error);
      return [];
    }
    
    if (deliverables && deliverables.length > 0) {
      console.log(`✅ Encontrados ${deliverables.length} entregables directamente con ID: ${activityId}`);
      return deliverables;
    }
    
    // Si no se encontraron entregables, intentar resolver el ID real
    const realActivityId = await resolveActivityId(activityId);
    
    if (realActivityId !== activityId) {
      // Buscar entregables con el ID real
      const { data: resolvedDeliverables, error: resolvedError } = await supabase
        .from('activity_deliverables')
        .select('*')
        .eq('activity_id', realActivityId);
      
      if (resolvedError) {
        console.error('Error al obtener entregables con ID resuelto:', resolvedError);
        return [];
      }
      
      if (resolvedDeliverables && resolvedDeliverables.length > 0) {
        console.log(`✅ Encontrados ${resolvedDeliverables.length} entregables con ID resuelto: ${realActivityId}`);
        return resolvedDeliverables;
      }
    }
    
    console.log(`⚠️ No se encontraron entregables para la actividad ${activityId}`);
    return [];
  } catch (error) {
    console.error('Error al obtener entregables:', error);
    return [];
  }
}

/**
 * Obtiene los criterios de rúbrica para una actividad
 * @param activityId ID de la actividad
 * @returns Lista de criterios de rúbrica
 */
export async function getRubric(activityId: string): Promise<RubricCriterion[]> {
  try {
    console.log(`Buscando criterios de rúbrica para actividad ID: ${activityId}`);
    
    // Buscar criterios directamente con el ID proporcionado
    const { data: rubric, error } = await supabase
      .from('evaluation_rubrics')
      .select('*')
      .eq('activity_id', activityId);
    
    if (error) {
      console.error('Error al obtener criterios de rúbrica:', error);
      return [];
    }
    
    if (rubric && rubric.length > 0) {
      console.log(`✅ Encontrados ${rubric.length} criterios de rúbrica directamente con ID: ${activityId}`);
      return rubric;
    }
    
    // Si no se encontraron criterios, intentar resolver el ID real
    const realActivityId = await resolveActivityId(activityId);
    
    if (realActivityId !== activityId) {
      // Buscar criterios con el ID real
      const { data: resolvedRubric, error: resolvedError } = await supabase
        .from('evaluation_rubrics')
        .select('*')
        .eq('activity_id', realActivityId);
      
      if (resolvedError) {
        console.error('Error al obtener criterios de rúbrica con ID resuelto:', resolvedError);
        return [];
      }
      
      if (resolvedRubric && resolvedRubric.length > 0) {
        console.log(`✅ Encontrados ${resolvedRubric.length} criterios de rúbrica con ID resuelto: ${realActivityId}`);
        return resolvedRubric;
      }
    }
    
    console.log(`⚠️ No se encontraron criterios de rúbrica para la actividad ${activityId}`);
    return [];
  } catch (error) {
    console.error('Error al obtener criterios de rúbrica:', error);
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
    const { data: existingEval, error: checkError } = await supabase
      .from('evaluation_logs')
      .select('id')
      .eq('conversation_hash', evaluationLog.conversationHash)
      .maybeSingle();
    
    if (checkError) {
      console.error('Error al verificar evaluación existente:', checkError);
    }
    
    if (existingEval) {
      console.log(`⚠️ Ya existe una evaluación con el hash ${evaluationLog.conversationHash}. No se registrará duplicado.`);
      return;
    }
    
    // Insertar la evaluación en la base de datos
    const { error } = await supabase
      .from('activity_evaluations')
      .insert({
        activity_id: evaluationLog.activityId,
        user_id: evaluationLog.userId,
        rubric_scores: evaluationLog.rubricScores,
        overall_score: evaluationLog.overallScore,
        feedback_message: evaluationLog.feedbackMessage,
        is_completed: evaluationLog.isCompleted,
        conversation_hash: evaluationLog.conversationHash,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error al registrar evaluación:', error);
      throw error;
    }

    console.log(`✅ Evaluación registrada para actividad ${evaluationLog.activityId}`);

    // Si la actividad está completada, actualizar el estado
    if (evaluationLog.isCompleted) {
      const { error: updateError } = await supabase
        .from('activity_completions')
        .upsert({
          activity_id: evaluationLog.activityId,
          user_id: evaluationLog.userId,
          is_completed: true,
          completed_at: new Date().toISOString(),
          evaluation_score: evaluationLog.overallScore
        });

      if (updateError) {
        console.error('Error al actualizar estado de completitud:', updateError);
      } else {
        console.log(`✅ Estado de completitud actualizado para actividad ${evaluationLog.activityId}`);
      }
    }
  } catch (error) {
    console.error('Error al registrar evaluación:', error);
    throw error;
  }
}

/**
 * Genera instrucciones para evaluaciones
 * @param activityId ID de la actividad
 * @param activityData Datos de la actividad
 * @param interactionCount Número de interacción actual
 * @returns Instrucciones para evaluación
 */
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
    
    // Añadir instrucciones simplificadas para el formato de respuesta
    instructions += `\n\n⚠️⚠️⚠️ IMPORTANTE: DEBES INCLUIR UNA EVALUACIÓN AL FINAL DE TU RESPUESTA \n\nDespués de responder normalmente al usuario, AÑADE SIEMPRE esta estructura:\n\n---EVALUACION---\n{
  "isCompleted": true/false,
  "message": "Breve evaluación",
  "details": {
    "overallScore": 0.0-1.0,
    "rubric": {
      "criterio1": 0.0-1.0
    }
  }
}\n`;

    // Añadir ejemplo corto
    instructions += `\n\nEjemplo: Tu respuesta normal al usuario...\n\n---EVALUACION---\n{\n  "isCompleted": true,\n  "message": "Evaluación completa",\n  "details": {\n    "overallScore": 0.85,\n    "rubric": {\n      "criterio1": 0.9\n    }\n  }\n}\n`;

    // Reforzar la importancia con instrucciones concisas
    instructions += `\n\n⚠️ OBLIGATORIO: Termina SIEMPRE con ---EVALUACION--- seguido del JSON. Esta sección es esencial para el sistema pero NO debe mostrarse al usuario.\n`;

    return instructions;
  } catch (error) {
    console.error('Error al generar instrucciones de evaluación:', error);
    return '';
  }
}

/**
 * Extrae la evaluación de una respuesta
 * @param fullResponse Respuesta completa
 * @returns Respuesta sin evaluación y resultado de evaluación
 */
export function extractEvaluationFromResponse(
  fullResponse: string
): { response: string; evaluationResult: EvaluationResult | null } {
  // Respuesta por defecto
  let response = fullResponse;
  let evaluationResult = null;
  
  // Buscar la sección de evaluación en la respuesta usando diferentes posibles separadores
  const possibleSeparators = [
    '---EVALUACION---',
    '---EVALUACIÓN---',
    '--- EVALUACION ---',
    '--- EVALUACIÓN ---',
    'EVALUACION:',
    'EVALUACIÓN:',
    '\n\nEVALUACION\n',
    '\n\nEVALUACIÓN\n'
  ];
  
  console.log(`🔍 Verificando si la respuesta contiene evaluación (longitud de respuesta: ${fullResponse.length} caracteres)`);
  
  // Buscar el primer separador que funcione
  let foundSeparator: string | null = null;
  let parts: string[] = [];
  
  for (const separator of possibleSeparators) {
    if (fullResponse.includes(separator)) {
      parts = fullResponse.split(separator);
      if (parts.length > 1) {
        foundSeparator = separator;
        console.log(`✅ Separador de evaluación encontrado: "${separator}"`);
        break;
      }
    }
  }
  
  // Si encontramos un separador válido
  if (foundSeparator && parts.length > 1) {
    // Extraer la respuesta normal y la evaluación
    response = parts[0].trim();
    let evaluationText = parts[1].trim();
    
    console.log(`✅ Evaluación encontrada en la respuesta. Texto de evaluación: ${evaluationText.substring(0, 50)}...`);
    
    // Limpiar el texto de evaluación para asegurar que sea JSON válido
    // Eliminar comillas iniciales y finales adicionales si existen
    evaluationText = evaluationText.replace(/^["'\s{]+/, '{').replace(/["'\s}]+$/, '}');
    
    // Intentar parsear el JSON de evaluación
    try {
      evaluationResult = JSON.parse(evaluationText);
      console.log('🔍 Evaluación extraída de la respuesta:', evaluationResult.isCompleted ? '✅ Completada' : '❌ No completada');
    } catch (parseError) {
      console.error('Error al parsear la evaluación:', parseError);
    }
  }
  
  return { response, evaluationResult };
}

/**
 * Genera un mensaje dedicado de evaluación
 * @param userId ID del usuario
 * @param activityId ID de la actividad
 * @returns Mensaje de evaluación
 */
export async function generateEvaluationMessage(
  _userId: string, 
  _activityId: string, 
  _interactionHistory: Array<{ role: string; content: string }>, 
  _activityContent: any
): Promise<string> {
  try {
    // Implementación futura: generar un mensaje dedicado de evaluación
    // basado en el historial de interacciones y el contenido de la actividad
    return 'Implementación pendiente';
  } catch (error) {
    console.error('Error al generar mensaje de evaluación:', error);
    return '';
  }
}
