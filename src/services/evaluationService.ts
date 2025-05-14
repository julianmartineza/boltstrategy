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
  // Nombres de campos en formato snake_case para coincidir con la base de datos
  activity_id: string;
  user_id: string;
  rubric_scores: Record<string, number>;
  overall_score: number;
  feedback: string; // Cambiado de feedbackMessage a feedback para coincidir con la columna en la DB
  is_completed: boolean;
  conversation_hash: string;
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
      .eq('conversation_hash', evaluationLog.conversation_hash)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 es "no se encontraron registros"
      console.error('Error al verificar evaluación existente:', checkError);
    }
    
    if (existingEval) {
      console.log(`⚠️ Ya existe una evaluación con el hash ${evaluationLog.conversation_hash}. No se registrará duplicado.`);
      return;
    }
    
    // Insertar la evaluación en la base de datos
    const { error } = await supabase
      .from('evaluation_logs')
      .insert({
        activity_id: evaluationLog.activity_id,
        user_id: evaluationLog.user_id,
        rubric_scores: evaluationLog.rubric_scores,
        overall_score: evaluationLog.overall_score,
        feedback: evaluationLog.feedback,
        is_completed: evaluationLog.is_completed,
        conversation_hash: evaluationLog.conversation_hash,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error al registrar evaluación:', error);
      throw error;
    }

    console.log(`✅ Evaluación registrada para actividad ${evaluationLog.activity_id}`);

    // Si la actividad está completada, actualizar el estado
    if (evaluationLog.is_completed) {
      const { error: updateError } = await supabase
        .from('activity_completions')
        .upsert({
          activity_id: evaluationLog.activity_id,
          user_id: evaluationLog.user_id,
          is_completed: true,
          completed_at: new Date().toISOString(),
          evaluation_score: evaluationLog.overall_score
        });

      if (updateError) {
        console.error('Error al actualizar estado de completitud:', updateError);
      } else {
        console.log(`✅ Estado de completitud actualizado para actividad ${evaluationLog.activity_id}`);
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
    // Solo evaluar cada 3 interacciones (3, 6, 9, etc.)
    if (interactionCount % 3 !== 0) {
      return '';
    }
    
    // Asegurarse de que haya al menos 3 interacciones antes de evaluar
    if (interactionCount < 3) {
      console.log(`⚠️ No se realizará evaluación en la interacción ${interactionCount}. Se requieren al menos 3 interacciones.`);
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
    
    // Añadir instrucciones detalladas para la evaluación y el feedback
    instructions += `\n\n⚠️⚠️⚠️ INSTRUCCIÓN CRÍTICA - ABSOLUTAMENTE OBLIGATORIA ⚠️⚠️⚠️

DESPUÉS DE RESPONDER NORMALMENTE AL USUARIO, DEBES EVALUAR LA ACTIVIDAD Y PROPORCIONAR FEEDBACK DETALLADO SIGUIENDO ESTAS PAUTAS:

1. EVALUACIÓN: Determina si el usuario ha completado la actividad según los criterios y entregables especificados.

2. FEEDBACK DETALLADO: Proporciona un feedback constructivo y específico que:
   - Si la evaluación es POSITIVA: Destaca los aspectos bien logrados y sugiere áreas de mejora o próximos pasos.
   - Si la evaluación es NEGATIVA: Explica claramente qué falta por completar, ofrece sugerencias concretas para mejorar y anima al usuario a continuar.

3. FORMATO OBLIGATORIO: Añade tu evaluación en el siguiente formato exacto:

---EVALUACION---
{
  "isCompleted": true/false,
  "message": "Feedback detallado que explique por qué se considera completada o no la actividad, destacando fortalezas y áreas de mejora",
  "details": {
    "overallScore": 0.0-1.0,
    "rubric": {
      "criterio1": 0.0-1.0
    }
  }
}

ESTA SECCIÓN ES ABSOLUTAMENTE OBLIGATORIA. SI NO LA INCLUYES, EL SISTEMA FALLARÁ COMPLETAMENTE.
NO OMITAS ESTA SECCIÓN BAJO NINGUNA CIRCUNSTANCIA.`;

    // Añadir ejemplo claro con feedback detallado
    instructions += `\n\nEjemplo de respuesta correcta:
Tu respuesta normal al usuario...

---EVALUACION---
{
  "isCompleted": true,
  "message": "El usuario ha completado la actividad satisfactoriamente. Ha logrado identificar claramente el problema que su idea de negocio busca resolver, definiendo el dolor específico de los usuarios y el contexto en que ocurre. Los puntos fuertes de su planteamiento son la claridad y la relevancia del problema identificado. Como área de mejora, podría profundizar más en la validación empírica del problema con usuarios reales en la siguiente fase.",
  "details": {
    "overallScore": 0.85,
    "rubric": {
      "criterio1": 0.9,
      "criterio2": 0.8,
      "criterio3": 0.85
    }
  }
}`;

    // Reforzar la importancia con instrucciones concisas
    instructions += `\n\n⚠️ RECUERDA: SIEMPRE TERMINA TU RESPUESTA CON LA SECCIÓN ---EVALUACION--- SEGUIDA DEL JSON.
ESTA SECCIÓN ES PARA USO INTERNO Y NO DEBE SER VISIBLE PARA EL USUARIO.
EL USUARIO NO DEBE VER ESTA SECCIÓN, PERO EL SISTEMA LA NECESITA OBLIGATORIAMENTE.`;

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
    try {
      // Paso 1: Eliminar cualquier texto que pueda estar antes del primer '{'
      const jsonStartIndex = evaluationText.indexOf('{');
      if (jsonStartIndex >= 0) {
        evaluationText = evaluationText.substring(jsonStartIndex);
      }
      
      // Paso 2: Encontrar el último '}' y eliminar todo lo que venga después
      const jsonEndIndex = evaluationText.lastIndexOf('}');
      if (jsonEndIndex >= 0) {
        evaluationText = evaluationText.substring(0, jsonEndIndex + 1);
      }
      
      // Paso 3: Verificar que el JSON sea válido
      console.log(`🔍 JSON limpio para parsear: ${evaluationText.substring(0, 50)}...`);
      
      // Paso 4: Parsear el JSON
      evaluationResult = JSON.parse(evaluationText);
      console.log('🔍 Evaluación extraída de la respuesta:', evaluationResult.isCompleted ? '✅ Completada' : '❌ No completada');
    } catch (parseError) {
      console.error('Error al parsear la evaluación:', parseError);
      console.log('Texto de evaluación que causó el error:', evaluationText);
      
      // Intento de recuperación: crear un objeto de evaluación básico basado en el texto
      if (evaluationText.includes('"isCompleted": true') || evaluationText.includes('"isCompleted":true')) {
        console.log('⚠️ Intentando recuperación de evaluación fallida...');
        evaluationResult = {
          isCompleted: true,
          message: "Evaluación recuperada automáticamente",
          details: {
            overallScore: 0.8,
            rubric: {}
          }
        };
        console.log('✅ Evaluación recuperada con éxito');
      }
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
