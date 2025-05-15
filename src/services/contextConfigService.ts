import { supabase } from '../lib/supabase';

// Interfaces para los tipos de configuración
export interface ContextConfig {
  includeCompanyInfo?: boolean;
  includeDiagnostic?: boolean;
  includeDependencies?: boolean;
  includeProgramContext?: boolean;
  includeSystemInstructions?: boolean;
  includeMemorySummaries?: boolean;
}

// Interfaz para la tabla activity_context_config
// Nota: Aunque la tabla tiene campos activity_context y evaluation_context,
// en nuestra implementación optimizada los trataremos solo como referencias
export interface ContextConfigurations {
  id?: string;
  activity_id: string;
  activity_context?: ContextConfig;
  evaluation_context?: ContextConfig;
}

// Interfaz para la tabla activity_contents
export interface ActivityContent {
  id: string;
  title?: string;
  activity_data?: any;
  stage_name?: string;
  updated_at?: string;
}

// Valores por defecto
const DEFAULT_ACTIVITY_CONTEXT: ContextConfig = {
  includeCompanyInfo: true,
  includeDiagnostic: true,
  includeDependencies: true,
  includeProgramContext: true,
  includeSystemInstructions: true,
  includeMemorySummaries: true
};

const DEFAULT_EVALUATION_CONTEXT: ContextConfig = {
  includeCompanyInfo: false,
  includeDiagnostic: false,
  includeDependencies: false,
  includeProgramContext: false,
  includeSystemInstructions: false,
  includeMemorySummaries: false
};

// Importamos la función resolveActivityId de evaluationService
import { resolveActivityId } from './evaluationService';

/**
 * Obtiene la configuración de contexto para una actividad directamente desde activity_contents
 * @param activityId ID de la actividad
 * @returns Configuración de contexto para la actividad
 */
export async function getContextConfiguration(activityId: string): Promise<ContextConfigurations> {
  try {
    // Resolvemos el ID real de la actividad usando la función centralizada
    const realActivityId = await resolveActivityId(activityId);
    console.log(`✅ ID resuelto para configuración de contexto: ${activityId} -> ${realActivityId}`);
    
    // Obtenemos la actividad de la tabla activity_contents
    const { data: activityData, error: activityError } = await supabase
      .from('activity_contents')
      .select('activity_data')
      .eq('id', realActivityId)
      .single();
    
    if (activityError || !activityData) {
      console.log('No se encontró la actividad, usando valores por defecto');
      return {
        activity_id: realActivityId, // Usamos el ID real
        activity_context: DEFAULT_ACTIVITY_CONTEXT,
        evaluation_context: DEFAULT_EVALUATION_CONTEXT
      };
    }
    
    // Verificamos si existe una referencia en activity_context_config y si está habilitada
    const { data: configRef, error: configError } = await supabase
      .from('activity_context_config')
      .select('id, enabled, config_path, activity_context, evaluation_context')
      .eq('activity_id', realActivityId) // Usamos el ID real
      .single();
    
    // Si no hay referencia o la configuración está deshabilitada, usamos valores por defecto
    if (configError || !configRef || !configRef.enabled) {
      return {
        activity_id: realActivityId, // Usamos el ID real
        activity_context: DEFAULT_ACTIVITY_CONTEXT,
        evaluation_context: DEFAULT_EVALUATION_CONTEXT
      };
    }
    
    // Verificamos si hay datos de configuración en activity_context_config
    // Si existen, los usamos; de lo contrario, intentamos obtenerlos de activity_data
    if (configRef.activity_context && Object.keys(configRef.activity_context).length > 0) {
      console.log('Usando configuración de contexto de activity_context_config');
      
      // Combinamos con los valores por defecto para asegurarnos de que todos los campos estén presentes
      const activityContext = {
        ...DEFAULT_ACTIVITY_CONTEXT,
        ...configRef.activity_context
      };
      
      const evaluationContext = {
        ...DEFAULT_EVALUATION_CONTEXT,
        ...configRef.evaluation_context
      };
      
      // Log más seguro sin mostrar datos completos
      console.log('Configuración de contexto obtenida de activity_context_config');
      
      return {
        id: configRef.id,
        activity_id: realActivityId, // Usamos el ID real
        activity_context: activityContext,
        evaluation_context: evaluationContext
      };
    } else {
      // Si no hay datos en activity_context_config, intentamos obtenerlos de activity_data
      console.log('No hay datos en activity_context_config, buscando en activity_data...');
      
      // Verificamos si activity_data es un objeto válido
      let currentActivityData = activityData.activity_data;
      
      // Si activity_data no es un objeto válido o está en un formato extraño, lo inicializamos
      if (!currentActivityData || typeof currentActivityData !== 'object' || Array.isArray(currentActivityData) || Object.keys(currentActivityData).some(key => !isNaN(Number(key)))) {
        console.log('El campo activity_data no tiene un formato válido, usando valores por defecto');
        currentActivityData = {};
      }
      
      // Obtenemos la configuración de contexto del campo activity_data
      // Si no existe, usamos valores por defecto
      const contextConfig = currentActivityData.context_config || {};
      
      const activityContext = {
        ...DEFAULT_ACTIVITY_CONTEXT,
        ...contextConfig
      };
      
      // Log más seguro sin mostrar datos completos
      console.log('Configuración de contexto obtenida de activity_data');
      
      return {
        id: configRef.id, // Usamos el ID de la referencia
        activity_id: realActivityId, // Usamos el ID real
        activity_context: activityContext,
        evaluation_context: DEFAULT_EVALUATION_CONTEXT
      };
    }
  } catch (error) {
    console.error('Error al obtener configuración de contexto:', error);
    return {
      activity_id: activityId, // Usamos el ID original en caso de error
      activity_context: DEFAULT_ACTIVITY_CONTEXT,
      evaluation_context: DEFAULT_EVALUATION_CONTEXT
    };
  }
}

/**
 * Guarda o actualiza la configuración de contexto para una actividad
 * @param config Configuración a guardar
 * @returns void
 */
/**
 * Deshabilita la configuración de contexto para una actividad
 * @param activityId ID de la actividad
 * @returns void
 */
export async function disableContextConfiguration(activityId: string): Promise<void> {
  try {
    // Verificamos si existe una referencia
    const { data: existing, error: fetchError } = await supabase
      .from('activity_context_config')
      .select('id')
      .eq('activity_id', activityId)
      .single();
    
    if (fetchError || !existing) {
      console.log('No existe configuración para deshabilitar');
      return;
    }
    
    // Deshabilitamos la configuración
    const { error } = await supabase
      .from('activity_context_config')
      .update({
        enabled: false,
        updated_at: new Date()
      })
      .eq('id', existing.id);
    
    if (error) {
      console.error('Error al deshabilitar configuración de contexto:', error);
      throw error;
    }
    
    console.log('Configuración de contexto deshabilitada con éxito');
  } catch (error) {
    console.error('Error al deshabilitar configuración de contexto:', error);
    throw error;
  }
}

/**
 * Guarda o actualiza la configuración de contexto para una actividad
 * @param config Configuración a guardar
 * @returns void
 */
export async function saveContextConfiguration(config: ContextConfigurations): Promise<void> {
  try {
    // Primero, resolvemos el ID real de la actividad
    let realActivityId = config.activity_id;
    
    // Verificar si es un ID de registro en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('content_id')
      .eq('id', config.activity_id)
      .single();
    
    if (registryData && !registryError) {
      console.log(`✅ ID encontrado en content_registry, usando content_id: ${registryData.content_id}`);
      realActivityId = registryData.content_id;
    }
    
    console.log('Guardando configuración de contexto para actividad:', realActivityId);
    
    // Verificamos qué tipo de contexto estamos actualizando
    const isActivityContext = config.activity_context && Object.keys(config.activity_context).length > 0;
    const isEvaluationContext = config.evaluation_context && Object.keys(config.evaluation_context).length > 0;
    
    console.log(`Actualizando: ${isActivityContext ? 'Contexto de actividad' : ''} ${isEvaluationContext ? 'Contexto de evaluación' : ''}`);
    
    // 1. Si estamos actualizando el contexto de actividad, lo guardamos en activity_data
    if (isActivityContext) {
      // Obtenemos los datos actuales de la actividad
      const { data: activityData, error: fetchError } = await supabase
        .from('activity_contents')
        .select('activity_data')
        .eq('id', realActivityId)
        .single();
      
      if (fetchError) {
        console.error('Error al obtener datos de la actividad:', fetchError);
        throw fetchError;
      }
      
      // Verificamos si activity_data es un objeto válido
      let currentActivityData = activityData.activity_data;
      
      // Si activity_data no es un objeto válido o está en un formato extraño, lo inicializamos
      if (!currentActivityData || typeof currentActivityData !== 'object' || Array.isArray(currentActivityData) || Object.keys(currentActivityData).some(key => !isNaN(Number(key)))) {
        console.log('El campo activity_data no tiene un formato válido, inicializando como objeto vacío');
        currentActivityData = {};
      }
      
      // Actualizamos el campo context_config dentro de activity_data
      const updatedActivityData = {
        ...currentActivityData,
        context_config: config.activity_context
      };
      
      // Log más seguro sin mostrar datos completos
      console.log('Actualizando campo context_config en activity_data');
      
      // Guardamos los cambios en la tabla activity_contents
      const { error: updateError } = await supabase
        .from('activity_contents')
        .update({
          activity_data: updatedActivityData,
          updated_at: new Date()
        })
        .eq('id', realActivityId);
      
      if (updateError) {
        console.error('Error al actualizar datos de la actividad:', updateError);
        throw updateError;
      }
    }
    
    // 2. Luego, actualizamos o creamos la referencia en activity_context_config
    // Verificamos si ya existe una referencia
    const { data: existingRef, error: existingError } = await supabase
      .from('activity_context_config')
      .select('id, activity_context, evaluation_context')
      .eq('activity_id', realActivityId)
      .single();
    
    if (existingError && existingError.code !== 'PGRST116') { // PGRST116 es el código para "no se encontraron resultados"
      console.error('Error al verificar referencia existente:', existingError);
      throw existingError;
    }
    
    if (existingRef) {
      // Preparamos los datos a actualizar, preservando los valores existentes
      const updateData: any = {
        enabled: true,
        updated_at: new Date()
      };
      
      // Solo actualizamos los campos que vienen en el objeto config
      // Mantenemos los valores existentes para los campos que no se actualizan
      if (isActivityContext) {
        updateData.activity_context = config.activity_context;
      } else if (existingRef.activity_context && Object.keys(existingRef.activity_context).length > 0) {
        // Preservamos el valor actual si existe y no viene en el objeto config
        updateData.activity_context = existingRef.activity_context;
      }
      
      if (isEvaluationContext) {
        updateData.evaluation_context = config.evaluation_context;
      } else if (existingRef.evaluation_context && Object.keys(existingRef.evaluation_context).length > 0) {
        // Preservamos el valor actual si existe y no viene en el objeto config
        updateData.evaluation_context = existingRef.evaluation_context;
      }
      
      console.log('Actualizando configuración en activity_context_config');
      
      // Actualizar referencia existente
      const { error } = await supabase
        .from('activity_context_config')
        .update(updateData)
        .eq('id', existingRef.id);
        
      if (error) {
        console.error('Error al actualizar referencia de contexto:', error);
        throw error;
      }
    } else {
      // Preparamos los datos para insertar
      const insertData: any = {
        activity_id: realActivityId,
        config_path: 'context_config',
        enabled: true
      };
      
      // Solo incluimos los campos que vienen en el objeto config
      if (isActivityContext) {
        insertData.activity_context = config.activity_context;
      }
      
      if (isEvaluationContext) {
        insertData.evaluation_context = config.evaluation_context;
      }
      
      console.log('Creando nueva configuración en activity_context_config');
      
      // Crear nueva referencia
      const { error } = await supabase
        .from('activity_context_config')
        .insert(insertData);
        
      if (error) {
        console.error('Error al crear referencia de contexto:', error);
        throw error;
      }
    }
    
    console.log('Configuración de contexto guardada con éxito');
  } catch (error) {
    console.error('Error al guardar configuración de contexto:', error);
    throw error;
  }
}
