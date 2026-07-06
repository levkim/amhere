import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";

export const REPORT_REASONS = [
  "스팸/광고",
  "괴롭힘/폭언",
  "부적절한 위치 공유",
  "사칭",
  "기타",
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export async function reportUser(
  targetUserId: string,
  reason: ReportReason,
  postId?: string,
): Promise<void> {
  if (!supabase) return; // 데모 모드
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_user_id: targetUserId,
    target_post_id: postId ?? null,
    reason,
  });
  if (error) throw new Error(error.message);
}

export async function blockUser(targetUserId: string): Promise<void> {
  if (!supabase) return; // 데모 모드
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");

  const { error } = await supabase
    .from("blocks")
    .insert({ blocker_id: user.id, blocked_id: targetUserId });
  if (error) throw new Error(error.message);

  // 차단하면 피드·주변 사용자에서 즉시 사라지도록 갱신
  queryClient.invalidateQueries({ queryKey: ["feed"] });
  queryClient.invalidateQueries({ queryKey: ["nearby-users"] });
}
