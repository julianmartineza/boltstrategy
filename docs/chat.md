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

## 📂 **Estructura de Base de Datos Actual y Modificaciones Mínimas**

Se aprovechará la estructura existente, especialmente las siguientes tablas:

- `stage_content`: Actualmente almacena contenido de las actividades del chat. Se usará para gestionar los prompts por actividad en lugar de por pasos.
- `activity_responses`: Se utilizará para almacenar las respuestas ingresadas por el usuario en cada actividad, permitiendo su recuperación y edición en caso de que el usuario regrese a una actividad anterior.
- `chat_summaries`: Se utilizará para almacenar resúmenes de conversaciones largas y optimizar la memoria de largo plazo.
- `user_insights`, para almacenar ideas valiosas que el usuario quiera guardar.

## 🔄 **Arquitectura Refactorizada del Componente Chat**

Siguiendo el plan de refactorización implementado, el componente Chat ahora está estructurado de la siguiente manera:

### 1. **Componentes UI**

#### `ChatMessage.tsx`
- Renderiza mensajes individuales con formato según el tipo
- Incluye funcionalidad para guardar insights
- Maneja diferentes tipos de mensajes (usuario, IA, error, etc.)

#### `ChatInput.tsx`
- Maneja el área de entrada de texto y botón de envío
- Gestiona estados de carga y validación
- Procesa comandos especiales

#### `InsightsList.tsx`
- Gestiona la visualización de insights guardados
- Permite al usuario ver y gestionar sus insights
- Ofrece funcionalidad para copiar insights al portapapeles

#### `WelcomeMessage.tsx`
- Muestra un mensaje de bienvenida cuando el chat está vacío
- Proporciona un botón para iniciar la conversación
- Personaliza el mensaje según el contenido de la actividad

### 2. **Hooks Personalizados**

#### `useChatMessages.ts`
- Gestiona los mensajes, interacciones y memoria de corto plazo
- Proporciona funciones para añadir mensajes de usuario y IA
- Maneja la carga de mensajes previos y evita duplicados

#### `useChatInsights.ts`
- Maneja la carga y guardado de insights
- Proporciona funciones para mostrar/ocultar botones de insights
- Gestiona la persistencia de insights en la base de datos

#### `useActivityContent.ts`
- Gestiona la carga del contenido de actividades
- Asegura que el user_id esté presente en el contenido de la actividad
- Maneja estados de carga y error

### 3. **Servicios**

#### `chatService.ts`
- Centraliza la lógica de negocio del chat
- Genera respuestas del bot basadas en el contexto
- Procesa comandos especiales
- Limpia interacciones antiguas

### **📌 Optimización del Chat y Memoria Conversacional**

Para mejorar la experiencia del usuario, el chat implementa un sistema de memoria estructurado en tres niveles:

### **1️⃣ Memoria de Corto Plazo (Últimas 10 interacciones en el frontend)**

- Se almacenan en caché las **últimas 10 interacciones** del usuario y la IA en el frontend.
- Se evita hacer múltiples consultas a la base de datos para mantener fluidez.
- Cuando se supera el límite de 10 interacciones, se descartan los mensajes más antiguos.

```typescript
let shortTermMemory: { role: string; content: string }[] = [];

const updateShortTermMemoryWithParams = (content: string, role: 'user' | 'assistant' | 'system') => {
  if (shortTermMemory.length >= 10) {
    shortTermMemory.shift(); // Elimina el mensaje más antiguo
  }
  shortTermMemory.push({ role, content });
};
```

### **2️⃣ Memoria de Largo Plazo (Resúmenes en `chat_summaries`)**

- Cada **10 interacciones**, se genera un resumen en `chat_summaries`.
- Los resúmenes permiten reducir el uso de tokens en OpenAI y evitar perder información importante.
- Se eliminan interacciones antiguas de `activity_interactions` cuando se crea un resumen.

```typescript
const cleanUpInteractions = async (userId: string, activityId: string) => {
  // Implementación similar a la anterior, pero mejorada con la nueva estructura
};
```

### **3️⃣ Recuperación de Contexto para OpenAI**

Cada vez que OpenAI recibe un mensaje, se le envía:
✅ **Las últimas 10 interacciones en caché.**
✅ **El último resumen de `chat_summaries`, si existe.**
✅ **Información de la empresa y diagnóstico del usuario.**
✅ **Instrucciones específicas de la actividad (system_instructions).**
✅ **Plantilla de prompt específica de la actividad (prompt_template).**

### **4️⃣ Gestión de Prompts Específicos por Actividad**

El sistema ahora utiliza correctamente los prompts específicos almacenados en la base de datos:

#### **Estructura de datos en `stage_content.activity_data`**

```json
{
  "prompt": "Instrucciones específicas para la actividad",
  "system_instructions": "Instrucciones de sistema para OpenAI",
  "initial_message": "Mensaje inicial opcional",
  "max_exchanges": 15
}
```

#### **Flujo de procesamiento de prompts**

1. **Extracción de datos**: Se obtienen las instrucciones específicas y la plantilla de prompt del objeto `activityContent`.
2. **Primer mensaje**: Para el primer mensaje de bienvenida, se utiliza un contexto simplificado pero que incluye las instrucciones específicas.
3. **Mensajes subsiguientes**: Se utiliza el contexto completo, incluyendo memoria de corto y largo plazo, junto con las instrucciones específicas.

```typescript
// Obtener instrucciones específicas de la actividad
const systemInstructions = activityContent?.activity_data?.system_instructions || '';
const promptTemplate = activityContent?.activity_data?.prompt || activityContent?.content || '';

// Crear el objeto de contexto con las instrucciones específicas
const botContext = {
  systemPrompt: systemInstructions || 
    `Eres un consultor de estrategia ayudando con la etapa "${stageName}", específicamente en la actividad "${activityTitle}".
    ${promptTemplate ? `\nInstrucciones específicas: ${promptTemplate}` : ''}`,
  stage: stageName,
  activity: activityTitle,
  previousMessages: filteredContext,
  context: company
};
```

### **5️⃣ Dependencias entre Actividades**

El sistema permite que una actividad utilice información de actividades anteriores:

1. **Configuración de dependencias**: Desde el Content Manager, se pueden configurar las dependencias de cada actividad.
2. **Recuperación automática**: El servicio de chat recupera automáticamente la información relevante de las actividades dependientes.
3. **Inclusión en el contexto**: Esta información se incluye en el contexto enviado a OpenAI para generar respuestas más coherentes.

```typescript
// Recuperar dependencias de la actividad
const dependencies = await fetchDependencies(activityId);

// Incluir dependencias en el contexto
if (dependencies && dependencies.length > 0) {
  context.push({
    role: 'system',
    content: `Dependencias de la actividad: ${JSON.stringify(dependencies)}`
  });
}
```

## 📊 **Validación y Pruebas**

Para asegurar que el sistema de chat funcione correctamente:

1. **Verificar la extracción de prompts**: Comprobar que los prompts se extraen correctamente de `activity_data`.
2. **Verificar la generación de contexto**: Asegurar que el contexto incluye todas las fuentes de información relevantes.
3. **Verificar la respuesta del bot**: Comprobar que las respuestas siguen las instrucciones específicas de la actividad.
4. **Verificar la memoria conversacional**: Asegurar que la memoria de corto y largo plazo funciona correctamente.

## 🔄 **Próximos Pasos**

1. **Mejora de la interfaz de usuario**: Añadir indicadores visuales para mostrar cuando se están utilizando datos de actividades dependientes.
2. **Optimización de costos**: Implementar técnicas adicionales para reducir el uso de tokens en OpenAI.
3. **Análisis de sentimiento**: Añadir análisis de sentimiento para detectar frustración o confusión en los mensajes del usuario.

## **🚀 Conclusión**

✅ **Se implementa una memoria conversacional escalonada para optimizar el rendimiento del chat.**
✅ **La refactorización mejora la mantenibilidad y escalabilidad del código.**
✅ **El sistema consulta automáticamente respuestas previas y las envía a OpenAI sin duplicar información.**
✅ **El usuario tiene una experiencia más fluida sin repetir información que ya ha dado.**

🚀 **Con esta implementación, la configuración y uso del chat son más eficientes y escalables.**
