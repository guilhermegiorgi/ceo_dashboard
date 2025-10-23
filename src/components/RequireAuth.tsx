'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type RequireAuthProps = {
  children: ReactNode;
};

const RequireAuth = ({ children }: RequireAuthProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      const params = new URLSearchParams();
      params.set('redirect', `${pathname}${searchParams.size ? `?${searchParams}` : ''}`);
      router.replace(`/login?${params.toString()}`);
      return;
    }
    setIsAuthorized(true);
  }, [pathname, router, searchParams]);

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

export default RequireAuth;

