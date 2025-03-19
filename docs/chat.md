# 📌 Plan de Modificación y Desarrollo (PMD)

## 🏗️ **Objetivo**

Reestructurar la gestión de prompts en el chat de la aplicación para que cada actividad tenga un flujo por pasos, asegurando escalabilidad y organización sin afectar demasiado la estructura actual de la base de datos.

## 📌 **Alcance de la Modificación**

- Mantener la estructura actual de la base de datos lo más intacta posible.
- Crear un sistema escalable de prompts organizados por actividad.
- Garantizar que cada actividad pueda validar información previa antes de avanzar.
- Permitir en el futuro la integración con documentos en PDF o XLSX sin necesidad de cambios estructurales adicionales.
- Agregar funcionalidad para que los usuarios puedan guardar "Insights Valiosos" dentro del chat para futuras referencias.
- **Implementar un sistema de memoria conversacional optimizado** para mejorar la continuidad de la conversación y reducir costos.
- **Permitir que una actividad utilice información de actividades anteriores, configurando esto desde el Content Manager.**
- **Optimizar la gestión de **``** agregando **``** para una configuración más intuitiva y eliminando la columna **``**.**

## 📂 **Estructura de Base de Datos Actual y Modificaciones Mínimas**

Se aprovechará la estructura existente, especialmente las siguientes tablas:

- `stage_content`: Actualmente almacena contenido de etapas. Se usará para gestionar los prompts por actividad en lugar de por pasos.
- `activity_responses`: Se utilizará para almacenar las respuestas ingresadas por el usuario en cada actividad, permitiendo su recuperación y edición en caso de que el usuario regrese a una actividad anterior.
- `chat_summaries`: Se utilizará para almacenar resúmenes de conversaciones largas y optimizar la memoria de largo plazo.
- **Nueva columna en **``**:** `stage_name`, que permitirá definir nombres más descriptivos para cada actividad.
- **Nueva columna en **``**:** `dependencies JSONB`, para definir qué actividades previas deben usarse como contexto, almacenando directamente los valores de `stage_name` en lugar de `stage_id`. Esto permitirá que las dependencias sean configuradas de manera más intuitiva en el Content Manager.
- **Eliminar la columna **``** en **``, ya que se utilizará un solo prompt por actividad en lugar de un sistema de pasos.
- **Nueva tabla:** `user_insights`, para almacenar ideas valiosas que el usuario quiera guardar.

### **📌 Optimización del Chat y Memoria Conversacional**

Para mejorar la experiencia del usuario, el chat implementará un sistema de memoria estructurado en tres niveles:

### **1️⃣ Memoria de Corto Plazo (Últimas 10 interacciones en el frontend)**

- Se almacenan en caché las **últimas 10 interacciones** del usuario y la IA en el frontend.
- Se evita hacer múltiples consultas a la base de datos para mantener fluidez.
- Cuando se supera el límite de 10 interacciones, se descartan los mensajes más antiguos.

```typescript
let shortTermMemory: { role: string; content: string }[] = [];

const updateShortTermMemory = (newMessage: { role: string; content: string }) => {
  if (shortTermMemory.length >= 10) {
    shortTermMemory.shift(); // Elimina el mensaje más antiguo
  }
  shortTermMemory.push(newMessage);
};
```

### **2️⃣ Memoria de Largo Plazo (Resúmenes en **``**)**

- Cada **10 interacciones**, se genera un resumen en `chat_summaries`.
- Los resúmenes permiten reducir el uso de tokens en OpenAI y evitar perder información importante.
- Se eliminan interacciones antiguas de `activity_interactions` cuando se crea un resumen.

```typescript
const cleanUpInteractions = async (userId: string, activityId: string) => {
  const { data: interactions, error } = await supabase
    .from('activity_interactions')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_id', activityId)
    .order('timestamp', { ascending: true });

  if (!error && interactions.length >= 10) {
    // Generar resumen con OpenAI
    const summaryPrompt = `
    Resume las siguientes interacciones manteniendo los puntos clave:
    ${interactions.map(m => `${m.role}: ${m.content}`).join("\n")}
    `;

    const summary = await callOpenAI({ messages: [{ role: "system", content: summaryPrompt }] });

    // Guardar el resumen en `chat_summaries`
    await supabase.from('chat_summaries').insert([{ 
      user_id: userId, 
      activity_id: activityId, 
      summary: summary, 
      created_at: new Date().toISOString()
    }]);

    // Eliminar interacciones antiguas para liberar espacio
    for (const interaction of interactions) {
      await supabase.from('activity_interactions').delete().eq('id', interaction.id);
    }
  }
};
```

### **3️⃣ Recuperación de Contexto para OpenAI**

Cada vez que OpenAI recibe un mensaje, se le envía: ✅ **Las últimas 10 interacciones en caché.** ✅ **El último resumen de **``**, si existe.** ✅ **Las instrucciones del paso actual.** ✅ **El perfil de la empresa, si está disponible.** ✅ **Las respuestas previas de actividades relacionadas, si existen.**

```typescript
const generateContextForOpenAI = async (userId: string, activityId: string, userInput: string) => {
  let chatHistory = [...shortTermMemory];

  // Obtener respuestas previas si hay dependencias
  const dependencies = await fetchDependencies(activityId);
  if (dependencies.length > 0) {
    const previousResponses = await fetchPreviousResponses(userId, dependencies);
    if (previousResponses) {
      chatHistory.unshift({ role: "system", content: `Información relevante de actividades previas: ${JSON.stringify(previousResponses)}` });
    }
  }

  // Obtener el perfil de la empresa
  const companyProfile = await fetchCompanyProfile(userId);
  if (companyProfile) {
    chatHistory.unshift({ role: "system", content: `Contexto de la empresa: ${JSON.stringify(companyProfile)}` });
  }

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

  chatHistory.push({ role: "user", content: userInput });
  return chatHistory;
};
```

## **🚀 Conclusión**

✅ **Se implementa una memoria conversacional escalonada para optimizar el rendimiento del chat.**\
✅ **Las dependencias entre actividades se configuran con **``**, facilitando la gestión en el Content Manager.**\
✅ **El sistema consulta automáticamente respuestas previas y las envía a OpenAI sin duplicar información.**\
✅ **El usuario tiene una experiencia más fluida sin repetir información que ya ha dado.**

🚀 **Con esta implementación, la configuración y uso del chat serán más eficientes y escalables.**

