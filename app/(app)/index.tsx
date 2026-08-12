import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { theme } from "../../lib/theme";
import { api, ApiError } from "../../lib/api";
import { syncAll } from "../../lib/sync";
import { pendingCount } from "../../lib/localdb";

type Resumo = { pacientesAtivos?: number; sessoesHoje?: number; recebidoMes?: number };

export default function Home() {
  const { user, token, signOut } = useAuth();
  const router = useRouter();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [pendentes, setPendentes] = useState(0);

  const carregar = useCallback(async () => {
    setErro("");
    // sobe a fila offline + atualiza cache de pacientes
    try { await syncAll(token); } catch { /* offline: segue com o local */ }
    setPendentes(await pendingCount());
    try {
      const r = await api<Resumo>("/api/app/resumo", { token });
      setResumo(r);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setErro("Sem conexão.");
      else setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => { void carregar(); }, [carregar]);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={theme.violet} />}
    >
      <Text style={s.ola}>Olá, {user?.name || "bem-vinda"}!</Text>

      {pendentes > 0 ? (
        <View style={s.fila}>
          <Text style={s.filaTxt}>{pendentes} sessão(ões) aguardando internet para subir</Text>
        </View>
      ) : null}
      {erro ? <Text style={s.erro}>{erro}</Text> : null}

      <View style={s.grid}>
        <Tile label="Pacientes ativos" valor={resumo?.pacientesAtivos} />
        <Tile label="Sessões hoje" valor={resumo?.sessoesHoje} />
        <Tile label="Recebido no mês" valor={resumo?.recebidoMes} money />
      </View>

      <Pressable style={s.acao} onPress={() => router.push("/pacientes")}>
        <Text style={s.acaoTxt}>Pacientes</Text>
      </Pressable>
      <Pressable style={s.acao} onPress={() => router.push("/agenda")}>
        <Text style={s.acaoTxt}>Agenda de hoje</Text>
      </Pressable>

      <Pressable style={s.sair} onPress={() => void signOut()}>
        <Text style={s.sairTxt}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

function Tile({ label, valor, money }: { label: string; valor?: number; money?: boolean }) {
  const txt = valor == null ? "—" : money
    ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : String(valor);
  return (
    <View style={s.tile}>
      <Text style={s.tileVal}>{txt}</Text>
      <Text style={s.tileLbl}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { padding: 20 },
  ola: { fontSize: 22, fontWeight: "800", color: theme.eggplant, marginBottom: 16 },
  fila: { backgroundColor: "#fef3c7", borderRadius: 12, padding: 12, marginBottom: 12 },
  filaTxt: { color: "#92400e", fontSize: 13 },
  erro: { color: theme.danger, marginBottom: 12 },
  grid: { gap: 12 },
  tile: { backgroundColor: theme.white, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: theme.border },
  tileVal: { fontSize: 26, fontWeight: "800", color: theme.violet },
  tileLbl: { fontSize: 14, color: theme.muted, marginTop: 4 },
  acao: { backgroundColor: theme.eggplant, borderRadius: 14, padding: 16, marginTop: 12 },
  acaoTxt: { color: theme.white, fontWeight: "700", fontSize: 15 },
  sair: { marginTop: 28, alignSelf: "center", padding: 12 },
  sairTxt: { color: theme.muted, textDecorationLine: "underline" },
});
