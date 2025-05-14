import React, { useState, useEffect } from 'react';
import { Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { getContextConfiguration, saveContextConfiguration, ContextConfig } from '../../services/contextConfigService';

interface EvaluationContextConfigProps {
  activityId: string;
}

export default function EvaluationContextConfig({ activityId }: EvaluationContextConfigProps) {
  const [evaluationContext, setEvaluationContext] = useState<ContextConfig>({
    includeCompanyInfo: false,
    includeDiagnostic: false,
    includeDependencies: false,
    includeProgramContext: false,
    includeSystemInstructions: false,
    includeMemorySummaries: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadConfig() {
      try {
        setLoading(true);
        const config = await getContextConfiguration(activityId);
        if (config.evaluation_context) {
          setEvaluationContext(config.evaluation_context);
        }
        setError(null);
      } catch (err) {
        console.error('Error al cargar configuración de evaluación:', err);
        setError('Error al cargar la configuración. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    }
    
    if (activityId) {
      loadConfig();
    }
  }, [activityId]);
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEvaluationContext({
      ...evaluationContext,
      [event.target.name]: event.target.checked
    });
    // Resetear mensajes de éxito cuando se hacen cambios
    setSaveSuccess(false);
  };
  
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      
      await saveContextConfiguration({
        activity_id: activityId,
        evaluation_context: evaluationContext
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Ocultar mensaje después de 3 segundos
    } catch (err) {
      console.error('Error al guardar configuración de evaluación:', err);
      setError('Error al guardar la configuración. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };
  
  if (!activityId) {
    return <p className="text-gray-700">Se requiere un ID de actividad válido</p>;
  }
  
  return (
    <div className="border border-gray-200 rounded-md mt-4">
      <div className="p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Configuración de contexto para evaluación
        </h3>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        {saveSuccess && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-sm text-green-700">Configuración guardada con éxito</p>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin mr-2" />
            <p className="text-gray-700">Cargando configuración...</p>
          </div>
        ) : (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Selecciona qué elementos del contexto deben incluirse durante la evaluación de esta actividad.
              </p>
            </div>
            
            <div className="space-y-4">
              {/* Estilos para los toggles aplicados directamente en las clases */}
              
              {/* Información de la empresa */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="eval-includeCompanyInfo" className="text-sm font-medium text-gray-700">
                    Información de empresa
                  </label>
                  <p className="text-xs text-gray-500">Datos sobre la empresa del usuario (perfil, sector, tamaño)</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="eval-includeCompanyInfo"
                    name="includeCompanyInfo"
                    checked={evaluationContext.includeCompanyInfo || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: evaluationContext.includeCompanyInfo ? '0' : '6px',
                      borderColor: evaluationContext.includeCompanyInfo ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="eval-includeCompanyInfo" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      evaluationContext.includeCompanyInfo ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              {/* Diagnóstico */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="eval-includeDiagnostic" className="text-sm font-medium text-gray-700">
                    Diagnóstico
                  </label>
                  <p className="text-xs text-gray-500">Resultados del diagnóstico previo de la empresa</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="eval-includeDiagnostic"
                    name="includeDiagnostic"
                    checked={evaluationContext.includeDiagnostic || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: evaluationContext.includeDiagnostic ? '0' : '6px',
                      borderColor: evaluationContext.includeDiagnostic ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="eval-includeDiagnostic" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      evaluationContext.includeDiagnostic ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              {/* Dependencias */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="eval-includeDependencies" className="text-sm font-medium text-gray-700">
                    Dependencias
                  </label>
                  <p className="text-xs text-gray-500">Información de actividades relacionadas o previas</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="eval-includeDependencies"
                    name="includeDependencies"
                    checked={evaluationContext.includeDependencies || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: evaluationContext.includeDependencies ? '0' : '6px',
                      borderColor: evaluationContext.includeDependencies ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="eval-includeDependencies" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      evaluationContext.includeDependencies ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              {/* Contexto del programa */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="eval-includeProgramContext" className="text-sm font-medium text-gray-700">
                    Contexto del programa
                  </label>
                  <p className="text-xs text-gray-500">Información general del programa y sus objetivos</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="eval-includeProgramContext"
                    name="includeProgramContext"
                    checked={evaluationContext.includeProgramContext || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: evaluationContext.includeProgramContext ? '0' : '6px',
                      borderColor: evaluationContext.includeProgramContext ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="eval-includeProgramContext" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      evaluationContext.includeProgramContext ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              {/* Instrucciones del sistema */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="eval-includeSystemInstructions" className="text-sm font-medium text-gray-700">
                    Instrucciones del sistema
                  </label>
                  <p className="text-xs text-gray-500">Instrucciones específicas para el modelo de IA</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="eval-includeSystemInstructions"
                    name="includeSystemInstructions"
                    checked={evaluationContext.includeSystemInstructions || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: evaluationContext.includeSystemInstructions ? '0' : '6px',
                      borderColor: evaluationContext.includeSystemInstructions ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="eval-includeSystemInstructions" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      evaluationContext.includeSystemInstructions ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              {/* Resúmenes de memoria */}
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="eval-includeMemorySummaries" className="text-sm font-medium text-gray-700">
                    Resúmenes de memoria
                  </label>
                  <p className="text-xs text-gray-500">Resúmenes de conversaciones anteriores</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="eval-includeMemorySummaries"
                    name="includeMemorySummaries"
                    checked={evaluationContext.includeMemorySummaries || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: evaluationContext.includeMemorySummaries ? '0' : '6px',
                      borderColor: evaluationContext.includeMemorySummaries ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="eval-includeMemorySummaries" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      evaluationContext.includeMemorySummaries ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${saving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar configuración de evaluación
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
