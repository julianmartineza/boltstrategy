import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Cargar variables de entorno
const supabaseUrl = 'https://cjxpuwscnlqnmtfhjknj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqeHB1d3Njbmxxbm10Zmhqa25qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg5NDk4OTEsImV4cCI6MjA1NDUyNTg5MX0.vJzEmYqa5E8Mn146vErA4euexP0ghmdbwhOgeBb0D1g';

// Crear cliente de Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Obtener el directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer el archivo de migración de notificaciones
const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250519191013_create_notifications_table.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

async function applyNotificationsMigration() {
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
    
    // Verificar si la tabla de notificaciones ya existe
    console.log('\nVerificando si la tabla de notificaciones ya existe...');
    
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.log('La tabla de notificaciones no existe o no se puede acceder.');
      console.log('Aplicando migración para crear la tabla...');
      
      // Ejecutar la migración SQL directamente
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: migrationSQL });
      
      if (sqlError) {
        console.error('Error al ejecutar la migración SQL:', sqlError);
        return;
      }
      
      console.log('Migración aplicada exitosamente.');
      
      // Verificar que la tabla se haya creado correctamente
      const { error: verifyError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });
        
      if (verifyError) {
        console.error('Error al verificar la tabla creada:', verifyError);
        return;
      }
      
      console.log('Tabla de notificaciones creada correctamente.');
    } else {
      console.log('La tabla de notificaciones ya existe con', count, 'registros.');
    }
    
    console.log('\nProceso completado.');
    
  } catch (error) {
    console.error('Error durante la aplicación de la migración:', error);
  }
}

applyNotificationsMigration();
