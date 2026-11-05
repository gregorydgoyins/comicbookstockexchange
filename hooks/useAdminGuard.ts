import { useState, useEffect } from 'react';

export function useAdminGuard() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      setIsAdmin(
        typeof window !== 'undefined' &&
        (localStorage.getItem('pp_admin_mode') === 'true' || window.location.search.includes('admin=true'))
      );
    } catch {
      setIsAdmin(false);
    }
  }, []);

  return { isAdmin, isLoading: false };
}
