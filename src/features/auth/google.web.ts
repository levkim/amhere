// 웹 폴백 — 네이티브 Google SDK는 웹 번들에 포함될 수 없어 비활성 스텁을 둔다.
export const googleSignInAvailable = false;

export async function signInWithGoogle(): Promise<boolean> {
  throw new Error("Google 로그인은 앱에서만 지원돼요.");
}
