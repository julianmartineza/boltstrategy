Plan de Modificación y Desarrollo (PMD)

🏗️ Objetivo

Reestructurar la gestión de prompts en el chat de la aplicación para que cada actividad tenga un flujo por pasos, asegurando escalabilidad y organización sin afectar demasiado la estructura actual de la base de datos.

📌 Alcance de la Modificación

Mantener la estructura actual de la base de datos lo más intacta posible.

Crear un sistema escalable de prompts organizados por pasos.

Garantizar que cada paso se valide antes de avanzar al siguiente.

Permitir en el futuro la integración con documentos en PDF o XLSX sin necesidad de cambios estructurales adicionales.

Agregar funcionalidad para que los usuarios puedan guardar "Insights Valiosos" dentro del chat para futuras referencias.

📂 Estructura de Base de Datos Actual y Modificaciones Mínimas

Se aprovechará la estructura existente, especialmente las siguientes tablas:

stage_content: Actualmente almacena contenido de etapas. Se usará para gestionar los prompts por pasos.

activity_interactions: Se usará para almacenar la conversación en curso.

activity_responses: Se utilizará para almacenar respuestas validadas.

Nueva tabla: user_insights, para almacenar ideas valiosas que el usuario quiera guardar.

📌 Cambios en la Base de Datos

1️⃣ Modificar stage_content para manejar prompts por pasos

Nuevo campo: step INT para identificar el número de paso en la actividad.

Nuevo campo: prompt_section TEXT para definir la parte del proceso (Ejemplo: "Identificación de Paradigmas").

Nuevo campo: system_instructions TEXT para definir instrucciones específicas del asistente para cada paso.

📌 Ejemplo de nueva estructura en stage_content:

- id
- stage_id
- content_type
- order_num
- step
- prompt_section
- content
- system_instructions

2️⃣ Crear user_insights para almacenar ideas valiosas guardadas por el usuario

- id
- user_id
- activity_id
- content
- created_at

🚀 Implementación en el Código

🔹 1. Obtener el Prompt Correcto Según el Paso

Cada vez que el usuario interactúe con el chat, se debe obtener el prompt del paso en el que se encuentra:

```typescript
const fetchActivityStep = async (activityId: string, step: number) => {
  const { data, error } = await supabase
    .from('stage_content')
    .select('*')
    .eq('stage_id', activityId)
    .eq('step', step)
    .single();

  if (error) {
    console.error('Error al obtener el paso:', error);
    return null;
  }

  return data;
};
```
🔹 2. Validar Respuesta Antes de Avanzar

El chat no avanzará de paso hasta que OpenAI confirme que la respuesta es válida:

```typescript
const validateResponse = async (response: string, step: number) => {
  const validationPrompt = `
  Evalúa la respuesta del usuario en el PASO ${step}.
  Respuesta: "${response}"
  - Si es válida, responde con "VALIDO".
  - Si no, sugiere cómo mejorarla.`;

  const validation = await callOpenAI(validationPrompt);
  return validation.includes("VALIDO");
};
``` 

🔹 3. Guardar y Consultar Insights

Guardar un Insight:

```typescript
const saveInsight = async (messageContent: string) => {
  const { data, error } = await supabase
    .from('user_insights')
    .insert([{ 
      user_id: user?.id, 
      activity_id: activityContent.id, 
      step: currentStep, 
      content: messageContent 
    }]);

  if (error) {
    console.error("Error al guardar insight:", error);
  } else {
    console.log("Insight guardado correctamente.");
  }
};
```

Consultar Insights Guardados

```typescript
const fetchUserInsights = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_insights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error al cargar insights:", error);
    return [];
  }

  return data;
};
```

🎯 Resultados Esperados

✅ Gestión de prompts escalable por pasos sin cambiar mucho la base de datos.✅ Validación de respuestas para asegurar interacciones más estructuradas.✅ Experiencia de usuario más natural y fluida en el chat.✅ Opción de guardar "Insights Valiosos" para futura referencia.✅ Preparado para futuras mejoras como integración de archivos PDF/XLSX en la base de datos vectorial.