import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Loader2, CheckCircle, XCircle, UserPlus, Save, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface UserProfile {
  id: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  programs?: {
    id: string;
    name: string;
  }[];
}

interface Program {
  id: string;
  name: string;
}

const UserManager: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Cargar usuarios y programas
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Cargar usuarios con sus emails
        const { data: usersData, error: usersError } = await supabase
          .rpc('get_users_with_emails');

        if (usersError) throw usersError;
        
        // Cargar programas
        const { data: programsData, error: programsError } = await supabase
          .from('programs')
          .select('id, name')
          .order('name');

        if (programsError) throw programsError;

        // Formatear datos de usuarios
        const formattedUsers = (usersData || []).map((user: any) => ({
          id: user.id,
          email: user.email || 'Sin correo',
          is_admin: user.is_admin,
          created_at: user.created_at,
          programs: []
        }));

        // Cargar inscripciones a programas para cada usuario
        for (const user of formattedUsers) {
          try {
            const { data: enrollments, error: enrollmentsError } = await supabase
              .rpc('get_user_programs', { p_user_id: user.id });
            
            if (!enrollmentsError && enrollments) {
              user.programs = enrollments.map((enrollment: any) => ({
                id: enrollment.program_id,
                name: enrollment.program_name
              }));
            }
          } catch (err) {
            console.error(`Error al cargar programas para usuario ${user.id}:`, err);
            // Continuamos con el siguiente usuario
          }
        }

        setUsers(formattedUsers);
        setPrograms(programsData || []);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos. Por favor, inténtalo de nuevo.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Cambiar rol de administrador
  const toggleAdminStatus = async (userId: string, isAdmin: boolean) => {
    try {
      setProcessingAction(true);
      
      // Verificar que no sea el último administrador
      if (!isAdmin) {
        const adminUsers = users.filter(u => u.is_admin && u.id !== userId);
        if (adminUsers.length === 0) {
          setError('No se puede quitar el rol de administrador al último administrador del sistema.');
          setProcessingAction(false);
          return;
        }
      }
      
      // Actualizar rol de administrador
      const { error } = await supabase.rpc('set_user_admin', {
        user_id: userId,
        admin_status: isAdmin
      });

      if (error) throw error;

      // Actualizar lista de usuarios
      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_admin: isAdmin } : u
      ));
      
      setSuccess(`Rol de usuario actualizado exitosamente.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al cambiar rol de administrador:', err);
      setError('Error al cambiar el rol de administrador. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId: string) => {
    // Verificar que no sea el último administrador
    const adminUsers = users.filter(u => u.is_admin);
    const isLastAdmin = adminUsers.length === 1 && adminUsers[0].id === userId;
    
    if (isLastAdmin) {
      setError('No puedes eliminar el último administrador del sistema.');
      return;
    }
    
    if (window.confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      try {
        setProcessingAction(true);
        
        const { error } = await supabase.rpc('delete_user_with_enrollments', {
          target_user_id: userId
        });
        
        if (error) throw error;
        
        setUsers(users.filter(u => u.id !== userId));
        setSuccess('Usuario eliminado exitosamente.');
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        console.error('Error al eliminar usuario:', err);
        setError('Error al eliminar el usuario. Por favor, inténtalo de nuevo.');
      } finally {
        setProcessingAction(false);
      }
    }
  };

  // Añadir nuevo usuario
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      setError('El correo y la contraseña son obligatorios.');
      return;
    }

    try {
      setProcessingAction(true);
      
      // Crear nuevo usuario
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true
      });

      if (error) throw error;
      
      if (data.user) {
        // Asignar rol de administrador si es necesario
        if (newUserIsAdmin) {
          await supabase.rpc('set_user_admin', {
            user_id: data.user.id,
            admin_status: true
          });
        }
        
        // Añadir a la lista de usuarios
        const newUser: UserProfile = {
          id: data.user.id,
          email: data.user.email || newUserEmail,
          is_admin: newUserIsAdmin,
          created_at: new Date().toISOString(),
          programs: []
        };
        
        setUsers([newUser, ...users]);
        setShowAddUserModal(false);
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserIsAdmin(false);
        setSuccess('Usuario creado exitosamente.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Error al crear usuario:', err);
      setError('Error al crear el usuario. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Asignar programas a un usuario
  const handleAssignPrograms = async () => {
    if (!editingUser) return;
    
    try {
      setProcessingAction(true);
      
      // Obtener programas actuales del usuario
      const currentProgramIds = editingUser.programs?.map(p => p.id) || [];
      
      // Programas a añadir (están en selectedPrograms pero no en currentProgramIds)
      const programsToAdd = selectedPrograms.filter(id => !currentProgramIds.includes(id));
      
      // Programas a eliminar (están en currentProgramIds pero no en selectedPrograms)
      const programsToRemove = currentProgramIds.filter(id => !selectedPrograms.includes(id));
      
      // Añadir nuevos programas
      for (const programId of programsToAdd) {
        const { error } = await supabase.rpc('enroll_user_in_program', {
          p_user_id: editingUser.id,
          p_program_id: programId
        });
        
        if (error) throw error;
      }
      
      // Eliminar programas
      for (const programId of programsToRemove) {
        const { error } = await supabase.rpc('unenroll_user_from_program', {
          p_user_id: editingUser.id,
          p_program_id: programId
        });
        
        if (error) throw error;
      }
      
      // Actualizar la lista de usuarios con los nuevos programas
      const updatedUsers = users.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            programs: programs
              .filter(p => selectedPrograms.includes(p.id))
              .map(p => ({ id: p.id, name: p.name }))
          };
        }
        return u;
      });
      
      setUsers(updatedUsers);
      setEditingUser(null);
      setSelectedPrograms([]);
      setSuccess('Programas asignados exitosamente.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error al asignar programas:', err);
      setError('Error al asignar programas. Por favor, inténtalo de nuevo.');
    } finally {
      setProcessingAction(false);
    }
  };

  // Iniciar edición de usuario
  const startEditingUser = (user: UserProfile) => {
    setEditingUser(user);
    setSelectedPrograms(user.programs?.map(p => p.id) || []);
  };

  // Cancelar edición
  const cancelEditing = () => {
    setEditingUser(null);
    setSelectedPrograms([]);
  };

  // Manejar selección de programas
  const handleProgramSelection = (programId: string) => {
    if (selectedPrograms.includes(programId)) {
      setSelectedPrograms(selectedPrograms.filter(id => id !== programId));
    } else {
      setSelectedPrograms([...selectedPrograms, programId]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Cargando usuarios...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensajes de error y éxito */}
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {success && (
        <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Botón para añadir usuario */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowAddUserModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
          disabled={processingAction}
        >
          <UserPlus size={16} className="mr-2" />
          Añadir Usuario
        </button>
      </div>
      
      {/* Tabla de usuarios */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programas</th>
              <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map(user => (
              <tr key={user.id} className={cn(
                "hover:bg-gray-50",
                user.id === currentUser?.id ? "bg-blue-50" : ""
              )}>
                <td className="py-4 px-4 text-sm text-gray-900">
                  {user.email}
                  {user.id === currentUser?.id && (
                    <span className="ml-2 text-xs text-blue-600">(Tú)</span>
                  )}
                </td>
                <td className="py-4 px-4 text-sm">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    user.is_admin 
                      ? "bg-purple-100 text-purple-800" 
                      : "bg-gray-100 text-gray-800"
                  )}>
                    {user.is_admin ? 'Administrador' : 'Usuario'}
                  </span>
                </td>
                <td className="py-4 px-4 text-sm text-gray-900">
                  {user.programs && user.programs.length > 0 
                    ? user.programs.map(p => p.name).join(', ')
                    : <span className="text-gray-400">Sin programas asignados</span>
                  }
                </td>
                <td className="py-4 px-4 text-sm text-gray-900">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => toggleAdminStatus(user.id, !user.is_admin)}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        user.is_admin
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      )}
                      disabled={processingAction || user.id === currentUser?.id}
                    >
                      {user.is_admin ? 'Quitar Admin' : 'Hacer Admin'}
                    </button>
                    
                    <button 
                      onClick={() => startEditingUser(user)}
                      className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                      disabled={processingAction}
                    >
                      Programas
                    </button>
                    
                    {user.id !== currentUser?.id && (
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                        disabled={processingAction}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 px-4 text-sm text-gray-500 text-center">
                  No hay usuarios para mostrar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Modal para editar programas de usuario */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">
                Asignar Programas a {editingUser.email}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Selecciona los programas a los que este usuario tendrá acceso:
                </p>
                
                <div className="max-h-60 overflow-y-auto border rounded p-2">
                  {programs.length > 0 ? (
                    programs.map(program => (
                      <div key={program.id} className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id={`program-${program.id}`}
                          checked={selectedPrograms.includes(program.id)}
                          onChange={() => handleProgramSelection(program.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <label htmlFor={`program-${program.id}`} className="ml-2 text-sm text-gray-700">
                          {program.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 p-2">No hay programas disponibles</p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={cancelEditing}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={processingAction}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAssignPrograms}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  disabled={processingAction}
                >
                  {processingAction ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para añadir usuario */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">
                Añadir Nuevo Usuario
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Contraseña"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is-admin"
                    checked={newUserIsAdmin}
                    onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="is-admin" className="ml-2 text-sm text-gray-700">
                    Asignar rol de Administrador
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  onClick={() => {
                    setShowAddUserModal(false);
                    setNewUserEmail('');
                    setNewUserPassword('');
                    setNewUserIsAdmin(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  disabled={processingAction}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                  disabled={processingAction || !newUserEmail || !newUserPassword}
                >
                  {processingAction ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} className="mr-2" />
                      Crear Usuario
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
