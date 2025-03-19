# 📌 Plan de Modificación y Desarrollo (PMD)

## 🏗️ **Objetivo**

Reestructurar la gestión de prompts en el chat de la aplicación para que cada actividad tenga un flujo por pasos, asegurando escalabilidad y organización sin afectar demasiado la estructura actual de la base de datos.

## 📌 **Alcance de la Modificación**

- Mantener la estructura actual de la base de datos lo más intacta posible.
- Crear un sistema escalable de prompts organizados por pasos.
- Garantizar que cada paso se valide antes de avanzar al siguiente.
- Permitir en el futuro la integración con documentos en PDF o XLSX sin necesidad de cambios estructurales adicionales.
- Agregar funcionalidad para que los usuarios puedan guardar "Insights Valiosos" dentro del chat para futuras referencias.
- Implementar un sistema de memoria conversacional optimizado para mejorar la continuidad de la conversación y reducir costos.
- **Permitir que una actividad utilice información de actividades anteriores, configurando esto desde el Content Manager.**
- **Optimizar la gestión de **``** para una configuración más intuitiva y eliminando la columna ****\`\`****.**

## 📂 **Estructura de Base de Datos Actual y Modificaciones Mínimas**

Se aprovechará la estructura existente, especialmente las siguientes tablas:

- `stage_content`: Actualmente almacena contenido de etapas. Se usará para gestionar los prompts por actividad en lugar de por pasos.
- `activity_responses`: Se utilizará para almacenar las respuestas ingresadas por el usuario en cada actividad, permitiendo su recuperación y edición en caso de que el usuario regrese a una actividad anterior.
- `chat_summaries`: Se utilizará para almacenar resúmenes de conversaciones largas y optimizar la memoria de largo plazo.
- **Nueva columna en ****\`\`****:** `stage_name`, que permitirá definir nombres más descriptivos para cada actividad.
- **Nueva columna en ****\`\`****:** `dependencies`, que permitirá definir qué actividades previas deben usarse como contexto.
- \*\*Eliminar la columna \*\*`** en **`, ya que se utilizará un solo prompt por actividad en lugar de un sistema de pasos.
- **Nueva tabla:** `user_insights`, para almacenar ideas valiosas que el usuario quiera guardar.

### **📌 Cambios en la Base de Datos**

1️⃣ **Modificar ****\`\`**** para manejar prompts por actividad en lugar de por pasos**

- **Nuevo campo**: `stage_name TEXT` para definir un nombre descriptivo de la actividad.
- **Nuevo campo**: `prompt_section TEXT` para definir la parte del proceso (Ejemplo: "Identificación de Paradigmas").
- **Nuevo campo**: `system_instructions TEXT` para definir instrucciones específicas del asistente para cada actividad.
- **Nuevo campo**: `dependencies JSONB` para definir qué actividades previas deben usarse como contexto, almacenando directamente los valores de `stage_name` en lugar de `stage_id`. Esto permitirá que las dependencias sean configuradas de manera más intuitiva en el Content Manager.
- **Eliminar campo**: `step`, ya que no se gestionarán pasos dentro de una actividad.

📌 \*\*Ejemplo de configuración en \*\*\`\`:

| id | stage\_id  | stage\_name                  | content\_type | order\_num | dependencies                     | prompt\_section | content                                                            |
| -- | ---------- | ---------------------------- | ------------- | ---------- | -------------------------------- | --------------- | ------------------------------------------------------------------ |
| 1  | stage\_001 | Identificación de Paradigmas | activity      | 1          | null                             | Identificación  | "Describe los paradigmas actuales de tu empresa."                  |
| 2  | stage\_002 | Transformación de Paradigmas | activity      | 2          | ["Identificación de Paradigmas"] | Transformación  | "Basándonos en tus paradigmas previos, veamos cómo reformularlos." |

---

## 🚀 **Implementación en el Código**

### **🔹 1. Recuperar Dependencias de Actividades Anteriores**

Si una actividad tiene dependencias, el sistema automáticamente buscará las respuestas de esas actividades previas en `activity_responses` y las incluirá en el prompt enviado a OpenAI.

#### **Código para recuperar dependencias antes de generar el contexto:**

```typescript
const fetchDependencies = async (activityName: string) => {
  const { data, error } = await supabase
    .from('stage_content')
    .select('dependencies')
    .eq('stage_name', activityName)
    .single();

  if (error || !data?.dependencies) {
    return [];
  }

  return data.dependencies;
}; = await supabase
    .from('stage_content')
    .select('dependencies, stage_name')
    .eq('stage_id', activityId)
    .single();

  if (error || !data?.dependencies) {
    return [];
  }

  return data.dependencies.map(dependency => ({
    stage_id: dependency,
    stage_name: data.stage_name
  }));
};
```

#### **Código para recuperar respuestas de actividades previas:**

```typescript
const fetchPreviousResponses = async (userId: string, dependencies: string[]) => {
  const { data, error } = await supabase
    .from('activity_responses')
    .select('stage_name, content')
    .eq('user_id', userId)
    .in('stage_name', dependencies);

  if (error) {
    console.error('Error al recuperar respuestas previas:', error);
    return null;
  }

  return data;
}; = await supabase
    .from('activity_responses')
    .select('activity_id, content')
    .eq('user_id', userId)
    .in('activity_id', dependencies);

  if (error) {
    console.error('Error al recuperar respuestas previas:', error);
    return null;
  }

  return data;
};
```

#### **Código para integrar dependencias en el contexto de OpenAI:**

```typescript
const generateContextForOpenAI = async (userId: string, activityId: string, userInput: string) => {
  let chatHistory = [...shortTermMemory];

  // Obtener dependencias de la actividad actual
  const dependencies = await fetchDependencies(activityId);

  // Si hay dependencias, recuperar respuestas previas
  if (dependencies.length > 0) {
    const previousResponses = await fetchPreviousResponses(userId, dependencies.map(dep => dep.stage_id));
    if (previousResponses) {
      chatHistory.unshift({ role: "system", content: `Información relevante de actividades previas: ${JSON.stringify(previousResponses)}` });
    }
  }

  // Obtener el perfil de la empresa
  const companyProfile = await fetchCompanyProfile(userId);

  // Obtener el último resumen de memoria de largo plazo
  const { data: longTermMemory, error } = await supabase
    .from('chat_summaries')
    .select('summary')
    .eq('user_id', userId)
    .eq('activity_id', activityId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (!error && longTermMemory.length > 0) {
    chatHistory.unshift({ role: "system", content: longTermMemory[0].summary });
  }

  // Obtener el contenido de la actividad actual
  const activityStep = await fetchActivityStep(activityId);

  if (companyProfile) {
    chatHistory.unshift({ role: "system", content: `Contexto de la empresa: ${JSON.stringify(companyProfile)}` });
  }

  chatHistory.push({ role: "system", content: `Ahora estás en la actividad: ${activityStep.content}` });
  chatHistory.push({ role: "user", content: userInput });

  return chatHistory;
};
```

---

## **🚀 Conclusión**

✅ **Se agrega **``** para dar nombres más descriptivos a cada actividad.**\
✅ **Se elimina **``** en lugar de ****\`\`**** para seleccionar dependencias.**\
✅ **El sistema consulta automáticamente las respuestas previas y las envía a OpenAI.**\
✅ **El usuario tiene una experiencia más fluida sin repetir información que ya ha dado.**

🚀 **Con esta implementación, la configuración y uso de actividades será más intuitivo y eficiente.**

