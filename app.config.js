// app.config.js — app.json을 JS로 바꿔 환경변수(Mapbox 다운로드 토큰)를 읽게 한다.
// 빌드 시 process.env.MAPBOX_DOWNLOAD_TOKEN 값을 @rnmapbox/maps 플러그인에 전달한다.

const { existsSync } = require("fs");

// Firebase 설정 파일(푸시 알림용)이 있으면 포함 — 없어도 앱은 정상 동작
const googleServices = existsSync("./google-services.json")
  ? { googleServicesFile: "./google-services.json" }
  : {};

export default {
  expo: {
    name: "Amhere",
    slug: "amhere",
    owner: "levkim",
    version: "0.1.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "amhere",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.amhere.app",
      infoPlist: {
        UIBackgroundModes: ["location"],
      },
    },
    android: {
      package: "com.amhere.app",
      ...googleServices,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    // OTA 업데이트 (EAS Update): 재빌드 없이 JS 변경분을 배포
    updates: {
      url: "https://u.expo.dev/97893b21-532e-4079-b936-16e4755369b1",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    plugins: [
      "@react-native-community/datetimepicker",
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0F1B2D",
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "주변의 활동자와 실시간 피드를 보여주기 위해 위치 정보가 필요합니다.",
          locationAlwaysAndWhenInUsePermission:
            "안전 체크인이 켜져 있는 동안 마지막 위치를 기록해 비상시 알림을 보내기 위해 백그라운드 위치 정보가 필요합니다.",
          isAndroidBackgroundLocationEnabled: true,
        },
      ],
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission: "포스트에 첨부할 사진을 선택하기 위해 사진 접근 권한이 필요합니다.",
        },
      ],
      [
        "@rnmapbox/maps",
        {
          // 빌드 시 Mapbox 네이티브 SDK를 내려받는 비밀 토큰 (sk...) — 앱 번들에는 포함되지 않음
          RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: "97893b21-532e-4079-b936-16e4755369b1",
      },
    },
  },
};
