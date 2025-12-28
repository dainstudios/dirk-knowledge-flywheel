import { Header, MobileNav } from '@/components/common';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useUserManagement, type AppRole } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { Users, Shield, Pencil, Eye, Upload } from 'lucide-react';

const ROLE_CONFIG: Record<AppRole, { label: string; color: string; icon: typeof Shield; description: string }> = {
  admin: {
    label: 'Admin',
    color: 'bg-destructive/10 text-destructive border-destructive/20',
    icon: Shield,
    description: 'Full access, can manage users',
  },
  creator: {
    label: 'Creator',
    color: 'bg-primary/10 text-primary border-primary/20',
    icon: Pencil,
    description: 'Can create content for LinkedIn, Newsletter',
  },
  contributor: {
    label: 'Contributor',
    color: 'bg-success/10 text-success border-success/20',
    icon: Upload,
    description: 'Can capture content and manage pool',
  },
  viewer: {
    label: 'Viewer',
    color: 'bg-muted text-muted-foreground border-border',
    icon: Eye,
    description: 'Read-only access to knowledge base',
  },
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const { users, usersLoading, updateRole, isUpdating } = useUserManagement();
  const { toast } = useToast();

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    if (userId === currentUser?.id) {
      toast({
        title: 'Cannot change own role',
        description: "You cannot change your own role. Ask another admin to do it.",
        variant: 'destructive',
      });
      return;
    }

    updateRole(
      { userId, newRole },
      {
        onSuccess: () => {
          toast({
            title: 'Role updated',
            description: `User role has been changed to ${ROLE_CONFIG[newRole].label}.`,
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to update role',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <MobileNav />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage user roles and permissions
            </p>
          </div>
        </div>

        {/* Role Legend */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(ROLE_CONFIG) as AppRole[]).map((role) => {
                const config = ROLE_CONFIG[role];
                const Icon = config.icon;
                return (
                  <div key={role} className="flex items-start gap-2">
                    <Badge variant="outline" className={`${config.color} shrink-0`}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{config.description}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
            <CardDescription>
              {users?.length || 0} registered user{users?.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                    <Skeleton className="h-9 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {users?.map((u) => {
                  const config = ROLE_CONFIG[u.role];
                  const isCurrentUser = u.id === currentUser?.id;

                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between py-3 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-foreground">
                            {(u.display_name || u.email)?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {u.display_name || 'No name'}
                            {isCurrentUser && (
                              <span className="text-xs text-muted-foreground ml-2">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>

                      <Select
                        value={u.role}
                        onValueChange={(value: AppRole) => handleRoleChange(u.id, value)}
                        disabled={isUpdating || isCurrentUser}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue>
                            <Badge variant="outline" className={config.color}>
                              {config.label}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(ROLE_CONFIG) as AppRole[]).map((role) => (
                            <SelectItem key={role} value={role}>
                              <Badge variant="outline" className={ROLE_CONFIG[role].color}>
                                {ROLE_CONFIG[role].label}
                              </Badge>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
