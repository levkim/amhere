// Google 로그인 (네이티브) — Google ID 토큰을 받아 Supabase 세션으로 교환한다.
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID가 없으면 버튼 자체가 숨겨진다(설정 전 안전).
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { supabase } from "@/lib/supabase";

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export const googleSignInAvailable = !!webClientId && !!supabase;

/** Google 로그인. 사용자가 창을 닫으면 false, 성공하면 true */
export async function signInWithGoogle(): Promise<boolean> {
  if (!supabase || !webClientId) throw new Error("Google 로그인이 아직 설정되지 않았어요.");

  GoogleSignin.configure({ webClientId });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const res = await GoogleSignin.signIn();
  if (res.type === "cancelled") return false; // 사용자가 취소 — 조용히 복귀

  const idToken = res.data?.idToken;
  if (!idToken) throw new Error("Google 인증 토큰을 받지 못했어요. 다시 시도해 주세요.");

  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  if (error) throw new Error(error.message);
  return true;
}
