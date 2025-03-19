Sistema de Memoria a Largo Plazo
El sistema de memoria a largo plazo está implementado mediante dos componentes principales:

Tabla chat_summaries: Almacena resúmenes de conversaciones anteriores para cada usuario y actividad.
Función fetchLongTermMemorySummaries: Recupera los últimos 3 resúmenes de conversaciones para una actividad específica y los incluye en el contexto enviado a OpenAI.
Generación de Resúmenes
Los resúmenes se generan automáticamente mediante la función cleanUpInteractions cuando:

Un usuario tiene 10 o más interacciones en una actividad específica.
El sistema utiliza OpenAI para generar un resumen conciso de estas interacciones.
El resumen se guarda en la tabla chat_summaries.
Las interacciones más antiguas (todas excepto las 5 más recientes) se eliminan para liberar espacio.
Flujo Completo del Sistema de Memoria
Memoria a Corto Plazo: Se mantiene en el frontend mediante el array shortTermMemory (últimas 10 interacciones).
Memoria a Largo Plazo:
Cuando hay muchas interacciones, se genera un resumen con OpenAI.
Los resúmenes se almacenan en la tabla chat_summaries.
Estos resúmenes se recuperan y se incluyen en el contexto para futuras conversaciones.
Generación de Contexto para OpenAI:
La función generateContextForOpenAI construye un contexto completo que incluye:
Instrucciones del sistema
Información de la empresa
Resumen del diagnóstico
Dependencias de la actividad
Resúmenes de memoria a largo plazo
Historial de chat a corto plazo
Mensaje actual del usuario
Este sistema está bien diseñado y permite mantener conversaciones coherentes a lo largo del tiempo sin sobrecargar la memoria con todas las interacciones anteriores. Los resúmenes proporcionan el contexto necesario para que el asistente recuerde aspectos importantes de conversaciones pasadas.