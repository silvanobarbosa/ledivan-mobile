import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet,
  KeyboardAvoidingView, Platform, Linking,
} from "react-native";
import { useAuth } from "../lib/auth";
import { theme } from "../lib/theme";
import { api } from "../lib/api";

export default function Login() {
  const { signIn, user, locked, biometricEnabled, unlockWithBiometric } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");
  const [apk, setApk] = useState<{ version: string; apkUrl: string } | null>(null);

  // Link de download da versão ATUAL do app (fonte: /api/app/version). Sempre aponta pro APK novo.
  useEffect(() => {
    api<{ version: string; apkUrl: string }>("/api/app/version").then(setApk).catch(() => {});
  }, []);

  // Se a sessão está só TRAVADA (tem token, falta biometria), oferece desbloqueio direto.
  const somenteTravado = !!user && locked;
  useEffect(() => {
    if (somenteTravado && biometricEnabled) void unlockWithBiometric();
  }, [somenteTravado, biometricEnabled, unlockWithBiometric]);

  const entrar = async () => {
    setErro("");
    if (!email.trim() || !senha) { setErro("Preencha e-mail e senha."); return; }
    setBusy(true);
    try {
      await signIn(email, senha);
    } catch (e: any) {
      setErro(e?.status === 0 ? "Sem conexão. Verifique a internet." : (e?.message || "Falha no login."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.wrap}>
      <View style={s.card}>
        <Text style={s.logo}>L'E-Divan</Text>
        <Text style={s.sub}>Gestão do seu consultório</Text>

        {somenteTravado ? (
          <Pressable style={s.btn} onPress={() => void unlockWithBiometric()}>
            <Text style={s.btnTxt}>Desbloquear com biometria</Text>
          </Pressable>
        ) : (
          <>
            <TextInput
              style={s.input} placeholder="E-mail" placeholderTextColor={theme.muted}
              autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
              value={email} onChangeText={setEmail}
            />
            <TextInput
              style={s.input} placeholder="Senha" placeholderTextColor={theme.muted}
              secureTextEntry value={senha} onChangeText={setSenha}
            />
            {erro ? <Text style={s.erro}>{erro}</Text> : null}
            <Pressable style={[s.btn, busy && { opacity: 0.6 }]} onPress={entrar} disabled={busy}>
              {busy ? <ActivityIndicator color={theme.white} /> : <Text style={s.btnTxt}>Entrar</Text>}
            </Pressable>
          </>
        )}
      </View>

      {apk?.apkUrl ? (
        <Pressable style={s.download} onPress={() => Linking.openURL(apk.apkUrl)}>
          <Text style={s.downloadTxt}>Baixar app Android v{apk.version}</Text>
        </Pressable>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.eggplant, alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, backgroundColor: theme.white, borderRadius: 24, padding: 28 },
  logo: { fontSize: 30, fontWeight: "800", color: theme.eggplant, textAlign: "center" },
  sub: { fontSize: 14, color: theme.muted, textAlign: "center", marginTop: 4, marginBottom: 24 },
  input: {
    height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 16, fontSize: 16, color: theme.ink, marginBottom: 12, backgroundColor: theme.creme,
  },
  erro: { color: theme.danger, fontSize: 14, marginBottom: 8 },
  btn: { height: 52, borderRadius: 14, backgroundColor: theme.violet, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnTxt: { color: theme.white, fontSize: 16, fontWeight: "700" },
  download: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 16 },
  downloadTxt: { color: theme.creme, fontSize: 13, textDecorationLine: "underline" },
});
