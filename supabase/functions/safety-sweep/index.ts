// safety-sweep: 체크아웃 시간 초과 판정 (서버 기준 — 클라이언트 타이머 신뢰 금지)
// 스케줄: Supabase Dashboard > Integrations > Cron 에서 5분 간격으로 이 함수 호출
//   select cron.schedule('safety-sweep', '*/5 * * * *', $$
//     select net.http_post(
//       url := '<PROJECT_URL>/functions/v1/safety-sweep',
//       headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
//     ) $$);

import { createClient } from "npm:@supabase/supabase-js@2";

const GRACE_MINUTES = 15; // 무신호 지역 하산 지연 등을 고려한 유예 시간

Deno.serve(async (req) => {
  // cron 이외의 무단 호출 차단
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();

  const { data: overdue, error } = await supabase
    .from("check_ins")
    .select(
      "id, user_id, expected_end_at, last_location, last_location_at, " +
        "profiles(nickname), emergency_contacts(name, phone)",
    )
    .eq("status", "active")
    .lt("expected_end_at", cutoff);

  if (error) {
    console.error("sweep query failed", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let alerted = 0;
  for (const checkIn of overdue ?? []) {
    // 1) 상태 전환 (동시 실행 대비 active → alerted 조건부 갱신)
    const { data: updated } = await supabase
      .from("check_ins")
      .update({ status: "alerted" })
      .eq("id", checkIn.id)
      .eq("status", "active")
      .select("id");
    if (!updated?.length) continue;

    // 2) 알림 발송
    // MVP: 사용자 본인 기기에 푸시 ("체크아웃을 잊으셨나요?")
    // TODO(v1): 비상연락처 SMS 발송 (Twilio/알리고 등) — checkIn.emergency_contacts.phone 사용,
    //           본문에 마지막 수신 위치(checkIn.last_location)와 시각 포함
    console.log(
      `ALERT check_in=${checkIn.id} user=${checkIn.user_id} ` +
        `last_location_at=${checkIn.last_location_at}`,
    );
    alerted++;
  }

  return new Response(JSON.stringify({ scanned: overdue?.length ?? 0, alerted }), {
    headers: { "Content-Type": "application/json" },
  });
});
