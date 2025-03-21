import fs from 'fs';
import path from 'path';
import { supabase } from '../lib/supabase';

/**
 * Script para ejecutar migraciones SQL en la base de datos Supabase
 * Uso: npm run migrate -- <nombre_del_archivo_sql>
 * Ejemplo: npm run migrate -- 20250320_program_enrollments.sql
 */

async function runMigration() {
  try {
    // Obtener el nombre del archivo de migración de los argumentos
    const migrationFile = process.argv[2];
    
    if (!migrationFile) {
      console.error('Error: Debes especificar un archivo de migración.');
      console.log('Uso: npm run migrate -- <nombre_del_archivo_sql>');
      process.exit(1);
    }
    
    // Ruta al archivo de migración
    const migrationPath = path.join(__dirname, '../migrations', migrationFile);
    
    // Verificar si el archivo existe
    if (!fs.existsSync(migrationPath)) {
      console.error(`Error: El archivo ${migrationPath} no existe.`);
      process.exit(1);
    }
    
    // Leer el contenido del archivo SQL
    const sqlContent = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`Ejecutando migración: ${migrationFile}`);
    
    // Ejecutar el SQL en Supabase
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      console.error('Error al ejecutar la migración:', error);
      process.exit(1);
    }
    
    console.log('Migración ejecutada exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error inesperado:', err);
    process.exit(1);
  }
}

runMigration();
