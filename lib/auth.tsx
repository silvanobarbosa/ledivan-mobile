import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import { api } from "./api";

/**
 * Sessão do app.
 *
 * Fluxo: login com e-mail/senha → o backend devolve um token bearer + o usuário. Guardamos o
 * token no secure-store (keystore/keychain do device). Nas próximas aberturas, se o usuário
 * ativou biometria, a sessão fica TRAVADA até `unlockWithBiometric()` — o token existe mas o app
 * não libera as telas antes da digital/face. Sem biometria, o token guardado já entra direto.
 *
 * `locked` distingue "tem token mas precisa de biometria" de "sem token" (precisa logar).
 */
const TOKEN_KEY = "ledivan.token";
const USER_KEY = "ledivan.user";
const BIO_KEY = "ledivan.biometric";

export type User = { id: string; email: string; name: string | null; role?: string };
type Ctx = {
  user: User | null;
  loading: boolean;
  locked: boolean;
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  unlockWithBiometric: () => Promise<boolean>;
  enableBiometric: (on: boolean) => Promise<void>;
  biometricEnabled: boolean;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Ao abrir: recupera token+usuário guardados. Se biometria ligada, começa TRAVADO.
  useEffect(() => {
    (async () => {
      try {
        const [tk, us, bio] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
          SecureStore.getItemAsync(BIO_KEY),
        ]);
        const bioOn = bio === "1";
        setBiometricEnabled(bioOn);
        if (tk && us) {
          setToken(tk);
          setUser(JSON.parse(us));
          setLocked(bioOn); // com biometria, exige desbloqueio antes de liberar
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const em = email.trim().toLowerCase();
    const r = await api<{ token: string; user: User }>("/api/app/login", {
      method: "POST",
      body: { email: em, password },
    });
    await SecureStore.setItemAsync(TOKEN_KEY, r.token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(r.user));
    setToken(r.token);
    setUser(r.user);
    setLocked(false);
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
    setLocked(false);
  }, []);

  const unlockWithBiometric = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Desbloquear o Ledivan",
      cancelLabel: "Cancelar",
    });
    if (res.success) setLocked(false);
    return res.success;
  }, []);

  const enableBiometric = useCallback(async (on: boolean) => {
    if (on) {
      const has = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!has || !enrolled) throw new Error("Este aparelho não tem biometria cadastrada.");
    }
    await SecureStore.setItemAsync(BIO_KEY, on ? "1" : "0");
    setBiometricEnabled(on);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, locked, token, signIn, signOut,
      unlockWithBiometric, enableBiometric, biometricEnabled,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth fora do AuthProvider");
  return c;
}
