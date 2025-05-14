import React, { useState, useEffect } from 'react';
import { getContextConfiguration, saveContextConfiguration, ContextConfig } from '../../services/contextConfigService';
import { Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface ActivityContextConfigProps {
  activityId: string;
}

export default function ActivityContextConfig({ activityId }: ActivityContextConfigProps) {
  const [activityContext, setActivityContext] = useState<ContextConfig>({
    includeCompanyInfo: true,
    includeDiagnostic: true,
    includeDependencies: true,
    includeProgramContext: true,
    includeSystemInstructions: true,
    includeMemorySummaries: true
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
        if (config.activity_context) {
          setActivityContext(config.activity_context);
        }
        setError(null);
      } catch (err) {
        console.error('Error al cargar configuración:', err);
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
    setActivityContext({
      ...activityContext,
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
        activity_context: activityContext
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000); // Ocultar mensaje después de 3 segundos
    } catch (err) {
      console.error('Error al guardar configuración:', err);
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
          Configuración de contexto para la actividad
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
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="includeCompanyInfo" className="text-sm font-medium text-gray-700">
                    Información de la empresa
                  </label>
                  <p className="text-xs text-gray-500">Datos básicos de la empresa del usuario</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="includeCompanyInfo"
                    name="includeCompanyInfo"
                    checked={activityContext.includeCompanyInfo || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: activityContext.includeCompanyInfo ? '0' : '6px',
                      borderColor: activityContext.includeCompanyInfo ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="includeCompanyInfo" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      activityContext.includeCompanyInfo ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="includeDiagnostic" className="text-sm font-medium text-gray-700">
                    Diagnóstico
                  </label>
                  <p className="text-xs text-gray-500">Información del diagnóstico de la empresa</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="includeDiagnostic"
                    name="includeDiagnostic"
                    checked={activityContext.includeDiagnostic || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: activityContext.includeDiagnostic ? '0' : '6px',
                      borderColor: activityContext.includeDiagnostic ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="includeDiagnostic" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      activityContext.includeDiagnostic ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="includeDependencies" className="text-sm font-medium text-gray-700">
                    Dependencias
                  </label>
                  <p className="text-xs text-gray-500">Actividades previas relacionadas</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="includeDependencies"
                    name="includeDependencies"
                    checked={activityContext.includeDependencies || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: activityContext.includeDependencies ? '0' : '6px',
                      borderColor: activityContext.includeDependencies ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="includeDependencies" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      activityContext.includeDependencies ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="includeProgramContext" className="text-sm font-medium text-gray-700">
                    Contexto del programa
                  </label>
                  <p className="text-xs text-gray-500">Información general del programa y sus objetivos</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="includeProgramContext"
                    name="includeProgramContext"
                    checked={activityContext.includeProgramContext || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: activityContext.includeProgramContext ? '0' : '6px',
                      borderColor: activityContext.includeProgramContext ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="includeProgramContext" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      activityContext.includeProgramContext ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="includeSystemInstructions" className="text-sm font-medium text-gray-700">
                    Instrucciones del sistema
                  </label>
                  <p className="text-xs text-gray-500">Instrucciones específicas para el modelo de IA</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="includeSystemInstructions"
                    name="includeSystemInstructions"
                    checked={activityContext.includeSystemInstructions || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: activityContext.includeSystemInstructions ? '0' : '6px',
                      borderColor: activityContext.includeSystemInstructions ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="includeSystemInstructions" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      activityContext.includeSystemInstructions ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  ></label>
                </div>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b border-gray-200">
                <div>
                  <label htmlFor="includeMemorySummaries" className="text-sm font-medium text-gray-700">
                    Resúmenes de memoria
                  </label>
                  <p className="text-xs text-gray-500">Resúmenes de conversaciones anteriores</p>
                </div>
                <div className="relative inline-block w-12 mr-2 align-middle select-none">
                  <input 
                    type="checkbox" 
                    id="includeMemorySummaries"
                    name="includeMemorySummaries"
                    checked={activityContext.includeMemorySummaries || false}
                    onChange={handleChange}
                    className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-200 ease-in-out right-0 transform translate-x-0 checked:translate-x-full checked:border-blue-500"
                    style={{
                      right: activityContext.includeMemorySummaries ? '0' : '6px',
                      borderColor: activityContext.includeMemorySummaries ? '#3b82f6' : '#d1d5db'
                    }}
                  />
                  <label 
                    htmlFor="includeMemorySummaries" 
                    className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in-out ${
                      activityContext.includeMemorySummaries ? 'bg-blue-500' : 'bg-gray-300'
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
                    Guardar configuración
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
