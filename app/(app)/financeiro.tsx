import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { useAuth } from "../../lib/auth";
import { theme } from "../../lib/theme";
import { api, ApiError } from "../../lib/api";

type Pag = { id: string; date: string; amount: string; patientName: string };
type Fin = { month: string; total: number; quantidade: number; pagamentos: Pag[] };

export default function Financeiro() {
  const { token } = useAuth();
  const [fin, setFin] = useState<Fin | null>(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setErro("");
    try {
      setFin(await api<Fin>("/api/app/financeiro", { token }));
    } catch (e) {
      setErro(e instanceof ApiError && e.status === 0 ? "Sem conexão." : (e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => { void carregar(); }, [carregar]);

  const brl = (v: number | string) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <FlatList
      data={fin?.pagamentos ?? []}
      keyExtractor={(p) => p.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={theme.violet} />}
      ListHeaderComponent={
        <View>
          {erro ? <Text style={s.erro}>{erro}</Text> : null}
          <View style={s.card}>
            <Text style={s.cardVal}>{brl(fin?.total ?? 0)}</Text>
            <Text style={s.cardLbl}>Recebido no mês · {fin?.quantidade ?? 0} pagamento(s)</Text>
          </View>
          <Text style={s.secao}>Últimos pagamentos</Text>
        </View>
      }
      ListEmptyComponent={!carregando ? <Text style={s.vazio}>Nenhum pagamento no mês.</Text> : null}
      renderItem={({ item }) => (
        <View style={s.linha}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.nome} numberOfLines={1}>{item.patientName}</Text>
            <Text style={s.data} numberOfLines={1}>{new Date(item.date).toLocaleDateString("pt-BR")}</Text>
          </View>
          <Text style={s.valor} numberOfLines={1}>{brl(item.amount)}</Text>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  erro: { color: theme.danger, marginBottom: 12 },
  card: { backgroundColor: theme.eggplant, borderRadius: 18, padding: 22, marginBottom: 8 },
  cardVal: { fontSize: 30, fontWeight: "800", color: theme.white },
  cardLbl: { fontSize: 13, color: "#e7ddea", marginTop: 4 },
  secao: { fontSize: 15, fontWeight: "700", color: theme.ink, marginTop: 16, marginBottom: 8 },
  vazio: { textAlign: "center", color: theme.muted, marginTop: 30 },
  linha: {
    flexDirection: "row", alignItems: "center", backgroundColor: theme.white,
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: theme.border,
  },
  nome: { fontSize: 15, fontWeight: "600", color: theme.ink },
  data: { fontSize: 12, color: theme.muted, marginTop: 2 },
  valor: { fontSize: 15, fontWeight: "700", color: theme.success, flexShrink: 0, marginLeft: 10 },
});
