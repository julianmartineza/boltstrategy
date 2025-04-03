Plan de Migración: De stage_content a Estructura Multi-tabla

1. Situación Actual
Actualmente, la tabla stage_content almacena diferentes tipos de contenido (videos, textos, actividades de chat con IA, etc.) para los programas. Esta estructura ha comenzado a presentar limitaciones debido a la diversidad de tipos de contenido que maneja.

2. Estructura Objetivo
Migraremos hacia una arquitectura con:

Tablas especializadas para cada tipo de contenido
Tabla índice que unifique el registro de todo el contenido

2.1. Tabla Índice Propuesta

´´´
CREATE TABLE content_registry (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- 'video', 'text', 'chat_activity', 'session', 'workshop'
    content_table VARCHAR(50) NOT NULL, -- Nombre de la tabla donde se almacena el contenido completo
    content_id INTEGER NOT NULL, -- ID en la tabla correspondiente
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES user_profiles(id),
    status VARCHAR(20) DEFAULT 'active' -- 'active', 'archived', 'draft'
);
```

2.2. Tablas Especializadas Propuestas

-- Para contenido de tipo texto
CREATE TABLE text_contents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    content TEXT NOT NULL,
    format VARCHAR(20) DEFAULT 'markdown', -- 'markdown', 'html', 'plain'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Para contenido de tipo video
CREATE TABLE video_contents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    video_url VARCHAR(512) NOT NULL,
    duration INTEGER, -- duración en segundos
    thumbnail_url VARCHAR(512),
    source VARCHAR(50), -- 'youtube', 'vimeo', 'upload'
    transcript TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Para actividades con chat IA
CREATE TABLE chat_activities (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    instructions TEXT,
    prompt_template TEXT,
    ai_model VARCHAR(50),
    context_strategy VARCHAR(50), -- cómo usar el contexto
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Para sesiones de asesoría
CREATE TABLE advisory_sessions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    duration INTEGER, -- minutos
    session_type VARCHAR(50), -- 'mentoring', 'advisory', 'coaching'
    preparation_instructions TEXT, -- instrucciones para el usuario
    advisor_notes TEXT, -- notas para el asesor
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Para workshops
CREATE TABLE workshops (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    duration INTEGER, -- minutos
    location_type VARCHAR(20), -- 'online', 'in_person', 'hybrid'
    max_attendees INTEGER,
    materials TEXT, -- lista de materiales necesarios
    requirements TEXT, -- requisitos previos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

3. Plan de Migración Paso a Paso
3.1. Preparación (Sin afectar el sistema actual)

Crear tablas nuevas:

Ejecutar scripts SQL para crear content_registry y todas las tablas especializadas
Añadir índices necesarios para optimizar consultas


Desarrollar servicios de abstracción:

Crear endpoints/servicios que unifiquen la consulta a las diferentes tablas
Integrar estos servicios en aplicación sin activarlos


Preparar scripts de migración:

Desarrollar scripts que lean stage_content y distribuyan datos a las tablas correspondientes
Incluir validación de datos y manejo de casos especiales



3.2. Análisis de Datos Actuales

-- Identificar los diferentes tipos de contenido en stage_content
SELECT 
    content_type, 
    COUNT(*) as total 
FROM 
    stage_content 
GROUP BY 
    content_type;

-- Analizar estructura de cada tipo para planificar la migración
SELECT 
    id, 
    content_type, 
    -- otros campos relevantes 
FROM 
    stage_content 
LIMIT 20;

3.3. Migración de Datos (En ventana de mantenimiento)

-- Script conceptual para migración de datos de tipo 'video'
INSERT INTO video_contents (
    title, 
    video_url, 
    duration,
    thumbnail_url
)
SELECT 
    title, 
    content->>'video_url', 
    (content->>'duration')::integer,
    content->>'thumbnail_url'
FROM 
    stage_content 
WHERE 
    content_type = 'video';

-- Luego, registrar en content_registry
INSERT INTO content_registry (
    title,
    description,
    content_type,
    content_table,
    content_id,
    created_at,
    created_by,
    status
)
SELECT 
    v.title,
    sc.description,
    'video',
    'video_contents',
    v.id,
    sc.created_at,
    sc.created_by,
    COALESCE(sc.status, 'active')
FROM 
    video_contents v
JOIN 
    stage_content sc ON sc.content->>'video_url' = v.video_url
WHERE 
    sc.content_type = 'video';

-- Repetir proceso similar para otros tipos de contenido

3.4. Validación y Verificación

-- Verificar que el conteo coincida
SELECT COUNT(*) FROM stage_content WHERE content_type = 'video';
SELECT COUNT(*) FROM video_contents;
SELECT COUNT(*) FROM content_registry WHERE content_type = 'video';

-- Verificar integridad referencial
SELECT 
    cr.id, 
    cr.content_type, 
    cr.content_id, 
    CASE 
        WHEN cr.content_type = 'video' AND EXISTS (SELECT 1 FROM video_contents WHERE id = cr.content_id) THEN 'OK'
        WHEN cr.content_type = 'text' AND EXISTS (SELECT 1 FROM text_contents WHERE id = cr.content_id) THEN 'OK'
        -- otros tipos
        ELSE 'ERROR'
    END AS check_result
FROM 
    content_registry cr
WHERE 
    check_result = 'ERROR';

    3.5. Actualización de la Aplicación

Modificar código del gestor de contenidos:

Actualizar dropdown para leer de content_registry en lugar de stage_content
Asegurar que al seleccionar un item, se carguen los detalles de la tabla especializada


Ejemplo de función para obtener contenido

async function getContentDetails(registryId) {
  // Obtener información del registro
  const registry = await db.query(
    "SELECT content_type, content_table, content_id FROM content_registry WHERE id = $1",
    [registryId]
  );
  
  if (!registry.rows.length) return null;
  
  const item = registry.rows[0];
  
  // Consultar la tabla específica
  const contentQuery = `SELECT * FROM ${item.content_table} WHERE id = $1`;
  const content = await db.query(contentQuery, [item.content_id]);
  
  return {
    registryInfo: item,
    contentDetails: content.rows[0]
  };
}


Adaptar vistas existentes:

Actualizar todas las interfaces que muestran contenido para usar la nueva estructura



3.6. Manejo de Programas Existentes
Los programas existentes probablemente tengan referencias a stage_content. Existen dos opciones:
Opción 1: Mantener stage_content como tabla de compatibilidad

-- Añadir columna en stage_content para linkear al nuevo sistema
ALTER TABLE stage_content ADD COLUMN content_registry_id INTEGER REFERENCES content_registry(id);

-- Actualizar esta columna durante la migración
UPDATE stage_content sc
SET content_registry_id = cr.id
FROM content_registry cr
WHERE cr.content_type = sc.content_type
AND cr.title = sc.title;

-- Asumiendo que hay una tabla program_content que relaciona programas con contenido
ALTER TABLE program_content 
ADD COLUMN content_registry_id INTEGER REFERENCES content_registry(id);

-- Migrar referencias
UPDATE program_content pc
SET content_registry_id = cr.id
FROM stage_content sc
JOIN content_registry cr ON cr.title = sc.title AND cr.content_type = sc.content_type
WHERE pc.stage_content_id = sc.id;

5. Optimización y Limpieza (Post-migración exitosa)

Añadir índices adicionales para mejorar rendimiento
Actualizar documentación con el nuevo esquema
Eventual eliminación de stage_content o conversión a vista si ya no es necesaria

6. Consideraciones Adicionales
6.1. Para el Gestor de Contenidos
El gestor de contenidos debe adaptarse para:

Mostrar un dropdown unificado con todos los tipos de contenido (desde content_registry)
Al crear nuevo contenido, determinar la tabla correcta según el tipo seleccionado
Al editar, cargar formularios específicos según el tipo