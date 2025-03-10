# Registro de Cambios

## 2025-03-11

### Implementación de Base de Datos Vectorial para Chat
- [x] Añadida funcionalidad para generar y almacenar embeddings vectoriales de mensajes
- [x] Implementada búsqueda semántica de mensajes similares utilizando vectores
- [x] Modificado el componente Chat para cargar y persistir conversaciones entre sesiones
- [x] Optimizado el contexto para OpenAI utilizando solo mensajes relevantes en lugar de todo el historial
- [x] Mejorada la eficiencia de las consultas al limitar el número de mensajes enviados a la API
- [x] Corregidos errores de tipos en el componente Chat.tsx relacionados con la interfaz SimilarMessage
- [x] Exportada la interfaz SimilarMessage desde openai.ts para su uso en otros componentes

### Correcciones en la Estructura de la Base de Datos
- [x] Creado script de migración para modificar la tabla activity_interactions existente y añadir soporte vectorial
- [x] Añadida verificación para comprobar si las columnas de embeddings ya existen antes de crearlas
- [x] Mejorada la función search_similar_interactions para manejar valores nulos en los embeddings

### Mejoras en la Interfaz de Usuario
- [x] Simplificado el componente StrategyProgress para mostrar solo la sección de "Progreso General"
- [x] Eliminada la sección de "Próximos Pasos" para una interfaz más limpia
- [x] Corregidos errores de tipos y variables no utilizadas en los componentes
- [x] Creado nuevo componente ProgramOutline para mostrar el contenido del programa y las etapas
- [x] Reorganizado el layout para mostrar el contenido principal a la izquierda (75%) y el índice del programa a la derecha (25%)
- [x] Mejorada la navegación entre etapas y contenidos del programa
- [x] Mejorado el componente ProgramOutline para cargar dinámicamente el contenido de cada etapa
- [x] Añadidos iconos visuales para distinguir entre tipos de contenido (texto, video, actividad)
- [x] Asegurado que el ProgramOutline esté siempre visible junto a cualquier tipo de contenido
- [x] Optimizada la distribución de la pantalla para mejorar la experiencia de usuario
- [x] Mejorado el componente StageContent para que ocupe el ancho completo del contenedor (75% de la pantalla)
- [x] Modificado el componente VideoPlayer para aceptar la propiedad className y mejorar su adaptabilidad
- [x] Cambiado el sistema de grid por flexbox para un mejor control del espacio y posicionamiento de los componentes
- [x] Fijado el ancho mínimo del ProgramOutline para garantizar su usabilidad en diferentes tamaños de pantalla
- [x] Eliminado el botón "Iniciar Actividad" y toda su funcionalidad relacionada
- [x] Simplificada la interfaz al remover la vista de actividades
- [x] Mejorado el componente ProgramOutline para mostrar todas las etapas independientemente de si tienen contenido
- [x] Implementada la carga automática del contenido de todas las etapas al iniciar el componente
- [x] Modificada la consulta en programStore para obtener todas las etapas sin filtrar por actividades
- [x] Corregidos errores de tipos en programStore para asegurar la compatibilidad con la interfaz Stage
- [x] Mejorado el componente ProgramOutline para que tenga una altura fija y genere una barra de desplazamiento cuando el contenido excede la altura disponible
- [x] Ajustado el contenedor del ProgramOutline en StrategyProgram para mantener una altura consistente con el contenido principal
- [x] Corregido error de tipo en DBActivity añadiendo la propiedad stage_content_id para compatibilidad con el componente Chat
- [x] Eliminado el indicador "Content X of Y" del componente StageContent por ser redundante con la navegación del ProgramOutline
- [x] Eliminada completamente la caja de navegación superior en el componente StageContent para simplificar la interfaz
- [x] Mejorada la navegación inferior en el componente StageContent con una interfaz más moderna y textos en español
- [x] Añadido indicador de progreso en la navegación inferior que muestra la posición actual dentro del contenido
- [x] Ajustada la altura del componente ProgramOutline para que llegue hasta el límite inferior de la sección de navegación
- [x] Implementada la apertura automática de la etapa actual en el ProgramOutline
- [x] Añadido resaltado visual para el contenido que se está mostrando actualmente
- [x] Implementada navegación entre contenidos desde el ProgramOutline
- [x] Añadidos indicadores visuales (checkmarks) para contenidos que han sido completados
- [x] Mejorada la interfaz de navegación con indicadores de progreso interactivos

## 2025-03-10

### Integración de la API de OpenAI
- [x] Implementada la integración directa con la API de OpenAI utilizando la clave API del archivo .env
- [x] Configurada la llamada a la API con el modelo gpt-4-turbo-preview para obtener respuestas de alta calidad
- [x] Añadido manejo de errores robusto para la API de OpenAI con respuestas de fallback
- [x] Implementado almacenamiento de interacciones en la base de datos para análisis futuro

### Mejoras en la orquestación del chat y contexto enriquecido
- [x] Implementada la carga de actividades previas completadas para enriquecer el contexto
- [x] Mejorada la generación de respuestas de IA con información contextual de la empresa y diagnóstico
- [x] Corregidos errores de tipo relacionados con valores posiblemente nulos
- [x] Optimizado el formato de los mensajes para la API de OpenAI

### Integración del componente Chat en StageContent
- [x] Modificado el componente StageContent.tsx para mostrar el componente Chat cuando el tipo de contenido es 'activity'
- [x] Implementada la verificación de la estructura de activity_data antes de pasarlo al componente Chat
- [x] Corregidos errores de tipo en la integración entre StageContent y Chat
- [x] Mejorada la compatibilidad de tipos entre los componentes

### Mejoras en el componente Chat y actividades interactivas
- [x] Modificado el componente Chat.tsx para manejar actividades interactivas
- [x] Creada migración de ejemplo (20250310151234_example_activity.sql) con una actividad de prueba
- [x] Implementada la lógica para mostrar y procesar actividades interactivas en la interfaz de chat
- [x] Corregidos problemas de variables no utilizadas en el componente Chat.tsx
- [x] Mejorada la carga de actividades para buscar actividades disponibles cuando no hay una actividad actual
- [x] Añadida funcionalidad para cargar automáticamente la primera actividad disponible
- [x] Mejorado el indicador de carga con mensaje informativo

### Detalles técnicos
- La tabla `activities` ha sido eliminada y ahora las actividades se manejan en la tabla `stage_content` con el tipo 'activity'
- Los datos específicos de la actividad se almacenan en la columna `activity_data` como un objeto JSON con la siguiente estructura:
  - `prompt`: El prompt a utilizar para generar respuestas de la IA
  - `system_instructions`: Instrucciones del sistema para la IA (opcional)
  - `initial_message`: Mensaje inicial que se muestra al usuario al comenzar la actividad (opcional)
  - `max_exchanges`: Número máximo de intercambios antes de completar la actividad automáticamente (opcional, por defecto 5)
- El componente Chat ahora puede recibir la actividad como prop desde el componente StageContent
- Se ha implementado una verificación de tipos para asegurar la compatibilidad entre los datos de la base de datos y los componentes

### Instrucciones para aplicar la migración
- Se han proporcionado instrucciones detalladas en el archivo `instrucciones-migracion.md` para aplicar la migración de la actividad de ejemplo
- La migración puede aplicarse a través del panel de control de Supabase ejecutando el SQL directamente
- El componente Chat ahora busca automáticamente actividades disponibles si no hay una actividad actual

### Flujo de trabajo para actividades
1. Las actividades se crean en la tabla `stage_content` con el tipo 'activity'
2. El componente StageContent muestra la actividad y renderiza el componente Chat cuando detecta una actividad
3. El componente Chat recibe la actividad como prop y muestra la interfaz de chat
4. El usuario puede interactuar con la actividad a través de la interfaz de chat
5. El componente Chat enriquece el contexto con información de la empresa, diagnóstico y actividades previas
6. Las respuestas de la IA se generan teniendo en cuenta todo el contexto disponible
