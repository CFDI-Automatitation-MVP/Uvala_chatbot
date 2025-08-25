"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  image?: string;
};

type Session = {
  user: SessionUser;
};

export function useSession() {
  const [session, setSession] = useState<{ data: Session | null }>({ data: null });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession({
        data: session ? {
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email,
            image: session.user.user_metadata?.avatar_url,
          }
        } : null
      });
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession({
        data: session ? {
          user: {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email,
            image: session.user.user_metadata?.avatar_url,
          }
        } : null
      });
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { data: session.data, isLoading };
}