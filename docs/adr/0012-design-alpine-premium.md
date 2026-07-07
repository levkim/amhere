# 0012. 비주얼 시스템: Alpine Premium

- 상태: 채택
- 날짜: 2026-07-07

## 배경

기능은 MVP를 넘어섰지만 비주얼이 밋밋해 세계 톱 앱과의 격차가 '손맛/디자인'에서 벌어졌다. 사용자가 디자인 대전환을 요청, 무드로 Alpine Premium을 선택.

## 결정

"해질녘 산의 시네마틱 다크" 디자인 시스템을 theme/tokens.ts에 정의하고, 공유 컴포넌트(Button/Card/Tag/EmptyState/Avatar)를 통해 전 화면에 전파.

- 색: 더 깊은 다크(#0B1120) + 층(surface/High/Higher) + 시그니처 액센트(틸그린 #2DD4A7, 앰버 #FBBF24), 코랄레드 danger(#F87171).
- 타이포: Strava급 굵은 위계 + 카운트다운용 초대형(hero/display).
- 형태·모션: 라운드 상향, 부드러운 그림자(shadow 토큰), 버튼 눌림 스프링, 안전 카운트다운 원형 링, 아바타 액센트 링.
- **OTA 제약 준수**: 새 네이티브 모듈(svg/gradient) 없이 색·레이아웃·RN Animated만 사용 → 재빌드 없이 배포.

## 대안

- 생동·플레이풀(Zenly), 대담·스포티(Strava): 후보였으나 아웃도어+안전+고급 정체성에 Alpine Premium이 최적.
- react-native-svg 링/그라데이션: 네이티브 모듈이라 OTA 불가 — View 기반으로 대체.

## 결과

- 토큰·공유 컴포넌트 교체만으로 전 화면 일괄 상향. OTA로 즉시 배포.
- 감수: 진짜 원형 arc 진행률 애니메이션은 svg 없이 생략(정적 링 + 큰 숫자). 추후 dev build 시 고도화 가능.
