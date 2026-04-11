import { SafeAreaView } from "react-native";
import { Text } from "react-native";

export default function BudgetScreen(): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background">
      <Text className="text-2xl font-semibold text-foreground">Budget</Text>
    </SafeAreaView>
  );
}
