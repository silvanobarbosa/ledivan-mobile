import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useAuth } from "../../lib/auth";
import { theme } from "../../lib/theme";
import { api, ApiError } from "../../lib/api";

type Sessao = { id: string; date: string; status: string; patientName: string; patientId: string };

export default function Agenda() {
  const { token } = useAuth();
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setErro("");
    try {
      const r = await api<{ sessions: Sessao[] }>("/api/app/agenda", { token });
      setSessoes(r.sessions);
    } catch (e) {
      setErro(e instanceof ApiError && e.status === 0 ? "Sem conexão." : (e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => { void carregar(); }, [carregar]);

  return (
    <FlatList
      data={sessoes}
      keyExtractor={(x) => x.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={theme.violet} />}
      ListHeaderComponent={erro ? <Text style={s.erro}>{erro}</Text> : null}
      ListEmptyComponent={!carregando ? <Text style={s.vazio}>Nenhuma sessão hoje.</Text> : null}
      renderItem={({ item }) => (
        <View style={s.card}>
          <Text style={s.hora}>{new Date(item.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.nome} numberOfLines={1}>{item.patientName}</Text>
            <Text style={s.status} numberOfLines={1}>{item.status}</Text>
          </View>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  erro: { color: theme.danger, marginBottom: 12 },
  vazio: { textAlign: "center", color: theme.muted, marginTop: 40 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: theme.white,
    borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  hora: { fontSize: 16, fontWeight: "800", color: theme.violet, width: 56 },
  nome: { fontSize: 15, fontWeight: "700", color: theme.ink },
  status: { fontSize: 13, color: theme.muted, marginTop: 2 },
});
