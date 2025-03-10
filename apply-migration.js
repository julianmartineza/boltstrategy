import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

// Cargar variables de entorno
const supabaseUrl = 'https://cjxpuwscnlqnmtfhjknj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqeHB1d3Njbmxxbm10Zmhqa25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5NDk4OTEsImV4cCI6MjA1NDUyNTg5MX0.vJzEmYqa5E8Mn146vErA4euexP0ghmdbwhOgeBb0D1g';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer el archivo de migración
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250310151234_example_activity.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function applyMigration() {
  try {
    console.log('Verificando conexión a Supabase...');
    
    // Verificar la conexión obteniendo el usuario actual
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error de autenticación:', authError);
      console.log('Asegúrate de que las credenciales de Supabase sean correctas.');
      return;
    }
    
    console.log('Conexión establecida correctamente');
    console.log('Usuario autenticado:', user ? user.email : 'No autenticado (usando clave anónima)');
    
    // Listar las tablas disponibles
    console.log('\nListando tablas disponibles...');
    
    // Intentamos acceder a algunas tablas comunes para verificar si existen
    const tables = ['strategy_stages', 'stage_content', 'companies', 'diagnostics'];
    
    for (const table of tables) {
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.log(`Tabla '${table}': Error al acceder - ${countError.message}`);
      } else {
        console.log(`Tabla '${table}': ${count !== null ? count : 'N/A'} registros`);
      }
    }
    
    console.log('\nCreando actividad de ejemplo directamente...');
    
    // Creamos la actividad directamente sin depender de una etapa existente
    // Usaremos un UUID generado para el stage_id
    const stageId = crypto.randomUUID(); // Generamos un UUID aleatorio
    
    console.log('Usando ID de etapa generado:', stageId);
    console.log('Este ID es temporal y se usará solo para la demostración.');
    
    // Preguntamos al usuario si desea continuar
    console.log('\nPresiona Ctrl+C para cancelar o espera 5 segundos para continuar...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Insertamos la actividad directamente
    const { data, error } = await supabase
      .from('stage_content')
      .insert([
        {
          stage_id: stageId,
          content_type: 'activity',
          title: 'Análisis de Paradigmas Empresariales',
          content: 'Actividad interactiva para identificar y transformar paradigmas limitantes',
          order_num: 3,
          activity_data: {
            prompt: "Analiza la respuesta del usuario sobre paradigmas empresariales. Considera el contexto de la empresa y su industria. Proporciona retroalimentación constructiva y preguntas que ayuden a profundizar en la identificación de paradigmas limitantes y su transformación en paradigmas amplificantes.",
            system_instructions: "Eres un consultor experto en estrategia empresarial especializado en la identificación y transformación de paradigmas limitantes según la teoría de Chris Argyris. Tu objetivo es guiar al usuario a través de un proceso de reflexión profunda sobre los paradigmas que pueden estar limitando el potencial de su empresa.",
            initial_message: "Bienvenido a la actividad de Análisis de Paradigmas Empresariales.\n\nEn esta actividad, trabajaremos juntos para identificar los paradigmas que pueden estar limitando el potencial de tu empresa y transformarlos en paradigmas amplificantes.\n\nPara comenzar, por favor responde a estas preguntas:\n\n1. ¿Cuáles son las creencias o suposiciones fundamentales que guían la toma de decisiones en tu empresa?\n2. ¿Hay alguna \"verdad incuestionable\" en tu industria que tu empresa acepta sin cuestionar?\n3. ¿Puedes identificar alguna situación reciente donde un paradigma limitante haya impedido aprovechar una oportunidad?",
            max_exchanges: 5
          }
        }
      ]);

    
    if (error) {
      console.error('Error al insertar la actividad:', error);
      return;
    }
    
    console.log('Actividad insertada exitosamente');
    console.log('Verificando la actividad creada...');
    
    // Verificar que la actividad se haya creado correctamente
    const { data: activities, error: activityError } = await supabase
      .from('stage_content')
      .select('id, title, content_type, activity_data')
      .eq('content_type', 'activity')
      .eq('title', 'Análisis de Paradigmas Empresariales');
    
    if (activityError) {
      console.error('Error al verificar la actividad:', activityError);
      return;
    }
    
    if (activities && activities.length > 0) {
      console.log('Actividad creada correctamente:');
      console.log('ID:', activities[0].id);
      console.log('Título:', activities[0].title);
      console.log('Tipo de contenido:', activities[0].content_type);
    } else {
      console.log('No se encontró la actividad creada');
    }
  } catch (err) {
    console.error('Error inesperado:', err);
  }
}

applyMigration();
