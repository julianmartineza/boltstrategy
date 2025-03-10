/*
  # Agregar actividad de ejemplo para pruebas

  1. Cambios
    - Insertar una actividad de ejemplo en la tabla stage_content
    - Configurar activity_data con prompt, instrucciones y mensaje inicial
*/

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
