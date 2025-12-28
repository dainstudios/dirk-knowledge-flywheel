import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'creator' | 'contributor' | 'viewer';

const ROLE_HIERARCHY: AppRole[] = ['admin', 'creator', 'contributor', 'viewer'];

interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserWithRole extends Profile {
  role: AppRole;
}

export function useRoles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current user's role
  const { data: userRole, isLoading: roleLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_user_role', { _user_id: user!.id });
      if (error) throw error;
      return data as AppRole | null;
    },
    enabled: !!user,
  });

  // Check if user has specific role or higher in hierarchy
  const hasRole = (requiredRole: AppRole): boolean => {
    if (!userRole) return false;
    const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
    const requiredRoleIndex = ROLE_HIERARCHY.indexOf(requiredRole);
    return userRoleIndex <= requiredRoleIndex;
  };

  const isAdmin = userRole === 'admin';
  const canCreate = hasRole('creator');
  const canContribute = hasRole('contributor');
  const canView = hasRole('viewer');

  return {
    userRole,
    roleLoading,
    isAdmin,
    canCreate,
    canContribute,
    canView,
    hasRole,
  };
}

// Hook for admin to manage users
export function useUserManagement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Get all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRoleRecord = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          role: (userRoleRecord?.role as AppRole) || 'viewer',
        };
      });

      return usersWithRoles;
    },
    enabled: !!user,
  });

  // Update user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole, assigned_by: user?.id })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
    },
  });

  return {
    users,
    usersLoading,
    updateRole: updateRoleMutation.mutate,
    isUpdating: updateRoleMutation.isPending,
  };
}
