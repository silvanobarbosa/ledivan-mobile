import { Stack } from "expo-router";
import { theme } from "../../lib/theme";

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.eggplant },
        headerTintColor: theme.white,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: theme.creme },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Início" }} />
      <Stack.Screen name="pacientes" options={{ title: "Pacientes" }} />
      <Stack.Screen name="agenda" options={{ title: "Agenda de hoje" }} />
      <Stack.Screen name="paciente/[id]" options={{ title: "Paciente" }} />
    </Stack>
  );
}
