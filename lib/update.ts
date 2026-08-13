import { useEffect, useState } from "react";
import * as Application from "expo-application";
import { api } from "./api";

/**
 * Aviso de atualização do app. Compara a versão instalada com a fonte /api/app/version. Se o
 * servidor anuncia uma versão diferente da instalada e há um apkUrl, o banner aparece com o link.
 * O link vem SEMPRE do servidor, então nunca fica preso a um APK velho.
 */
export type UpdateInfo = { version: string; apkUrl: string; notes: string; mandatory: boolean };

export function useUpdate() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<UpdateInfo>("/api/app/version");
        const instalada = Application.nativeApplicationVersion ?? "";
        if (r.apkUrl && r.version && r.version !== instalada) {
          setUpdate(r);
        }
      } catch {
        // sem rede: sem aviso, sem problema
      }
    })();
  }, []);

  return update;
}
