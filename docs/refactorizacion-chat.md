# Plan de Refactorización del Componente Chat

## Problemas Identificados

- El componente `Chat.tsx` es demasiado extenso (más de 400 líneas)
- Maneja múltiples responsabilidades (UI, lógica de negocio, gestión de estado, llamadas a API)
- Difícil de mantener y probar
- Alta complejidad cognitiva

## Estructura Propuesta

### 1. Componentes UI

#### `ChatMessage.tsx`
```tsx
// Componente para renderizar un mensaje individual
interface ChatMessageProps {
  message: Message;
  onSaveInsight?: (content: string) => void;
}

export function ChatMessage({ message, onSaveInsight }: ChatMessageProps) {
  // Renderiza un mensaje individual con su formato correspondiente
  // Incluye la funcionalidad para guardar insights
}
```

#### `ChatInput.tsx`
```tsx
// Componente para el área de entrada de mensajes
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
}

export function ChatInput({ value, onChange, onSend, isLoading }: ChatInputProps) {
  // Renderiza el input y el botón de envío
  // Maneja el estado de carga
}
```

#### `InsightsList.tsx`
```tsx
// Componente para mostrar la lista de insights
interface InsightsListProps {
  insights: UserInsight[];
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export function InsightsList({ insights, isVisible, onToggleVisibility }: InsightsListProps) {
  // Renderiza la lista de insights con su botón de toggle
}
```

### 2. Hooks Personalizados

#### `useChatMessages.ts`
```tsx
// Hook para gestionar los mensajes del chat
export function useChatMessages(userId: string, activityId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Funcionalidad para cargar mensajes previos
  // Funcionalidad para añadir nuevos mensajes
  // Gestión de la memoria de corto plazo
  
  return {
    messages,
    addUserMessage,
    addAIMessage,
    loadPreviousMessages
  };
}
```

#### `useChatInsights.ts`
```tsx
// Hook para gestionar los insights
export function useChatInsights(userId: string, activityId: string) {
  const [insights, setInsights] = useState<UserInsight[]>([]);
  
  // Funcionalidad para cargar insights
  // Funcionalidad para guardar nuevos insights
  
  return {
    insights,
    saveInsight,
    fetchInsights
  };
}
```

#### `useActivityContent.ts`
```tsx
// Hook para gestionar el contenido de la actividad
export function useActivityContent(stageContentId?: string, activityContentProp?: ActivityContent) {
  const [activityContent, setActivityContent] = useState<ActivityContent | null>(null);
  
  // Lógica para cargar el contenido de la actividad
  
  return {
    activityContent,
    fetchActivityContent
  };
}
```

### 3. Servicios

#### `chatService.ts`
```tsx
// Servicio para manejar la lógica de negocio del chat
export const chatService = {
  // Función para generar respuestas del bot
  generateResponse: async (userMessage: string, context: any) => {
    // Lógica para generar respuestas
  },
  
  // Función para guardar interacciones
  saveInteraction: async (userId: string, activityId: string, userMessage: string, aiResponse: string) => {
    // Lógica para guardar interacciones
  }
};
```

### 4. Componente Chat Refactorizado

```tsx
export default function Chat({ stageContentId, activityContentProp }: ChatProps) {
  const { user } = useAuthStore();
  const { company } = useProgramStore();
  
  // Usar hooks personalizados
  const { activityContent } = useActivityContent(stageContentId, activityContentProp);
  const { messages, addUserMessage, addAIMessage, loadPreviousMessages } = useChatMessages(user?.id, activityContent?.id);
  const { insights, saveInsight, fetchInsights } = useChatInsights(user?.id, activityContent?.id);
  
  // Estado local mínimo
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  
  // Efectos simplificados
  
  // Manejadores de eventos
  const handleSendMessage = async () => {
    // Lógica simplificada para enviar mensajes
  };
  
  // Renderizado
  return (
    <div className="chat-container">
      {/* Lista de mensajes */}
      <div className="messages-container">
        {messages.map(message => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            onSaveInsight={saveInsight} 
          />
        ))}
      </div>
      
      {/* Lista de insights */}
      <InsightsList 
        insights={insights} 
        isVisible={showInsights} 
        onToggleVisibility={() => setShowInsights(!showInsights)} 
      />
      
      {/* Input de chat */}
      <ChatInput 
        value={input} 
        onChange={setInput} 
        onSend={handleSendMessage} 
        isLoading={isLoading} 
      />
    </div>
  );
}
```

## Beneficios de la Refactorización

1. **Mejor separación de responsabilidades**:
   - Componentes UI enfocados solo en la presentación
   - Hooks para la gestión de estado
   - Servicios para la lógica de negocio

2. **Mayor reutilización de código**:
   - Los componentes UI pueden reutilizarse en otras partes de la aplicación
   - Los hooks encapsulan lógica que puede ser compartida

3. **Facilidad de pruebas**:
   - Componentes más pequeños son más fáciles de probar
   - Separación clara entre UI y lógica facilita los tests unitarios

4. **Mantenibilidad mejorada**:
   - Archivos más pequeños y enfocados
   - Menor complejidad cognitiva
   - Más fácil de entender para nuevos desarrolladores

5. **Escalabilidad**:
   - Más fácil añadir nuevas características
   - Mejor organización del código

## Plan de Implementación

1. Crear los componentes UI
2. Implementar los hooks personalizados
3. Extraer la lógica de negocio a servicios
4. Refactorizar el componente Chat principal
5. Actualizar las importaciones en los archivos que usan el componente Chat
6. Probar exhaustivamente para asegurar que la funcionalidad se mantiene
