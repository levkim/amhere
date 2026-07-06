# 0003. Expo SDK 54 고정

- 상태: 채택
- 날짜: 2026-07-06

## 배경

최신 템플릿은 SDK 57이었지만, 개발자 폰의 Expo Go 앱이 SDK 54까지만 지원해 실행이 불가능했다 ("Project is incompatible with this version of Expo Go").

## 결정

프로젝트를 SDK 54로 다운그레이드하고 package.json에 전체 버전을 고정(pin)했다. 기능 손실은 없었다 (사용하는 기능 전부 SDK 54에 존재).

## 대안

- **SDK 57 유지 + dev build로만 테스트**: 초기에 Expo Go의 빠른 반복 개발을 포기해야 해서 기각
- (현재는 dev build를 쓰므로, 필요해지면 SDK 업그레이드 가능)

## 결과

- Expo Go로 즉시 테스트 가능했음 (초기 개발 속도 확보)
- 감수: 최신 SDK 기능 사용 불가. **업그레이드 시 주의**: 버전이 고정돼 있으므로 `npx expo install --fix`로 일괄 정렬 필요
