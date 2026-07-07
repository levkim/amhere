# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.
This project is pinned to **Expo SDK 54** (see docs/adr/0003) — do not upgrade without explicit user approval.

# 기능 개발 요청 처리 원칙 (사용자 지시, 2026-07-07 — 항상 적용)

사용자가 기능 개발·수정을 요청하면 **반드시 이 순서로** 진행한다:

1. **벤치마킹**: 세계 최고 수준의 위치기반 SNS·아웃도어 앱(Instagram, Strava, Zenly, AllTrails, Uber, Meetup 등)에서 해당 기능의 검증된 인터페이스를 조사하고, 그 장점을 흡수해 **더 나은 안**을 설계한다. 단순 요구사항 구현이 아니라 UX 전문가 수준으로 상태·엣지케이스·동작 규칙까지 고민한다.
2. **선(先)보고**: 구현 전에 설계안(벤치마크 근거 + 화면 구성 + 동작 규칙 + 열린 질문)을 사용자에게 보고한다.
3. **승인 후 구현**: 사용자 승인을 받은 뒤에만 코드를 작성한다.

# ADR (Architecture Decision Records)

Significant technical decisions MUST be recorded in `docs/adr/` — see [docs/adr/README.md](docs/adr/README.md) for the template and rules.

- Record when: choosing a technology/library, defining a hard-to-reverse structure, or deciding NOT to do something.
- Do it in the same session the decision is made, without being asked. Number sequentially, keep to one page, update the index table in README.md.
- If a decision reverses an earlier ADR, mark the old one `대체됨 (→ NNNN)` instead of deleting it.
- Write ADRs in Korean (the user's language).
