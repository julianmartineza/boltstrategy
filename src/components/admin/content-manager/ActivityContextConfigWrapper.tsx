import React from 'react';
import { ArrowLeft } from 'lucide-react';
import ActivityContextConfig from '../../admin/ActivityContextConfig';

interface ActivityContextConfigWrapperProps {
  activityId: string;
  activityTitle: string;
  onBack: () => void;
}

const ActivityContextConfigWrapper: React.FC<ActivityContextConfigWrapperProps> = ({
  activityId,
  activityTitle,
  onBack
}) => {
  return (
    <div>
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h3 className="text-xl font-semibold text-gray-800">
          Configuración de Contexto: {activityTitle}
        </h3>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">Configuración de Contexto para la Actividad</h4>
          <p className="text-sm text-gray-600">
            Selecciona qué elementos del contexto deben incluirse durante la ejecución de esta actividad.
            Esto permite personalizar qué información estará disponible para el modelo de IA al generar respuestas.
          </p>
        </div>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <h5 className="text-sm font-medium text-blue-800 mb-2">¿Por qué es importante configurar el contexto?</h5>
          <p className="text-sm text-blue-700 mb-2">
            La configuración del contexto determina qué información tendrá disponible el modelo de IA al responder al usuario.
            Dependiendo del tipo de actividad, ciertos elementos del contexto pueden ser relevantes o no.
          </p>
          <ul className="list-disc list-inside text-sm text-blue-700 space-y-1 ml-2">
            <li><strong>Información de empresa:</strong> Datos sobre la empresa del usuario</li>
            <li><strong>Diagnóstico:</strong> Resultados del diagnóstico previo</li>
            <li><strong>Dependencias:</strong> Información de actividades relacionadas</li>
            <li><strong>Contexto del programa:</strong> Información general del programa</li>
            <li><strong>Instrucciones del sistema:</strong> Instrucciones específicas para el modelo</li>
            <li><strong>Resúmenes de memoria:</strong> Resúmenes de conversaciones anteriores</li>
          </ul>
        </div>
        
        <ActivityContextConfig activityId={activityId} />
      </div>
    </div>
  );
};

export default ActivityContextConfigWrapper;
