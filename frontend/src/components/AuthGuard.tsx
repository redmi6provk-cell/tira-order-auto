'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/libs/api';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            // Skip check for login page
            if (pathname === '/login') {
                setIsChecking(false);
                return;
            }

            if (!api.auth.isAuthenticated()) {
                router.push('/login');
                return;
            }

            try {
                // Verify token with backend
                await api.auth.getMe();
                setIsAuthorized(true);
            } catch (err) {
                console.error("Auth verification failed", err);
                router.push('/login');
            } finally {
                setIsChecking(false);
            }
        };

        checkAuth();
    }, [pathname, router]);

    if (isChecking && pathname !== '/login') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0a0a16]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
                    <p className="text-white/40 font-mono text-xs tracking-widest uppercase">Verifying Authorization...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
