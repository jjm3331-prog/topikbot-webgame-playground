-- Create function to handle new user welcome notification and premium subscription
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert welcome notification
  INSERT INTO public.notifications (
    title,
    message,
    type,
    is_global,
    target_user_id
  ) VALUES (
    '🎉 환영합니다! Welcome!',
    '안녕하세요! :) LUKATO AI 한국본사 TOPIKBOT Team 입니다.

첫 회원가입을 축하드리며 1개월 동안 자유롭게 모든 프리미엄 기능을 사용하실 수 있도록 Premium 권한을 부여해드렸습니다.

마음껏 활용해보세요 :)

감사합니다.

---

Hello! :)

This is the TOPIKBOT Team at LUKATO AI HQ.

Congratulations on signing up! To celebrate your registration, we have upgraded your account to Premium. You now have full, free access to all premium features for the next month.

Please feel free to make the most of it! :)

Thank you.',
    'success',
    false,
    NEW.id
  );

  -- Grant 1 month premium subscription
  INSERT INTO public.user_subscriptions (
    user_id,
    plan,
    started_at,
    expires_at
  ) VALUES (
    NEW.id,
    'premium',
    now(),
    now() + INTERVAL '1 month'
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new user welcome
DROP TRIGGER IF EXISTS on_auth_user_welcome ON auth.users;
CREATE TRIGGER on_auth_user_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_welcome();