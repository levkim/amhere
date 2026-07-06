import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useMyBuddyRequests, useMyUserId } from "@/features/matching/hooks";
import { colors } from "@/theme/tokens";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  // 받은 요청 중 대기 중인 것 → 버디 탭 배지
  const myId = useMyUserId();
  const { data: requests } = useMyBuddyRequests();
  const pendingCount =
    requests?.filter((r) => r.addresseeId === myId && r.status === "pending").length ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtext,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "지도",
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: "피드",
          tabBarIcon: ({ focused }) => <TabIcon emoji="📍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="buddies"
        options={{
          title: "버디",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🤝" focused={focused} />,
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.text },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: ({ focused }) => <TabIcon emoji="⛰️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
