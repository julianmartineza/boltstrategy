# 📌 Plan de Reutilización de Actividades

## 🏗️ **Objetivo**

Implementar un sistema que permita que una actividad utilice información de actividades anteriores, configurando esto desde el Content Manager, manteniendo la nueva arquitectura refactorizada del componente Chat.

## 📌 **Alcance de la Modificación**

- Mantener la estructura actual de la base de datos lo más intacta posible.
- Permitir que una actividad utilice información de actividades anteriores, configurando esto desde el Content Manager.
- Integrar esta funcionalidad con la arquitectura refactorizada del componente Chat.
- Garantizar que cada actividad pueda acceder a información previa de manera eficiente.

## 📂 **Estructura de Base de Datos Actual y Modificaciones Mínimas**

Se aprovechará la estructura existente, especialmente las siguientes tablas:

- `stage_content`: Actualmente almacena contenido de etapas. Se usará para gestionar los prompts por actividad.
- `activity_responses`: Se utilizará para almacenar las respuestas ingresadas por el usuario en cada actividad, permitiendo su recuperación y edición en caso de que el usuario regrese a una actividad anterior.
- **Nueva columna en `stage_content`:** `stage_name`, que permitirá definir nombres más descriptivos para cada actividad.
- **Nueva columna en `stage_content`:** `dependencies JSONB`, para definir qué actividades previas deben usarse como contexto, almacenando directamente los valores de `stage_name` en lugar de `stage_id`. Esto permitirá que las dependencias sean configuradas de manera más intuitiva en el Content Manager.

### **📌 Cambios en la Base de Datos**

1️⃣ **Modificar `stage_content` para manejar dependencias entre actividades**

- **Nuevo campo**: `stage_name TEXT` para definir un nombre descriptivo de la actividad.
- **Nuevo campo**: `prompt_section TEXT` para definir la parte del proceso (Ejemplo: "Identificación de Paradigmas").
- **Nuevo campo**: `system_instructions TEXT` para definir instrucciones específicas del asistente para cada actividad.
- **Nuevo campo**: `dependencies JSONB` para definir qué actividades previas deben usarse como contexto, almacenando directamente los valores de `stage_name` en lugar de `stage_id`. Esto permitirá que las dependencias sean configuradas de manera más intuitiva en el Content Manager.

📌 **Ejemplo de configuración en `stage_content`:**

| id | stage\_id  | stage\_name                  | content\_type | order\_num | dependencies                     | prompt\_section | content                                                            |
| -- | ---------- | ---------------------------- | ------------- | ---------- | -------------------------------- | --------------- | ------------------------------------------------------------------ |
| 1  | stage\_001 | Identificación de Paradigmas | activity      | 1          | null                             | Identificación  | "Describe los paradigmas actuales de tu empresa."                  |
| 2  | stage\_002 | Transformación de Paradigmas | activity      | 2          | ["Identificación de Paradigmas"] | Transformación  | "Basándonos en tus paradigmas previos, veamos cómo reformularlos." |

## 🔄 **Integración con la Arquitectura Refactorizada**

La funcionalidad de reutilización de actividades se integrará con la arquitectura refactorizada del componente Chat de la siguiente manera:

### 1. **Servicio de Chat (`chatService.ts`)**

Se modificará para incluir la recuperación de dependencias:

```typescript
// Función para recuperar dependencias
const fetchDependencies = async (activityId: string) => {
  const { data, error } = await supabase
    .from('stage_content')
    .select('dependencies, stage_name')
    .eq('stage_id', activityId)
    .single();

  if (error || !data?.dependencies) {
    return [];
  }

  return data.dependencies;
};

// Función para recuperar respuestas de actividades previas
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
};

// Función para generar respuestas que incluye información de actividades previas
generateResponse: async (userMessage: string, activityContent, company, interactionCount) => {
  // Código existente...
  
  // Obtener respuestas previas si hay dependencias
  if (activityContent?.id) {
    const dependencies = await fetchDependencies(activityContent.id);
    if (dependencies.length > 0) {
      const previousResponses = await fetchPreviousResponses(userId, dependencies);
      if (previousResponses) {
        // Incluir respuestas previas en el contexto
        botContext.previousActivities = previousResponses;
      }
    }
  }
  
  // Resto del código...
}
```

### 2. **Hook de Actividad (`useActivityContent.ts`)**

Se modificará para incluir información sobre dependencias:

```typescript
export function useActivityContent(stageContentId?: string, activityContentProp?: ActivityContent) {
  // Estado existente...
  const [dependencies, setDependencies] = useState<string[]>([]);
  
  // Efecto para cargar dependencias
  useEffect(() => {
    if (activityContent?.id) {
      const loadDependencies = async () => {
        const deps = await chatService.fetchDependencies(activityContent.id);
        setDependencies(deps);
      };
      
      loadDependencies();
    }
  }, [activityContent]);
  
  // Retornar también las dependencias
  return {
    activityContent,
    setActivityContent,
    loading,
    error,
    dependencies
  };
}
```

### 3. **Componente Chat Principal (`Chat.tsx`)**

Se modificará para utilizar la información de dependencias:

```typescript
export default function Chat({ stageContentId, activityContentProp }: ChatProps) {
  // Hooks existentes...
  const { 
    activityContent, 
    dependencies 
  } = useActivityContent(stageContentId, activityContentProp);
  
  // Mostrar indicador de actividades relacionadas si hay dependencias
  const hasDependencies = dependencies.length > 0;
  
  // Resto del componente...
  
  return (
    <div className="chat-container">
      {/* Mostrar indicador de actividades relacionadas */}
      {hasDependencies && (
        <div className="bg-blue-50 p-2 text-sm text-blue-700 rounded-md mb-2">
          <span className="font-medium">Información relacionada:</span> Esta actividad utiliza datos de actividades anteriores.
        </div>
      )}
      
      {/* Resto del componente... */}
    </div>
  );
}
```

## 🚀 **Conclusión**

✅ **La funcionalidad de reutilización de actividades se integra perfectamente con la arquitectura refactorizada.**
✅ **El sistema consulta automáticamente respuestas previas y las envía a OpenAI sin duplicar información.**
✅ **El usuario tiene una experiencia más fluida sin repetir información que ya ha dado.**
✅ **La configuración de dependencias es más intuitiva gracias al uso de nombres descriptivos.**

🚀 **Con esta implementación, la reutilización de actividades es más eficiente y fácil de configurar.**
