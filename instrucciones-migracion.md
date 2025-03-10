# Instrucciones para aplicar la migración de actividad de ejemplo

## Opción 1: Aplicar la migración a través del panel de control de Supabase

1. Accede al panel de control de Supabase en: https://cjxpuwscnlqnmtfhjknj.supabase.co/dashboard
2. Inicia sesión con tus credenciales
3. Ve a la sección "SQL Editor" en el menú lateral
4. Crea un nuevo script SQL
5. Copia y pega el siguiente código SQL:

```sql
-- Insertar actividad de ejemplo para la etapa "Identificación de Paradigmas"
DO $$ 
DECLARE
  v_stage_id uuid;
BEGIN
  -- Obtener el ID de la etapa "Identificación de Paradigmas"
  SELECT id INTO v_stage_id FROM strategy_stages 
  WHERE name = 'Identificación de Paradigmas' 
  LIMIT 1;

  IF FOUND THEN
    -- Insertar actividad de ejemplo
    INSERT INTO stage_content 
      (stage_id, content_type, title, content, order_num, activity_data) 
    VALUES 
      (
        v_stage_id,
        'activity',
        'Análisis de Paradigmas Empresariales',
        'Actividad interactiva para identificar y transformar paradigmas limitantes',
        3,
        '{
          "prompt": "Analiza la respuesta del usuario sobre paradigmas empresariales. Considera el contexto de la empresa y su industria. Proporciona retroalimentación constructiva y preguntas que ayuden a profundizar en la identificación de paradigmas limitantes y su transformación en paradigmas amplificantes.",
          "system_instructions": "Eres un consultor experto en estrategia empresarial especializado en la identificación y transformación de paradigmas limitantes según la teoría de Chris Argyris. Tu objetivo es guiar al usuario a través de un proceso de reflexión profunda sobre los paradigmas que pueden estar limitando el potencial de su empresa.",
          "initial_message": "Bienvenido a la actividad de Análisis de Paradigmas Empresariales.\n\nEn esta actividad, trabajaremos juntos para identificar los paradigmas que pueden estar limitando el potencial de tu empresa y transformarlos en paradigmas amplificantes.\n\nPara comenzar, por favor responde a estas preguntas:\n\n1. ¿Cuáles son las creencias o suposiciones fundamentales que guían la toma de decisiones en tu empresa?\n2. ¿Hay alguna \"verdad incuestionable\" en tu industria que tu empresa acepta sin cuestionar?\n3. ¿Puedes identificar alguna situación reciente donde un paradigma limitante haya impedido aprovechar una oportunidad?",
          "max_exchanges": 5
        }'::jsonb
      );
  END IF;
END $$;
```

6. Ejecuta el script haciendo clic en el botón "Run" o presionando Ctrl+Enter

## Opción 2: Verificar si la etapa existe y luego aplicar la migración

Si tienes problemas para encontrar la etapa "Identificación de Paradigmas", puedes ejecutar primero esta consulta para ver todas las etapas disponibles:

```sql
SELECT id, name FROM strategy_stages ORDER BY order_num;
```

Luego, modifica el script anterior reemplazando `WHERE name = 'Identificación de Paradigmas'` con el nombre exacto de la etapa que deseas utilizar.

## Opción 3: Insertar la actividad con un ID de etapa específico

Si conoces el ID de la etapa, puedes insertar la actividad directamente:

```sql
INSERT INTO stage_content 
  (stage_id, content_type, title, content, order_num, activity_data) 
VALUES 
  (
    'ID-DE-LA-ETAPA-AQUÍ', -- Reemplaza esto con el ID real de la etapa
    'activity',
    'Análisis de Paradigmas Empresariales',
    'Actividad interactiva para identificar y transformar paradigmas limitantes',
    3,
    '{
      "prompt": "Analiza la respuesta del usuario sobre paradigmas empresariales. Considera el contexto de la empresa y su industria. Proporciona retroalimentación constructiva y preguntas que ayuden a profundizar en la identificación de paradigmas limitantes y su transformación en paradigmas amplificantes.",
      "system_instructions": "Eres un consultor experto en estrategia empresarial especializado en la identificación y transformación de paradigmas limitantes según la teoría de Chris Argyris. Tu objetivo es guiar al usuario a través de un proceso de reflexión profunda sobre los paradigmas que pueden estar limitando el potencial de su empresa.",
      "initial_message": "Bienvenido a la actividad de Análisis de Paradigmas Empresariales.\n\nEn esta actividad, trabajaremos juntos para identificar los paradigmas que pueden estar limitando el potencial de tu empresa y transformarlos en paradigmas amplificantes.\n\nPara comenzar, por favor responde a estas preguntas:\n\n1. ¿Cuáles son las creencias o suposiciones fundamentales que guían la toma de decisiones en tu empresa?\n2. ¿Hay alguna \"verdad incuestionable\" en tu industria que tu empresa acepta sin cuestionar?\n3. ¿Puedes identificar alguna situación reciente donde un paradigma limitante haya impedido aprovechar una oportunidad?",
      "max_exchanges": 5
    }'::jsonb
  );
```

## Verificación

Para verificar que la actividad se ha creado correctamente, ejecuta la siguiente consulta:

```sql
SELECT id, title, content_type, activity_data 
FROM stage_content 
WHERE content_type = 'activity' 
AND title = 'Análisis de Paradigmas Empresariales';
```
