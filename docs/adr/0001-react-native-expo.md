# 0001. 크로스플랫폼: React Native + Expo

- 상태: 채택
- 날짜: 2026-07-06

## 배경

안드로이드와 iOS 두 플랫폼을 모두 지원해야 하는데, 개발 인력은 1인이고 개발 PC는 Windows다. iOS 네이티브 개발은 원래 Mac + Xcode가 필수다.

## 결정

React Native + Expo (TypeScript) 단일 코드베이스로 개발한다. iOS 빌드는 EAS Build(클라우드)로 처리해 Mac 없이 앱스토어 제출까지 가능하게 한다.

## 대안

- **네이티브 2벌 (Swift + Kotlin)**: 성능 최고지만 개발/유지보수 2배 — 1인 팀에 불가
- **Flutter**: 우수하지만 iOS 빌드에 사실상 Mac 필요, 지도/위치 생태계가 RN보다 얇음
- **KMP**: UI는 결국 2벌 — 소규모 팀에 부담

## 결과

- Windows에서 전 플랫폼 개발 가능, OTA 업데이트(EAS Update)로 심사 없이 JS 수정 배포 가능
- 감수: 초고성능 그래픽/AR은 한계, 네이티브 모듈 추가 시 재빌드 필요
