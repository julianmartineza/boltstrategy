# PDR — Módulo de Evaluación “Entregables + Rúbrica” + Logging  
**Componente base:** `activityCompletionServices.ts`  


---

## 1. Propósito  
Incorporar un sistema de evaluación robusto que valide las respuestas del chat en términos de **producto** y **calidad** de las interacciones, evitando bucles sin fin y aportando retroalimentación clara al usuario.  
El nuevo modelo combina:

1. **Entregables** — Artefactos concretos que la conversación debe producir.  
2. **Rúbrica** — Conjunto ponderado de criterios que miden la profundidad y coherencia de dichos artefactos.  
3. **Logging** — Registro estructurado de cada evaluación, permitiendo auditoría, seguimiento individual y a futuro análisis agregado.

---

## 2. Alcance  

| Ítem | Incluido | Excluido |
|------|----------|----------|
| Refactor de `activityCompletionServices.ts` para usar el nuevo motor | ✔ | |
| Tabla Supabase `activity_deliverables` (nueva, utiliza el MCP de supabase para verificar) | ✔ | |
| Tabla Supabase `evaluation_rubrics` (nueva, utiliza el MCP de supabase para verificar) | ✔ | |
| Tabla Supabase `evaluation_logs` (nueva, utiliza el MCP de supabase para verificar) | ✔ | |
| Actualización de prompts del LLM (evaluación + mensajes de cierre) | ✔ | |
| Integración con el chat actual y su UI/UX para mostrar feedback detallado | ✔ | |

---

## 3. Contexto actual  

El componente actual evalúa:  
- Número de interacciones.  
- Presencia de temas y palabras clave.  

**Limitaciones:**  
- No mide calidad semántica.  
- Palabras clave rígidas.  
- No confirma satisfacción del usuario.  
- Sin registro estructurado de resultados históricos.  

---

## 4. Objetivos específicos del nuevo motor 

1. **Flexibilidad** — Definir criterios por actividad sin tocar código.  
2. **Precisión** — Utilizar embeddings y prompts de evaluación para detectar sinónimos y coherencia.  
3. **Transparencia** — Entregar al usuario una justificación clara de la calificación.  
4. **Control de flujo** — Cerrar la conversación cuando se alcanza el umbral y el usuario confirma.  
5. **Trazabilidad** — Guardar logs para analizar desempeño, evolución y patrones agregados.

---

## 5. Requisitos funcionales  

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| RF‑01 | Registrar entregables esperados para cada actividad | Alta |
| RF‑02 | Registrar rúbrica (criterio, peso, descripción) | Alta |
| RF‑03 | Calcular puntuación ponderada (0 – 1) en cada intervención | Alta |
| RF‑04 | Generar feedback JSON con `covered`, `missing`, `score`, `explanation` | Alta |
| RF‑05 | Confirmar con el usuario si se siente conforme antes de cerrar | Media |
| RF‑06 | Registrar resultados en `evaluation_logs` para trazabilidad | Alta |


---

## 6. Modelo de datos  

### 6.1 Tabla `activity_deliverables`  

| Columna | Tipo | PK | Descripción |
|---------|------|----|-------------|
| id | UUID | ✔ | Identificador único |
| activity_id | UUID | FK | Actividad relacionada |
| code | text |  | Identificador (`objetivo_marketing_smart`) |
| description | text |  | Texto visible en la UI |
| detection_query | jsonb |  | Instrucción para el modelo (regex, prompt, etc.) |

---

### 6.2 Tabla `evaluation_rubrics`  

| Columna | Tipo | PK | Descripción |
|---------|------|----|-------------|
| id | UUID | ✔ | Identificador único |
| activity_id | UUID | FK | Actividad relacionada |
| criterion_id | text |  | (`objetivo_claro`) |
| weight | numeric |  | Entre 0 y 1 |
| success_criteria | text |  | Explicación |

---

### 6.3 Tabla `evaluation_logs` (nueva)  

| Columna | Tipo | PK | Descripción |
|---------|------|----|-------------|
| id | UUID | ✔ | Identificador único |
| activity_id | UUID | FK | Actividad evaluada |
| user_id | UUID | FK | Usuario evaluado |
| evaluation_time | timestamp |  | Fecha y hora de la evaluación |
| rubric_scores | JSONB |  | Ej.: `{ "objetivo_claro": 0.9, "insight_competitivo": 0.7 }` |
| overall_score | numeric |  | Puntaje total (0–1) |
| feedback_message | text |  | Texto mostrado al usuario |
| is_completed | boolean |  | Si alcanzó el umbral de aprobación |

---

## 7. Arquitectura técnica  

Frontend (Next.js)
│
API routes  (verifica, esto ya debe existir)
│
activityCompletionServices.ts  ⇄  Supabase
│
OpenAI Chat + Embeddings 

- El servicio **consume** `activity_deliverables` y `evaluation_rubrics`.
- Cada turno ejecuta `evaluateConversation()`:
  1. Detecta entregables pendientes vía embeddings/regex.  
  2. Llama a OpenAI con prompt de evaluación y devuelve puntuación por criterio.  
  3. Persiste resultados en `evaluation_logs` (auditoría y métricas).  

---

## 8. Algoritmo de evaluación (pseudocódigo)

```ts
function evaluateConversation(activityId, userId) {
  conv = fetchInteractions(activityId, userId)
  deliverables = getDeliverables(activityId)
  rubric = getRubric(activityId)

  detected = detectDeliverables(conv, deliverables)
  if (detected.missing.length) return pending(detected)

  scores = llmScore(conv, rubric)
  total = weightedSum(scores, rubric.weights)
  feedback = generateFeedback(scores, total, rubric)

  logEvaluation({
    activityId,
    userId,
    time: now(),
    rubricScores: scores,
    overallScore: total,
    feedbackMessage: feedback,
    isCompleted: total >= SUCCESS_THRESHOLD
  })

  if (total >= SUCCESS_THRESHOLD) {
     if (userConfirmed(conv)) return complete(total, scores)
     else promptConfirmation()
  }

  return pendingFeedback(scores)
}


⸻

9. Cambios en activityCompletionServices.ts

✅ Añadir interfaces nuevas:

interface Deliverable { code: string; description: string; detected: boolean }
interface RubricItem { id: string; weight: number; success_criteria: string; score?: number }
interface EvaluationLog { activityId, userId, rubricScores, overallScore, feedbackMessage, isCompleted }

✅ Añadir funciones:
	•	detectDeliverables()
	•	scoreWithRubric()
	•	promptUserConfirmation()
	•	logEvaluation()

✅ Refactor:
	•	Eliminar lógica rígida de required_keywords.
	•	Reemplazar con deliverables y rubric traídos de Supabase.
	•	Mantener compatibilidad con actividades legadas mediante feature flag.

⸻

10. Prompts OpenAI

10.1 Evaluación de rúbrica

SYSTEM: Eres un auditor de calidad de consultoría.
Devuelve JSON: [{id, score, explanation} ...]

USER: Conversación: <<<{{conversation}}>>>
Rúbrica: <<<{{rubric}}>>>

10.2 Generación de mensaje de cierre

Idéntico al actual, pero añade {{resumen_logros}} y {{próximo_paso}}.

⸻

11. Seguridad y coste

Tema	Acción
Rate limit	Máx. 2 evaluaciones por minuto por usuario
Token usage	Embeddings se calculan una sola vez por actividad
Logging	Guardar solo hashes de conversación para no exponer PII


⸻

12. Testing

Tipo	Caso	Resultado esperado
Unit	Falta un entregable	isCompleted=false, missing=['matriz_competencia']
Unit	Score=0.79	Bot pide profundizar
Integration	Score=0.85 + usuario dice “listo”	Actividad completada
Regression	Actividad legacy sin nuevas tablas	Se evalúa con criterios antiguos

⸻

13. Riesgos y mitigación

Riesgo	Plan
Coste alto en tokens	Cache de embeddings + batch scoring
Falsos negativos por ambigüedad	Ajustar SUCCESS_THRESHOLD y pesos después de la beta
Crecimiento rápido de logs	Indexar bien; archivar evaluaciones viejas si es necesario

⸻

14. KPI iniciales
	•	% de actividades cerradas en ≤ interacciones máximas
	•	Satisfacción usuario (CSAT) tras mensaje de cierre
	•	Tiempo promedio de conversación
	•	Costs / activity (USD)
	•	Tasa de mejora por criterio entre intentos


⸻

Con este PDR tu equipo tiene la guía completa para implementar el sistema de evaluación mejorado, asegurando una experiencia más precisa, trazable y analítica para cada usuario.
