import { useState, useCallback, useEffect } from 'react';
import { UserInsight } from '../types';
import { 
  saveUserInsight as saveInsightToService,
  fetchUserInsights as fetchInsightsFromService
} from '../lib/chatMemoryService';

export function useChatInsights(userId?: string, activityId?: string) {
  const [insights, setInsights] = useState<UserInsight[]>([]);
  const [showInsightButton, setShowInsightButton] = useState<boolean>(false);

  // Cargar insights
  const loadInsights = useCallback(async () => {
    if (!userId || !activityId || userId === undefined || activityId === undefined) {
      console.log('No se pueden cargar insights: userId o activityId no disponibles');
      return;
    }

    try {
      const fetchedInsights = await fetchInsightsFromService(userId, activityId);
      setInsights(fetchedInsights);
    } catch (error) {
      console.error('Error in loadInsights:', error);
    }
  }, [userId, activityId]);

  // Guardar un nuevo insight
  const saveInsight = useCallback(async (content: string) => {
    if (!userId || !activityId || userId === undefined || activityId === undefined) {
      console.log('No se puede guardar insight: userId o activityId no disponibles');
      return;
    }

    try {
      const newInsight = await saveInsightToService(userId, activityId, content);
      if (newInsight) {
        setInsights(prev => [...prev, newInsight]);
        // Ocultar el botón después de guardar
        setShowInsightButton(false);
        return newInsight;
      }
    } catch (error) {
      console.error('Error in saveInsight:', error);
    }
  }, [userId, activityId]);

  // Mostrar el botón de insight después de una respuesta de la IA
  const showInsightButtonAfterResponse = useCallback(() => {
    setShowInsightButton(true);
  }, []);

  // Cargar insights al iniciar
  useEffect(() => {
    if (userId && activityId) {
      loadInsights();
    }
  }, [userId, activityId, loadInsights]);

  return {
    insights,
    showInsightButton,
    saveInsight,
    loadInsights,
    showInsightButtonAfterResponse,
    hideInsightButton: () => setShowInsightButton(false)
  };
}
