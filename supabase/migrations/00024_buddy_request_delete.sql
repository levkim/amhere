-- 버디 요청 삭제 허용: 당사자가 '죽은' 요청(거절됨/취소됨)만 삭제할 수 있다.
-- 대기중(pending)·매칭성사(accepted)는 살아있는 요청이라 삭제 불가(채팅 보호).
-- messages 는 buddy_requests 를 on delete cascade 로 참조하므로 함께 정리된다.
create policy "buddy dead request delete" on buddy_requests
  for delete to authenticated
  using (
    (requester_id = auth.uid() or addressee_id = auth.uid())
    and status in ('declined', 'cancelled')
  );
