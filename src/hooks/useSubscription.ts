import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SubscriptionPlan = 'free' | 'plus' | 'premium';

interface Subscription {
  plan: SubscriptionPlan;
  expiresAt: string | null;
  isActive: boolean;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchSubscription = async (userId: string) => {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
      }

      if (data) {
        const isActive = !data.expires_at || new Date(data.expires_at) > new Date();
        setSubscription({
          plan: data.plan as SubscriptionPlan,
          expiresAt: data.expires_at,
          isActive,
        });
      } else {
        // Default to free plan
        setSubscription({
          plan: 'free',
          expiresAt: null,
          isActive: true,
        });
      }
      setLoading(false);
    };

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSubscription(session.user.id);
      } else {
        setSubscription(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchSubscription(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  const isPremium = subscription?.plan === 'premium' && subscription?.isActive;
  const isPlus = (subscription?.plan === 'plus' || subscription?.plan === 'premium') && subscription?.isActive;
  const isFree = subscription?.plan === 'free' || !subscription?.isActive;

  return {
    subscription,
    loading,
    user,
    isPremium,
    isPlus,
    isFree,
  };
};
