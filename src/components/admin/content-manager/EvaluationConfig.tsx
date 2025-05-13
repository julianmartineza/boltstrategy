import React, { useState, useEffect } from 'react';
import { Loader2, Save, Plus, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface EvaluationConfigProps {
  activityId: string;
  activityTitle: string;
  onBack: () => void;
}

interface Deliverable {
  id?: string;
  code: string;
  description: string;
  detection_query: {
    regex?: string;
    keywords?: string[];
  };
  isNew?: boolean;
}

interface RubricItem {
  id?: string;
  criterion_id: string;
  success_criteria: string;
  weight: number;
  isNew?: boolean;
}

const EvaluationConfig: React.FC<EvaluationConfigProps> = ({
  activityId,
  activityTitle,
  onBack
}) => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [rubricItems, setRubricItems] = useState<RubricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deliverables' | 'rubric'>('deliverables');

  useEffect(() => {
    const fetchEvaluationConfig = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Cargar entregables
        const { data: deliverablesData, error: deliverablesError } = await supabase
          .from('activity_deliverables')
          .select('*')
          .eq('activity_id', activityId);
        
        if (deliverablesError) throw deliverablesError;
        
        // Cargar rúbrica
        const { data: rubricData, error: rubricError } = await supabase
          .from('evaluation_rubrics')
          .select('*')
          .eq('activity_id', activityId);
        
        if (rubricError) throw rubricError;
        
        setDeliverables(deliverablesData || []);
        setRubricItems(rubricData || []);
      } catch (err) {
        console.error('Error al cargar configuración de evaluación:', err);
        setError('Error al cargar la configuración de evaluación. Por favor, intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluationConfig();
  }, [activityId]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      // Validar que no haya IDs de criterios duplicados
      const criterionIds = rubricItems.map(item => item.criterion_id);
      const duplicateCriterionIds = criterionIds.filter(
        (id, index) => criterionIds.indexOf(id) !== index
      );
      
      if (duplicateCriterionIds.length > 0) {
        throw new Error(`IDs de criterio duplicados: ${duplicateCriterionIds.join(', ')}. Cada criterio debe tener un ID único.`);
      }
      
      // Validar que no haya códigos de entregables duplicados
      const deliverableCodes = deliverables.map(item => item.code);
      const duplicateDeliverableCodes = deliverableCodes.filter(
        (code, index) => deliverableCodes.indexOf(code) !== index
      );
      
      if (duplicateDeliverableCodes.length > 0) {
        throw new Error(`Códigos de entregable duplicados: ${duplicateDeliverableCodes.join(', ')}. Cada entregable debe tener un código único.`);
      }
      
      // Procesar entregables
      const newDeliverables = deliverables.filter(d => d.isNew);
      const existingDeliverables = deliverables.filter(d => !d.isNew);
      
      // Insertar nuevos entregables
      if (newDeliverables.length > 0) {
        const { error: insertError } = await supabase
          .from('activity_deliverables')
          .insert(
            newDeliverables.map(d => ({
              activity_id: activityId,
              code: d.code,
              description: d.description,
              detection_query: d.detection_query
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      // Actualizar entregables existentes
      for (const deliverable of existingDeliverables) {
        const { error: updateError } = await supabase
          .from('activity_deliverables')
          .update({
            code: deliverable.code,
            description: deliverable.description,
            detection_query: deliverable.detection_query
          })
          .eq('id', deliverable.id);
        
        if (updateError) throw updateError;
      }
      
      // Procesar rúbrica
      const newRubricItems = rubricItems.filter(r => r.isNew);
      const existingRubricItems = rubricItems.filter(r => !r.isNew);
      
      // Insertar nuevos elementos de rúbrica
      if (newRubricItems.length > 0) {
        const { error: insertError } = await supabase
          .from('evaluation_rubrics')
          .insert(
            newRubricItems.map(r => ({
              activity_id: activityId,
              criterion_id: r.criterion_id,
              success_criteria: r.success_criteria,
              weight: r.weight
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      // Actualizar elementos de rúbrica existentes
      for (const rubricItem of existingRubricItems) {
        const { error: updateError } = await supabase
          .from('evaluation_rubrics')
          .update({
            criterion_id: rubricItem.criterion_id,
            success_criteria: rubricItem.success_criteria,
            weight: rubricItem.weight
          })
          .eq('id', rubricItem.id);
        
        if (updateError) throw updateError;
      }
      
      // Actualizar estado local
      setDeliverables(deliverables.map(d => ({ ...d, isNew: false })));
      setRubricItems(rubricItems.map(r => ({ ...r, isNew: false })));
      
      setSuccessMessage('Configuración de evaluación guardada correctamente');
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error al guardar configuración de evaluación:', err);
      
      // Manejar errores específicos de la base de datos
      if (err.code === '23505') {
        // Error de duplicación de clave única
        if (err.message.includes('evaluation_rubrics_activity_id_criterion_id_key')) {
          setError('Error: Ya existe un criterio con el mismo ID para esta actividad. Cada criterio debe tener un ID único.');
        } else if (err.message.includes('activity_deliverables_activity_id_code_key')) {
          setError('Error: Ya existe un entregable con el mismo código para esta actividad. Cada entregable debe tener un código único.');
        } else {
          setError(`Error de duplicación: ${err.message}. Por favor, verifica que no haya valores duplicados.`);
        }
      } else if (err.message) {
        // Error con mensaje personalizado (como nuestras validaciones)
        setError(err.message);
      } else {
        // Error genérico
        setError('Error al guardar la configuración de evaluación. Por favor, intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const addDeliverable = () => {
    const newDeliverable: Deliverable = {
      code: '',
      description: '',
      detection_query: { regex: '' }, // Por defecto usamos regex, pero el usuario puede cambiar a keywords
      isNew: true
    };
    
    setDeliverables([...deliverables, newDeliverable]);
  };

  const updateDeliverable = (index: number, field: keyof Deliverable, value: any) => {
    const updatedDeliverables = [...deliverables];
    
    if (field === 'detection_query') {
      updatedDeliverables[index].detection_query = value;
    } else {
      // @ts-ignore - Necesario para actualizar campos dinámicamente
      updatedDeliverables[index][field] = value;
    }
    
    setDeliverables(updatedDeliverables);
  };

  const removeDeliverable = async (index: number) => {
    const deliverable = deliverables[index];
    
    // Si el entregable ya existe en la base de datos, eliminarlo
    if (deliverable.id) {
      try {
        const { error } = await supabase
          .from('activity_deliverables')
          .delete()
          .eq('id', deliverable.id);
        
        if (error) throw error;
      } catch (err) {
        console.error('Error al eliminar entregable:', err);
        setError('Error al eliminar el entregable. Por favor, intenta de nuevo.');
        return;
      }
    }
    
    // Eliminar del estado local
    const updatedDeliverables = deliverables.filter((_, i) => i !== index);
    setDeliverables(updatedDeliverables);
  };

  const addRubricItem = () => {
    const newRubricItem: RubricItem = {
      criterion_id: '',
      success_criteria: '',
      weight: 0.25,
      isNew: true
    };
    
    setRubricItems([...rubricItems, newRubricItem]);
  };

  const updateRubricItem = (index: number, field: keyof RubricItem, value: any) => {
    const updatedRubricItems = [...rubricItems];
    
    // @ts-ignore - Necesario para actualizar campos dinámicamente
    updatedRubricItems[index][field] = value;
    
    setRubricItems(updatedRubricItems);
  };

  const removeRubricItem = async (index: number) => {
    const rubricItem = rubricItems[index];
    
    // Si el elemento de rúbrica ya existe en la base de datos, eliminarlo
    if (rubricItem.id) {
      try {
        const { error } = await supabase
          .from('evaluation_rubrics')
          .delete()
          .eq('id', rubricItem.id);
        
        if (error) throw error;
      } catch (err) {
        console.error('Error al eliminar elemento de rúbrica:', err);
        setError('Error al eliminar el elemento de rúbrica. Por favor, intenta de nuevo.');
        return;
      }
    }
    
    // Eliminar del estado local
    const updatedRubricItems = rubricItems.filter((_, i) => i !== index);
    setRubricItems(updatedRubricItems);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Cargando configuración de evaluación...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-md shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver al listado
          </button>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Configuración de Evaluación: {activityTitle}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Define los entregables esperados y los criterios de evaluación para esta actividad.
          </p>
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h4 className="text-sm font-medium text-yellow-800">Sistema de Evaluación Avanzado</h4>
            <p className="text-xs text-yellow-700 mt-1">
              Este sistema permite evaluar actividades utilizando dos métodos complementarios:
            </p>
            <ul className="list-disc list-inside text-xs text-yellow-700 mt-1 space-y-1">
              <li><strong>Entregables:</strong> Detecta elementos específicos en las respuestas del usuario (pestaña "Entregables")</li>
              <li><strong>Rúbrica:</strong> Evalúa la calidad de las respuestas según criterios definidos (pestaña "Rúbrica de Evaluación")</li>
            </ul>
            <p className="text-xs text-yellow-700 mt-1">
              <strong>Recomendación:</strong> Para una evaluación completa, configura tanto entregables como rúbrica. Si solo configuras uno de ellos, el sistema utilizará únicamente ese método para la evaluación.
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar configuración
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 m-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className="h-5 w-5 text-green-400">✓</div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          <button
            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'deliverables'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('deliverables')}
          >
            Entregables
          </button>
          <button
            className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
              activeTab === 'rubric'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('rubric')}
          >
            Rúbrica de Evaluación
          </button>
        </nav>
      </div>
      
      <div className="p-4">
        {activeTab === 'deliverables' ? (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Entregables Esperados</h4>
              <button
                onClick={addDeliverable}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Añadir entregable
              </button>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
              <h5 className="text-sm font-medium text-blue-800 mb-2">¿Cómo configurar los entregables?</h5>
              <p className="text-sm text-blue-700 mb-2">
                Los entregables son elementos que el sistema detectará automáticamente en las respuestas de los usuarios para evaluar el cumplimiento de la actividad.
              </p>
              <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 ml-2">
                <li><strong>Código:</strong> Identificador único para el entregable (ej: OBJETIVO_SMART, ANALISIS_FODA)</li>
                <li><strong>Descripción:</strong> Explicación clara de lo que se espera que el usuario entregue</li>
                <li><strong>Detección:</strong> Configura cómo el sistema identificará este entregable en las respuestas</li>
                <li className="ml-4">- <strong>Expresión regular:</strong> Patrón avanzado para detectar estructuras específicas (ej: "objetivo.*medible.*alcanzable")</li>
                <li className="ml-4">- <strong>Palabras clave:</strong> Lista de términos que deben estar presentes (ej: "objetivo", "medible", "alcanzable")</li>
              </ul>
              <div className="mt-2 p-2 bg-blue-100 rounded-md">
                <p className="text-xs text-blue-800"><strong>Nota importante:</strong> Los entregables son opcionales si defines una rúbrica de evaluación. Sin embargo, configurar ambos proporciona una evaluación más completa y precisa.</p>
              </div>
            </div>
            
            {deliverables.length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-md text-center">
                <p className="text-gray-500 text-sm">No hay entregables configurados. Añade uno para comenzar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {deliverables.map((deliverable, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="text-sm font-medium text-gray-900">Entregable #{index + 1}</h5>
                      <button
                        onClick={() => removeDeliverable(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Código
                        </label>
                        <input
                          type="text"
                          value={deliverable.code}
                          onChange={(e) => updateDeliverable(index, 'code', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ej: OBJETIVO_SMART"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Identificador único para este entregable
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={deliverable.description}
                          onChange={(e) => updateDeliverable(index, 'description', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ej: Objetivo SMART bien definido"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Descripción visible para el usuario
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="border-b border-gray-200 mb-4">
                        <nav className="-mb-px flex">
                          <button
                            className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-xs ${
                              deliverable.detection_query.regex !== undefined
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              // Cambiamos al modo de expresión regular
                              updateDeliverable(index, 'detection_query', { 
                                regex: deliverable.detection_query.regex || '',
                                // Incluimos keywords como undefined para que se elimine del objeto
                                keywords: undefined 
                              });
                              console.log('Cambiando a modo regex', { regex: deliverable.detection_query.regex || '' });
                            }}
                          >
                            Expresión Regular
                          </button>
                          <button
                            className={`w-1/2 py-2 px-1 text-center border-b-2 font-medium text-xs ${
                              deliverable.detection_query.keywords !== undefined
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              // Cambiamos al modo de palabras clave
                              updateDeliverable(index, 'detection_query', { 
                                keywords: deliverable.detection_query.keywords || [],
                                // Incluimos regex como undefined para que se elimine del objeto
                                regex: undefined 
                              });
                              console.log('Cambiando a modo keywords', { keywords: deliverable.detection_query.keywords || [] });
                            }}
                          >
                            Palabras Clave
                          </button>
                        </nav>
                      </div>
                      
                      {deliverable.detection_query.regex !== undefined ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Expresión Regular para Detección
                          </label>
                          <input
                            type="text"
                            value={deliverable.detection_query.regex || ''}
                            onChange={(e) => {
                              // Aseguramos que se mantenga solo el campo regex y se elimine keywords
                              updateDeliverable(index, 'detection_query', { 
                                regex: e.target.value,
                                keywords: undefined
                              });
                              console.log('Actualizando expresión regular:', e.target.value);
                            }}
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: objetivo\\s+smart|meta\\s+específica"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Patrón para detectar este entregable en la conversación (usa \\ para escapar caracteres especiales)
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            <strong>Ejemplo:</strong> <code>objetivo[s]?\s*smart</code> detectará frases como "objetivo smart" u "objetivos smart"
                          </p>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Palabras Clave para Detección
                          </label>
                          <input
                            type="text"
                            value={(deliverable.detection_query.keywords || []).join(', ')}
                            onChange={(e) => {
                              const keywords = e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0);
                              // Aseguramos que se mantenga solo el campo keywords y se elimine regex
                              updateDeliverable(index, 'detection_query', { 
                                keywords,
                                regex: undefined
                              });
                              console.log('Actualizando palabras clave:', keywords);
                            }}
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Ej: objetivo smart, meta específica, SMART"
                            required
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Lista de palabras o frases separadas por comas que deben estar presentes en la respuesta
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            <strong>Ejemplo:</strong> <code>objetivo smart, meta específica</code> detectará respuestas que contengan cualquiera de estas frases
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-4 flex justify-between items-center">
              <h4 className="text-md font-medium text-gray-900">Criterios de Evaluación</h4>
              <button
                onClick={addRubricItem}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="h-4 w-4 mr-1" />
                Añadir criterio
              </button>
            </div>
            
            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <h5 className="text-sm font-medium text-green-800 mb-2">¿Cómo configurar la rúbrica de evaluación?</h5>
              <p className="text-sm text-green-700 mb-2">
                La rúbrica define los criterios que se utilizarán para evaluar la calidad de las respuestas de los usuarios, permitiendo una evaluación objetiva y consistente.
              </p>
              <ul className="list-disc list-inside text-sm text-green-700 space-y-1 ml-2">
                <li><strong>ID del Criterio:</strong> Identificador único para cada criterio (ej: CLARIDAD, ESTRUCTURA, ORIGINALIDAD)</li>
                <li><strong>Peso:</strong> Importancia relativa de este criterio en la evaluación final (valores entre 0.05 y 1)</li>
                <li><strong>Criterio de Éxito:</strong> Descripción detallada de lo que constituye un cumplimiento satisfactorio</li>
              </ul>
              <p className="text-sm text-green-700 mt-2">
                <strong>Recomendaciones:</strong>
              </p>
              <ul className="list-disc list-inside text-sm text-green-700 space-y-1 ml-2">
                <li>La suma de todos los pesos debe ser igual a 1 (100%)</li>
                <li>Utiliza criterios claros y medibles para facilitar la evaluación</li>
                <li>Incluye criterios tanto para aspectos técnicos como para habilidades blandas cuando sea relevante</li>
              </ul>
              <div className="mt-2 p-2 bg-green-100 rounded-md">
                <p className="text-xs text-green-800"><strong>Nota importante:</strong> La rúbrica es opcional si defines entregables. Sin embargo, la rúbrica permite una evaluación más cualitativa y detallada de las respuestas del usuario.</p>
                <p className="text-xs text-green-800 mt-1"><strong>Funcionamiento:</strong> El sistema utiliza IA para evaluar cada criterio en una escala de 0 a 1, y calcula una puntuación ponderada según los pesos asignados. Una puntuación total de 0.8 (80%) o superior se considera satisfactoria.</p>
                <p className="text-xs text-green-800 mt-1"><strong>Ejemplo de criterio:</strong> "El usuario ha identificado correctamente al menos 3 oportunidades de mejora específicas y relevantes para su negocio"</p>
              </div>
            </div>
            
            {rubricItems.length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-md text-center">
                <p className="text-gray-500 text-sm">No hay criterios de evaluación configurados. Añade uno para comenzar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rubricItems.map((rubricItem, index) => (
                  <div key={index} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="text-sm font-medium text-gray-900">Criterio #{index + 1}</h5>
                      <button
                        onClick={() => removeRubricItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          ID del Criterio
                        </label>
                        <input
                          type="text"
                          value={rubricItem.criterion_id}
                          onChange={(e) => updateRubricItem(index, 'criterion_id', e.target.value)}
                          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ej: CLARIDAD"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Identificador único para este criterio
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Peso
                        </label>
                        <input
                          type="number"
                          value={rubricItem.weight}
                          onChange={(e) => updateRubricItem(index, 'weight', parseFloat(e.target.value))}
                          step="0.05"
                          min="0.05"
                          max="1"
                          className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Valor entre 0.05 y 1 (la suma de todos los pesos debería ser 1)
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Criterio de Éxito
                      </label>
                      <textarea
                        value={rubricItem.success_criteria}
                        onChange={(e) => updateRubricItem(index, 'success_criteria', e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Ej: El objetivo está claramente definido y sigue el formato SMART"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Descripción detallada de qué se considera un cumplimiento exitoso de este criterio
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {rubricItems.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <h5 className="text-sm font-medium text-blue-800 mb-2">Suma de pesos: {rubricItems.reduce((sum, item) => sum + item.weight, 0).toFixed(2)}</h5>
                <p className="text-xs text-blue-600">
                  La suma de los pesos de todos los criterios debería ser aproximadamente 1.00 para una evaluación equilibrada.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EvaluationConfig;
