# Implementación de un Resolvedor de IDs Centralizado

## Problema

Actualmente, nuestra aplicación maneja dos tipos de IDs para las actividades:

1. **ID de registro** (`content_registry.id`): Usado como referencia en la interfaz de usuario
2. **ID real** (`activity_contents.id`): Usado para almacenar los datos reales de la actividad

Esta dualidad causa problemas cuando los servicios intentan acceder a los datos usando el ID incorrecto, lo que resulta en errores 404/406 y comportamientos inesperados.

## Solución propuesta

Implementar un sistema centralizado para resolver IDs que pueda ser utilizado por todos los servicios, eliminando la duplicación de código y garantizando un comportamiento consistente.

## Componentes de la solución

### 1. Utilidad básica de resolución de IDs

```typescript
// src/utils/idResolver.ts

import { supabase } from '../lib/supabase';

/**
 * Resuelve el ID real de una actividad a partir de su ID de registro
 * @param activityId ID de la actividad o registro
 * @returns ID real de la actividad
 */
export async function resolveActivityId(activityId: string): Promise<string> {
  // Evitar consultas innecesarias si el ID es nulo o indefinido
  if (!activityId) return activityId;
  
  try {
    // Verificar si es un ID de registro en content_registry
    const { data: registryData, error: registryError } = await supabase
      .from('content_registry')
      .select('content_id')
      .eq('id', activityId)
      .single();
    
    if (registryData && !registryError) {
      console.log(`✅ ID encontrado en content_registry, usando content_id: ${registryData.content_id}`);
      return registryData.content_id;
    }
    
    // Si no es un ID de registro, usar el ID original
    return activityId;
  } catch (error) {
    console.error('Error al resolver ID de actividad:', error);
    return activityId;
  }
}

/**
 * Versión con caché de resolveActivityId para mejorar el rendimiento
 */
const idCache = new Map<string, string>();

export async function resolveActivityIdWithCache(activityId: string): Promise<string> {
  if (idCache.has(activityId)) {
    return idCache.get(activityId)!;
  }
  
  const resolvedId = await resolveActivityId(activityId);
  idCache.set(activityId, resolvedId);
  return resolvedId;
}
```

### 2. Wrapper para Supabase

```typescript
// src/utils/supabaseWrapper.ts

import { supabase } from '../lib/supabase';
import { resolveActivityIdWithCache } from './idResolver';

/**
 * Wrapper para operaciones de Supabase que resuelve automáticamente IDs de actividad
 */
export const supabaseWithResolvedIds = {
  /**
   * Versión de supabase.from() que resuelve IDs automáticamente
   */
  from(table: string) {
    const originalBuilder = supabase.from(table);
    
    // Tablas que requieren resolución de IDs
    const tablesRequiringResolution = [
      'activity_contents',
      'activity_context_config',
      'evaluation_logs',
      'activity_deliverables',
      'evaluation_rubrics'
    ];
    
    // Columnas que pueden contener IDs de actividad
    const columnsToResolve = ['id', 'activity_id'];
    
    // Solo modificar el comportamiento para tablas relevantes
    if (!tablesRequiringResolution.includes(table)) {
      return originalBuilder;
    }
    
    // Crear un proxy para interceptar llamadas a métodos
    return new Proxy(originalBuilder, {
      get(target, prop) {
        // Si la propiedad es 'eq', interceptar para resolver IDs
        if (prop === 'eq') {
          return async function(column, value) {
            // Si la columna es una que puede contener IDs de actividad
            if (columnsToResolve.includes(column)) {
              const resolvedId = await resolveActivityIdWithCache(value);
              return target[prop](column, resolvedId);
            }
            
            // Para otros casos, usar el comportamiento original
            return target[prop](column, value);
          };
        }
        
        // Para otras propiedades, devolver el comportamiento original
        return target[prop];
      }
    });
  }
};
```

### 3. Hook personalizado para React Query

```typescript
// src/hooks/useResolvedQuery.ts

import { useQuery, QueryKey, UseQueryOptions } from 'react-query';
import { resolveActivityIdWithCache } from '../utils/idResolver';

/**
 * Hook personalizado que resuelve IDs automáticamente
 */
export function useResolvedQuery(
  queryKey: QueryKey,
  queryFn: (resolvedParams: any) => Promise<any>,
  options?: UseQueryOptions
) {
  // Resolver IDs antes de ejecutar la consulta
  const resolvedQueryFn = async () => {
    // Asumir que queryKey[1] contiene los parámetros con IDs a resolver
    if (queryKey.length < 2 || typeof queryKey[1] !== 'object') {
      return queryFn(queryKey[1]);
    }
    
    const params = { ...queryKey[1] };
    
    // Resolver activityId si existe
    if (params.activityId) {
      params.activityId = await resolveActivityIdWithCache(params.activityId);
    }
    
    return queryFn(params);
  };
  
  return useQuery(queryKey, resolvedQueryFn, options);
}
```

## Plan de implementación

### Fase 1: Preparación

1. Crear los archivos de utilidad `idResolver.ts` y `supabaseWrapper.ts`
2. Escribir pruebas unitarias para validar su funcionamiento
3. Documentar la API y casos de uso

### Fase 2: Implementación gradual

1. Identificar los servicios más problemáticos (aquellos con más errores relacionados con IDs)
2. Refactorizar estos servicios para usar las nuevas utilidades
3. Monitorear los errores y ajustar según sea necesario

### Fase 3: Integración completa

1. Refactorizar el resto de servicios para usar el sistema centralizado
2. Crear hooks personalizados para React Query/SWR
3. Actualizar la documentación del proyecto

## Consideraciones de rendimiento

- Implementar caché para evitar consultas repetidas a la base de datos
- Considerar la posibilidad de precarga de mapeos de ID durante la inicialización de la aplicación
- Monitorear el rendimiento y ajustar según sea necesario

## Beneficios esperados

1. **Reducción de errores**: Menos errores 404/406 relacionados con IDs incorrectos
2. **Código más limpio**: Eliminación de lógica duplicada en múltiples servicios
3. **Mantenimiento más sencillo**: Cambios en la lógica de resolución de IDs solo necesitan hacerse en un lugar
4. **Mejor experiencia de usuario**: Menos errores visibles para el usuario final

## Posibles desafíos

1. **Complejidad adicional**: Introduce una capa más de abstracción
2. **Curva de aprendizaje**: Los desarrolladores nuevos necesitarán entender esta capa adicional
3. **Rendimiento**: Posible impacto en el rendimiento si no se implementa correctamente la caché

## Conclusión

La implementación de un sistema centralizado para resolver IDs es una inversión en la calidad y mantenibilidad del código a largo plazo. Aunque requiere un esfuerzo inicial, los beneficios en términos de reducción de errores y facilidad de mantenimiento justifican ampliamente este esfuerzo.
