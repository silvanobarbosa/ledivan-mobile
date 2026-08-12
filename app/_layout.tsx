import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "../lib/auth";
import { View, ActivityIndicator } from "react-native";
import { theme } from "../lib/theme";

/**
 * Guard de navegação (padrão oficial do expo-router 57: Stack.Protected).
 *
 * Em vez de uma tela-porteiro que faz router.replace (que causava "bounce" ao re-render da
 * sessão nos apps da casa), declaramos QUAIS telas aparecem por guard. O expo-router mostra só
 * as permitidas e redireciona sozinho:
 *  - sem usuário OU travado por biometria  -> só /login
 *  - logado e destravado                   -> só o grupo (app)
 */
function Guard() {
  const { user, loading, locked } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.eggplant }}>
        <ActivityIndicator color={theme.violet} size="large" />
      </View>
    );
  }

  const liberado = !!user && !locked;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.creme } }}>
      <Stack.Protected guard={!liberado}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={liberado}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export const unstable_settings = { anchor: "(app)" };

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Guard />
    </AuthProvider>
  );
}
