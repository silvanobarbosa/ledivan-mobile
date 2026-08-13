import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Application from "expo-application";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

/**
 * Push do app.
 *
 * `registerForPush` pede permissão, pega o token Expo do aparelho e registra no backend
 * (/api/app/push/register). Chamado depois do login. Silencioso em falha — push é um extra, não
 * pode travar o app.
 *
 * O token só existe em device físico (emulador não recebe). No Android, além disso, o push só
 * CHEGA se o projeto Expo tiver FCM configurado — passo do dono.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPush(token: string | null): Promise<void> {
  try {
    if (!Device.isDevice) return; // emulador não recebe push

    const { status: atual } = await Notifications.getPermissionsAsync();
    let status = atual;
    if (status !== "granted") {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== "granted") return;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Padrão",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    const expoToken = (await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    )).data;

    await api("/api/app/push/register", {
      token,
      method: "POST",
      body: {
        token: expoToken,
        platform: Platform.OS,
        appVersion: Application.nativeApplicationVersion ?? undefined,
      },
    });
  } catch {
    // push é opcional — nunca derruba o app
  }
}
