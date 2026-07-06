import { supabase } from "@/lib/supabase";
import type { Coords } from "@/stores/location";
import type {
  BuddyRequest,
  BuddyStatus,
  ChatMessage,
  NearbyUser,
  NewBuddyRequest,
} from "./types";
import {
  addMockMessage,
  addMockRequest,
  getMockMessages,
  getMockRequests,
  MOCK_NEARBY_USERS,
  setMockRequestStatus,
} from "./mock";

function haversineM(a: Coords, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export async function fetchNearbyUsers(coords: Coords): Promise<NearbyUser[]> {
  if (!supabase) return MOCK_NEARBY_USERS;

  const { data, error } = await supabase.rpc("nearby_users", {
    lat: coords.lat,
    lng: coords.lng,
    radius_m: 5000,
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    nickname: row.nickname,
    activity: row.activity,
    level: row.level,
    distanceM: haversineM(coords, { lat: row.lat, lng: row.lng }),
    isApproximate: row.is_approximate,
  }));
}

export async function fetchMyBuddyRequests(): Promise<BuddyRequest[]> {
  if (!supabase) return getMockRequests();

  const { data, error } = await supabase
    .from("buddy_requests")
    .select(
      "*, requester:profiles!requester_id(nickname), addressee:profiles!addressee_id(nickname)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    requesterId: row.requester_id,
    requesterNickname: row.requester?.nickname ?? "",
    addresseeId: row.addressee_id,
    addresseeNickname: row.addressee?.nickname ?? "",
    activity: row.activity,
    plannedDate: row.planned_date,
    region: row.region,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function sendBuddyRequest(input: NewBuddyRequest): Promise<void> {
  if (!supabase) {
    addMockRequest(input);
    return;
  }
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");

  const { error } = await supabase.from("buddy_requests").insert({
    requester_id: user.id,
    addressee_id: input.addresseeId,
    activity: input.activity,
    planned_date: input.plannedDate,
    region: input.region,
    message: input.message,
  });
  if (error) throw new Error(error.message);
}

export async function respondToRequest(id: string, status: BuddyStatus): Promise<void> {
  if (!supabase) {
    setMockRequestStatus(id, status);
    return;
  }
  const { error } = await supabase
    .from("buddy_requests")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchMessages(requestId: string): Promise<ChatMessage[]> {
  if (!supabase) return getMockMessages(requestId);

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  }));
}

export async function sendMessage(requestId: string, body: string): Promise<void> {
  if (!supabase) {
    addMockMessage(requestId, body);
    return;
  }
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("로그인이 필요해요.");

  const { error } = await supabase.from("messages").insert({
    request_id: requestId,
    sender_id: user.id,
    body,
  });
  if (error) throw new Error(error.message);
}
