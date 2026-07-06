import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// 웹 정적 렌더링(Node)에는 window가 없다 — 세션 저장을 시도하면 크래시하므로
// 서버 렌더 중에는 세션 영속화를 끈다. 실제 브라우저/네이티브에서만 켜진다.
const isServerRender = Platform.OS === "web" && typeof window === "undefined";

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          // 네이티브는 AsyncStorage, 웹 브라우저는 supabase 기본(localStorage)
          ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
          autoRefreshToken: !isServerRender,
          persistSession: !isServerRender,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isDemoMode = supabase === null;
