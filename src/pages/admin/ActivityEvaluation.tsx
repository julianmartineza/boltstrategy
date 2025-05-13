import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';
import ActivityEvaluationManager from '../../components/admin/content-manager/ActivityEvaluationManager';
import AdminLayout from '../../components/layouts/AdminLayout';

const ActivityEvaluation: React.FC = () => {
  const { user, isAdmin } = useAuthStore();
  
  // Verificar si el usuario está autenticado y es administrador
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }
  
  return (
    <AdminLayout>
      <ActivityEvaluationManager />
    </AdminLayout>
  );
};

export default ActivityEvaluation;
