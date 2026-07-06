import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 피드/주변 데이터는 30초까지 신선한 것으로 취급
      retry: 2,
      // 산악 지역 네트워크 대비: 실패해도 캐시를 유지해 마지막 데이터를 보여준다
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});
