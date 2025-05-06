import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityContent } from '../types';
import { useAuthStore } from '../store/authStore';

export function useActivityContent(activityContentId?: string, activityContentProp?: ActivityContent) {
  const [activityContent, setActivityContent] = useState<ActivityContent | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Cargar el contenido de la actividad solo desde activity_contents
  const fetchActivityContent = useCallback(async () => {
    if (!activityContentId) return;
    setLoading(true);
    setError(null);
    try {
      console.log('Buscando actividad en activity_contents con ID:', activityContentId);
      const { data, error } = await supabase
        .from('activity_contents')
        .select('*')
        .eq('id', activityContentId)
        .single();
      if (error || !data) {
        console.error('Error fetching activity content:', error);
        setError(new Error(error ? error.message : 'No se encontró la actividad'));
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
  }, [activityContentId]);

  // Inicializar el contenido de la actividad
  useEffect(() => {
    if (activityContentProp) {
      // Asegurarnos de que activityContentProp tenga user_id
      const auth = useAuthStore.getState();
      if (auth && auth.user && auth.user.id && !activityContentProp.user_id) {
        setActivityContent({
          ...activityContentProp,
          user_id: auth.user.id
        });
      } else {
        setActivityContent(activityContentProp);
      }
    } else if (activityContentId) {
      fetchActivityContent();
    }
  }, [activityContentId, activityContentProp, fetchActivityContent]);

  return {
    activityContent,
    loading,
    error,
    fetchActivityContent,
    setActivityContent
  };
}
