import { supabase } from "@/lib/supabase";

export type Buddy = { userId: string; nickname: string };

export type ParticipantStatus = "pending" | "accepted" | "declined" | "cancelled";

export type Participant = {
  id: string;
  userId: string;
  nickname: string;
  status: ParticipantStatus;
};

export type ActivityMessage = {
  id: string;
  senderId: string;
  senderNickname: string;
  body: string;
  createdAt: string;
};

/** 내 수락된 버디(친구) 목록 — 임시 지킴이 선택용 */
export async function fetchMyBuddies(): Promise<Buddy[]> {
  if (!supabase) return [];
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from("buddy_requests")
    .select("requester_id, addressee_id, requester:profiles!requester_id(nickname), addressee:profiles!addressee_id(nickname)")
    .eq("status", "accepted");
  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => {
    const iAmRequester = r.requester_id === user.id;
    return {
      userId: iAmRequester ? r.addressee_id : r.requester_id,
      nickname: (iAmRequester ? r.addressee?.nickname : r.requester?.nickname) ?? "버디",
    };
  });
}

/** 활동에 참가신청 */
export async function applyToActivity(checkInId: string): Promise<void> {
  if (!supabase) return;
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");
  const { error } = await supabase
    .from("activity_participants")
    .insert({ check_in_id: checkInId, user_id: user.id });
  if (error) throw new Error(error.message);
}

/** 참가신청 취소 (내 신청) */
export async function cancelMyApplication(checkInId: string): Promise<void> {
  if (!supabase) return;
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  const { error } = await supabase
    .from("activity_participants")
    .delete()
    .eq("check_in_id", checkInId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

/** 활동 참가자 목록 (호스트·본인만 조회 가능 — RLS) */
export async function fetchParticipants(checkInId: string): Promise<Participant[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("activity_participants")
    .select("id, user_id, status, profiles!user_id(nickname)")
    .eq("check_in_id", checkInId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    nickname: r.profiles?.nickname ?? "회원",
    status: r.status,
  }));
}

export async function respondParticipant(
  id: string,
  status: "accepted" | "declined",
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("activity_participants").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** 활동 단체 채팅 메시지 */
export async function fetchActivityMessages(checkInId: string): Promise<ActivityMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("activity_messages")
    .select("id, sender_id, body, created_at, profiles!sender_id(nickname)")
    .eq("check_in_id", checkInId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    senderId: r.sender_id,
    senderNickname: r.profiles?.nickname ?? "회원",
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function sendActivityMessage(checkInId: string, body: string): Promise<void> {
  if (!supabase) return;
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");
  const { error } = await supabase
    .from("activity_messages")
    .insert({ check_in_id: checkInId, sender_id: user.id, body });
  if (error) throw new Error(error.message);
}
