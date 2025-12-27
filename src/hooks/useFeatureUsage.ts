import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from './useSubscription';

export type FeatureName = 
  | 'headhunting'
  | 'company_report'
  | 'interview_simulation'
  | 'question_variant'
  | 'writing_correction'
  | 'roleplay_speaking';

interface FeatureUsageState {
  canUse: boolean;
  cooldownSeconds: number;
  loading: boolean;
}

export const useFeatureUsage = (featureName: FeatureName) => {
  const { isPremium, loading: subscriptionLoading, user } = useSubscription();
  const [state, setState] = useState<FeatureUsageState>({
    canUse: false,
    cooldownSeconds: 0,
    loading: true,
  });

  const checkUsage = useCallback(async () => {
    if (!user) {
      setState({ canUse: false, cooldownSeconds: 0, loading: false });
      return;
    }

    // Premium users always can use
    if (isPremium) {
      setState({ canUse: true, cooldownSeconds: 0, loading: false });
      return;
    }

    try {
      // Check cooldown for free users
      const { data: cooldown, error } = await supabase.rpc('get_feature_cooldown', {
        _user_id: user.id,
        _feature_name: featureName,
      });

      if (error) {
        console.error('Error checking feature cooldown:', error);
        setState({ canUse: false, cooldownSeconds: 0, loading: false });
        return;
      }

      setState({
        canUse: cooldown === 0,
        cooldownSeconds: cooldown || 0,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking feature usage:', error);
      setState({ canUse: false, cooldownSeconds: 0, loading: false });
    }
  }, [user, isPremium, featureName]);

  useEffect(() => {
    if (!subscriptionLoading) {
      checkUsage();
    }
  }, [subscriptionLoading, checkUsage]);

  // Countdown timer for cooldown
  useEffect(() => {
    if (state.cooldownSeconds <= 0) return;

    const interval = setInterval(() => {
      setState(prev => {
        const newCooldown = prev.cooldownSeconds - 1;
        if (newCooldown <= 0) {
          return { ...prev, canUse: true, cooldownSeconds: 0 };
        }
        return { ...prev, cooldownSeconds: newCooldown };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.cooldownSeconds > 0]);

  const recordUsage = useCallback(async () => {
    if (!user || isPremium) return;

    try {
      const { error } = await supabase.rpc('record_feature_usage', {
        _user_id: user.id,
        _feature_name: featureName,
      });

      if (error) {
        console.error('Error recording feature usage:', error);
      }

      // Refresh usage state
      await checkUsage();
    } catch (error) {
      console.error('Error recording feature usage:', error);
    }
  }, [user, isPremium, featureName, checkUsage]);

  const formatCooldown = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`;
    }
    if (minutes > 0) {
      return `${minutes}분 ${secs}초`;
    }
    return `${secs}초`;
  };

  return {
    ...state,
    isPremium,
    recordUsage,
    refreshUsage: checkUsage,
    formattedCooldown: formatCooldown(state.cooldownSeconds),
  };
};
