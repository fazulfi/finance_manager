import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { useColorScheme } from "nativewind";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

interface TabIconProps {
  name: IoniconName;
  color: string;
  size: number;
}

function TabIcon({ name, color, size }: TabIconProps): React.JSX.Element {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout(): React.JSX.Element {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const tabBarBg = isDark ? "#1E293B" : "#FFFFFF";
  const tabBarBorder = isDark ? "#334155" : "#E2E8F0";
  const activeColor = "#6366f1";
  const inactiveColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: tabBarBg,
          borderTopColor: tabBarBorder,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="swap-horizontal-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="pie-chart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
