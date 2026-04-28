import { useAuth } from './useAuth';

export function useRole() {
  const { user } = useAuth();

  return {
    isAdmin:    user?.is_admin === true,
    isVerified: user?.is_verified === true,
    isActive:   user?.is_active === true,
    role:       user?.status ?? 'guest',
    can: (permission) => {
      const permissions = {
        viewDashboard:  user?.is_admin,
        viewAnalytics:  true,
        viewSettings:   true,
        viewProfile:    true,
        viewTasks:      true,
      };
      return permissions[permission] ?? false;
    }
  };
}