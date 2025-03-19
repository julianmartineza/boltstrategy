import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityContent } from '../types';
import { useAuthStore } from '../store/authStore';

export function useActivityContent(stageContentId?: string, activityContentProp?: ActivityContent) {
  const [activityContent, setActivityContent] = useState<ActivityContent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Cargar el contenido de la actividad
  const fetchActivityContent = useCallback(async () => {
    if (!stageContentId) return;
    
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('stage_content')
        .select('*')
        .eq('id', stageContentId)
        .single();

      if (error) {
        console.error('Error fetching activity content:', error);
        setError(new Error(error.message));
        return;
      }

      // Añadir user_id al contenido de la actividad si es necesario
      const auth = useAuthStore.getState();
      if (auth && auth.user && auth.user.id && data) {
        const contentWithUserId = {
          ...data,
          user_id: auth.user.id
        };
        setActivityContent(contentWithUserId as ActivityContent);
      } else {
        setActivityContent(data as ActivityContent);
      }
    } catch (err) {
      console.error('Error in fetchActivityContent:', err);
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, [stageContentId]);

  // Inicializar el contenido de la actividad
  useEffect(() => {
    if (activityContentProp) {
      // Asegurarnos de que activityContentProp tenga user_id
      const auth = useAuthStore.getState();
      if (auth && auth.user && auth.user.id && !activityContentProp.user_id) {
        // Solo actualizar si no tiene user_id
        setActivityContent({
          ...activityContentProp,
          user_id: auth.user.id
        });
      } else {
        setActivityContent(activityContentProp);
      }
    } else if (stageContentId) {
      fetchActivityContent();
    }
  }, [stageContentId, activityContentProp, fetchActivityContent]);

  // Eliminamos el useEffect problemático que causaba actualizaciones infinitas
  // y movimos su lógica a los lugares donde se inicializa activityContent

  return {
    activityContent,
    loading,
    error,
    fetchActivityContent,
    setActivityContent
  };
}
