import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../lib/auth";
import { theme } from "../../lib/theme";
import { pullPatients } from "../../lib/sync";
import { listPatients, type LocalPatient } from "../../lib/localdb";

export default function Pacientes() {
  const { token } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<LocalPatient[]>([]);
  const [busca, setBusca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [offline, setOffline] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    // mostra o cache na hora, depois tenta atualizar da rede
    setTodos(await listPatients());
    try {
      const fresh = await pullPatients(token);
      setTodos(fresh);
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => { void carregar(); }, [carregar]);

  const filtro = busca.trim().toLowerCase();
  const lista = filtro ? todos.filter((p) => p.name.toLowerCase().includes(filtro)) : todos;

  return (
    <View style={{ flex: 1 }}>
      <View style={s.buscaWrap}>
        <TextInput
          style={s.busca} placeholder="Buscar paciente" placeholderTextColor={theme.muted}
          value={busca} onChangeText={setBusca} autoCapitalize="none"
        />
      </View>
      {offline ? <Text style={s.offline}>Offline — mostrando lista salva</Text> : null}
      <FlatList
        data={lista}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={theme.violet} />}
        ListEmptyComponent={<Text style={s.vazio}>Nenhum paciente.</Text>}
        renderItem={({ item }) => (
          <Pressable style={s.card} onPress={() => router.push(`/paciente/${item.id}?nome=${encodeURIComponent(item.name)}`)}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.nome} numberOfLines={1}>{item.name}</Text>
              <Text style={s.meta} numberOfLines={1}>{item.status ?? "—"}{item.frequency ? ` · ${item.frequency}` : ""}</Text>
            </View>
            <Text style={s.fee} numberOfLines={1}>{item.fee ? `R$ ${item.fee}` : ""}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  buscaWrap: { padding: 16, paddingBottom: 8 },
  busca: {
    height: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, backgroundColor: theme.white, color: theme.ink,
  },
  offline: { textAlign: "center", color: theme.muted, fontSize: 12, paddingBottom: 6 },
  card: {
    flexDirection: "row", alignItems: "center", backgroundColor: theme.white,
    borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  nome: { fontSize: 16, fontWeight: "700", color: theme.ink },
  meta: { fontSize: 13, color: theme.muted, marginTop: 2 },
  fee: { fontSize: 14, color: theme.violet, fontWeight: "600", flexShrink: 0, marginLeft: 10 },
  vazio: { textAlign: "center", color: theme.muted, marginTop: 40 },
});
