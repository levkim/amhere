import { supabase } from "@/lib/supabase";
import type { Activity } from "@/theme/tokens";

export type JoinMode = "open" | "approval";
export type MemberStatus = "pending" | "accepted" | "declined" | "cancelled" | null;

export type Crew = {
  id: string;
  name: string;
  description: string | null;
  activity: Activity | null;
  region: string | null;
  emoji: string;
  joinMode: JoinMode;
  ownerId: string;
  memberCount: number;
  myStatus: MemberStatus;
};

export type CrewMember = {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  role: "owner" | "member";
  status: "pending" | "accepted";
};

export type CrewMessage = {
  id: string;
  senderId: string;
  senderNickname: string;
  body: string;
  createdAt: string;
};

const DEMO_CREWS: Crew[] = [
  {
    id: "demo-crew-1",
    name: "용평 주말 라이더스",
    description: "매주 토요일 오전 용평에서 같이 타요. 초보 환영!",
    activity: "ski",
    region: "용평",
    emoji: "⛷️",
    joinMode: "open",
    ownerId: "u1",
    memberCount: 12,
    myStatus: null,
  },
];

export async function fetchCrews(): Promise<Crew[]> {
  if (!supabase) return DEMO_CREWS;
  const { data, error } = await supabase.rpc("list_crews");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    activity: r.activity,
    region: r.region,
    emoji: r.emoji ?? "🏔️",
    joinMode: r.join_mode === "approval" ? "approval" : "open",
    ownerId: r.owner_id,
    memberCount: Number(r.member_count ?? 0),
    myStatus: (r.my_status as MemberStatus) ?? null,
  }));
}

export async function createCrew(input: {
  name: string;
  description: string | null;
  activity: Activity | null;
  region: string | null;
  emoji: string;
  joinMode: JoinMode;
}): Promise<string> {
  if (!supabase) throw new Error("데모 모드에서는 크루를 만들 수 없어요.");
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");

  const { data, error } = await supabase
    .from("crews")
    .insert({
      name: input.name,
      description: input.description,
      activity: input.activity,
      region: input.region,
      emoji: input.emoji,
      join_mode: input.joinMode,
      owner_id: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: memberError } = await supabase
    .from("crew_members")
    .insert({ crew_id: data.id, user_id: user.id, role: "owner", status: "accepted" });
  if (memberError) throw new Error(memberError.message);

  return data.id;
}

export async function fetchCrewMembers(crewId: string): Promise<CrewMember[]> {
  if (!supabase) {
    return [
      { userId: "u1", nickname: "크루민재", avatarUrl: null, role: "owner", status: "accepted" },
      { userId: "u2", nickname: "산타는수진", avatarUrl: null, role: "member", status: "accepted" },
    ];
  }
  const { data, error } = await supabase
    .from("crew_members")
    .select("user_id, role, status, profiles!user_id(nickname, avatar_url)")
    .eq("crew_id", crewId)
    .in("status", ["pending", "accepted"])
    .order("joined_at");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    userId: r.user_id,
    nickname: r.profiles?.nickname ?? "회원",
    avatarUrl: r.profiles?.avatar_url ?? null,
    role: r.role,
    status: r.status,
  }));
}

/** 가입 (open → 즉시, approval → 신청) */
export async function joinCrew(crewId: string, joinMode: JoinMode): Promise<void> {
  if (!supabase) return;
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");
  const { error } = await supabase.from("crew_members").insert({
    crew_id: crewId,
    user_id: user.id,
    role: "member",
    status: joinMode === "open" ? "accepted" : "pending",
  });
  if (error) throw new Error(error.message);
}

export async function leaveCrew(crewId: string): Promise<void> {
  if (!supabase) return;
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return;
  const { error } = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

/** 크루장이 멤버 내보내기 (RLS: 크루장만, owner 행은 불가) */
export async function kickCrewMember(crewId: string, userId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("crew_members")
    .delete()
    .eq("crew_id", crewId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/** 크루 폭파 — 서버 트리거가 '크루장 외 멤버 없음'을 강제 (00025) */
export async function disbandCrew(crewId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("crews").delete().eq("id", crewId);
  if (error) throw new Error(error.message);
}

export async function respondCrewMember(
  crewId: string,
  userId: string,
  status: "accepted" | "declined",
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("crew_members")
    .update({ status })
    .eq("crew_id", crewId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function fetchCrewMessages(crewId: string): Promise<CrewMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("crew_messages")
    .select("id, sender_id, body, created_at, profiles!sender_id(nickname)")
    .eq("crew_id", crewId)
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

export async function sendCrewMessage(crewId: string, body: string): Promise<void> {
  if (!supabase) throw new Error("데모 모드에서는 채팅을 보낼 수 없어요.");
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");
  const { error } = await supabase
    .from("crew_messages")
    .insert({ crew_id: crewId, sender_id: user.id, body });
  if (error) throw new Error(error.message);
}

export type CrewPost = {
  id: string;
  authorId: string;
  nickname: string;
  avatarUrl: string | null;
  body: string;
  imageUrl: string | null;
  tags: string[];
  activity: Activity | null;
  placeName: string | null;
  createdAt: string;
  checkInId: string | null;
};

/** 크루 활동 피드 (크루원만) */
export async function fetchCrewPosts(crewId: string): Promise<CrewPost[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("crew_posts", { cid: crewId });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    authorId: r.author_id,
    nickname: r.nickname,
    avatarUrl: r.avatar_url,
    body: r.body,
    imageUrl: r.image_url,
    tags: r.tags ?? [],
    activity: r.activity,
    placeName: r.place_name,
    createdAt: r.created_at,
    checkInId: r.check_in_id,
  }));
}

/** 크루 활동으로 공유할 수 있는, 내가 가입한 크루 목록 (선택기용) */
export async function fetchMyJoinedCrews(): Promise<{ id: string; name: string; emoji: string }[]> {
  const crews = await fetchCrews();
  return crews
    .filter((c) => c.myStatus === "accepted")
    .map((c) => ({ id: c.id, name: c.name, emoji: c.emoji }));
}
