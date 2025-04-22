# Plan de Refactorización: Componentes de Programas y Strategy

## Problema

Actualmente, los componentes relacionados con la visualización y gestión de programas están organizados bajo una estructura que no refleja adecuadamente su propósito general:

1. El componente principal se llama `StrategyProgram` y está ubicado en `components/programs/strategy/`, sugiriendo que es específico para programas de estrategia.
2. Sin embargo, este componente funciona como un visualizador genérico para cualquier tipo de programa, no solo los de estrategia.
3. Esta estructura dificulta la comprensión del código y podría complicar futuras ampliaciones para soportar diferentes tipos de programas.
4. Los nombres actuales no reflejan la función real de los componentes, lo que puede confundir a nuevos desarrolladores.

## Decisión

Refactorizar la estructura y nomenclatura de los componentes relacionados con programas para que reflejen mejor su propósito general:

1. Renombrar `StrategyProgram` a `ProgramViewer`
2. Reorganizar la estructura de carpetas para eliminar la especificidad de "strategy"
3. Actualizar todas las referencias e importaciones en el código
4. Mantener la funcionalidad exactamente igual

## Justificación

Esta refactorización mejorará:

1. **Claridad conceptual**: Los nombres reflejarán mejor el propósito real de los componentes
2. **Mantenibilidad**: Será más fácil entender y modificar el código
3. **Escalabilidad**: Facilitará la adición de nuevos tipos de programas en el futuro
4. **Onboarding**: Los nuevos desarrolladores entenderán más rápidamente la estructura

## Plan de Implementación

### Fase 1: Preparación

1. **Análisis de dependencias**
   - Identificar todos los archivos que importan componentes de `components/programs/strategy/`
   - Mapear todas las rutas que hacen referencia a estos componentes
   - Documentar las dependencias en un diagrama

2. **Creación de pruebas**
   - Implementar pruebas automatizadas para verificar la funcionalidad actual
   - Documentar el comportamiento esperado para validación post-refactorización

### Fase 2: Refactorización de Archivos

1. **Crear nueva estructura de carpetas**
   ```
   components/
     program-viewer/
       ProgramViewer.tsx (antes StrategyProgram.tsx)
       ContentViewer.tsx (antes StageContent.tsx)
       ProgramOutline.tsx
       ProgressIndicator.tsx (antes StrategyProgress.tsx)
   ```

2. **Mover y renombrar componentes**
   - Crear los nuevos archivos con el contenido actualizado
   - Actualizar las importaciones internas entre estos componentes
   - Mantener temporalmente los archivos originales como referencia

### Fase 3: Actualización de Referencias

1. **Actualizar importaciones en otros archivos**
   - Modificar todas las importaciones que apuntan a los componentes originales
   - Actualizar las rutas en el enrutador de la aplicación

2. **Actualizar tipos y props**
   - Renombrar tipos relacionados para mantener consistencia
   - Asegurar que las props se pasen correctamente entre componentes

### Fase 4: Pruebas y Validación

1. **Ejecutar pruebas automatizadas**
   - Verificar que todas las pruebas pasen con la nueva estructura
   - Identificar y corregir cualquier problema

2. **Pruebas manuales**
   - Verificar la navegación y visualización de programas
   - Comprobar que todas las funcionalidades sigan operando correctamente

3. **Revisión de código**
   - Realizar una revisión exhaustiva del código refactorizado
   - Verificar que no queden referencias a los nombres antiguos

### Fase 5: Limpieza

1. **Eliminar archivos originales**
   - Una vez confirmado que todo funciona correctamente, eliminar los archivos originales

2. **Actualizar documentación**
   - Actualizar cualquier documentación que haga referencia a los componentes renombrados
   - Actualizar diagramas de arquitectura

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Referencias perdidas | Alta | Alto | Usar herramientas de búsqueda de código para encontrar todas las referencias |
| Errores en rutas | Media | Alto | Pruebas exhaustivas de navegación |
| Regresiones funcionales | Media | Alto | Pruebas automatizadas y manuales antes y después |
| Conflictos de fusión | Media | Medio | Realizar la refactorización en una rama separada |
| Tiempo de inactividad | Baja | Alto | Planificar la implementación durante períodos de baja actividad |

## Criterios de Éxito

1. Todas las pruebas automatizadas pasan
2. La aplicación funciona exactamente igual que antes
3. No hay referencias a los nombres antiguos en el código
4. La nueva estructura es más clara y refleja mejor el propósito de los componentes

## Tiempo Estimado

- **Análisis y preparación**: 1 día
- **Refactorización de archivos**: 1 día
- **Actualización de referencias**: 1 día
- **Pruebas y validación**: 2 días
- **Limpieza y documentación**: 1 día

**Total estimado**: 6 días laborables

## Conclusión

Esta refactorización es principalmente estructural y no afecta la funcionalidad. Sin embargo, mejorará significativamente la claridad del código y facilitará futuras ampliaciones. Se recomienda realizarla como un proyecto separado, con tiempo dedicado para pruebas exhaustivas.
