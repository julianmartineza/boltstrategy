/*
  # Update strategy stages with complete framework

  1. Changes
    - Clear existing strategy stages
    - Insert new stages with complete framework process
    - Each stage includes name, order, required content and prompt template
    - Stages follow the specified sequence and dependencies
*/

-- First, clear existing stages
TRUNCATE TABLE strategy_stages;

-- Insert new stages
INSERT INTO strategy_stages (name, order_num, required_content, prompt_template) VALUES
  (
    'Identificación de Paradigmas',
    1,
    'Análisis de paradigmas limitantes y su transformación en paradigmas amplificantes basado en Chris Argyris',
    'Basado en la información proporcionada por la empresa {company_name}, analicemos los paradigmas actuales que pueden estar limitando su potencial. Consideremos: {context}'
  ),
  (
    'Identidad Corporativa',
    2,
    'Definición clara de la identidad corporativa de la empresa',
    'Considerando los paradigmas identificados y el perfil de la empresa {company_name}, vamos a definir su identidad corporativa analizando: {context}'
  ),
  (
    'Configuración de Unidades de Negocio',
    3,
    'Estructuración y definición de las unidades de negocio de la empresa',
    'Basado en la identidad corporativa definida, vamos a configurar las unidades de negocio para {company_name}, considerando: {context}'
  ),
  (
    'Jobs to be Done',
    4,
    'Identificación de circunstancias y jobs to be done para cada unidad de negocio',
    'Para cada unidad de negocio de {company_name}, analicemos los jobs funcionales, sociales y emocionales, considerando: {context}'
  ),
  (
    'Story Board de Jobs',
    5,
    'Creación de story board de 6 escenas para representar los jobs de los clientes',
    'Basado en los jobs identificados para {unit_name}, vamos a crear un story board que represente la experiencia del cliente: {context}'
  ),
  (
    'ADN Competitivo',
    6,
    'Identificación del ADN competitivo de cada unidad de negocio',
    'Para la unidad de negocio {unit_name}, definamos su ADN competitivo considerando: {context}'
  ),
  (
    'Propuesta de Valor',
    7,
    'Generación de propuesta de valor para cada unidad de negocio',
    'Basado en el ADN competitivo y los jobs identificados para {unit_name}, definamos la propuesta de valor considerando: {context}'
  ),
  (
    'Go to Market',
    8,
    'Estrategia de go to market para cada unidad de negocio',
    'Para la unidad {unit_name}, desarrollemos la estrategia de go to market considerando los 5 elementos clave: {context}'
  ),
  (
    'Horizontes de Crecimiento',
    9,
    'Definición de horizontes de crecimiento según Baghai, Coley, White',
    'Basado en toda la estrategia desarrollada para {company_name}, definamos los horizontes de crecimiento considerando: {context}'
  ),
  (
    'Diseño Organizacional',
    10,
    'Diseño de estructura organizacional corporativa y competitiva',
    'Para implementar la estrategia definida, diseñemos la estructura organizacional de {company_name} considerando: {context}'
  ),
  (
    'Roles y Capacidades',
    11,
    'Definición de roles, responsabilidades y capacidades requeridas',
    'Para la estructura organizacional definida, especifiquemos los roles y capacidades necesarias: {context}'
  ),
  (
    'Métricas',
    12,
    'Definición de métricas corporativas y competitivas',
    'Para medir el éxito de la estrategia, definamos las métricas clave para {company_name} y sus unidades de negocio: {context}'
  );