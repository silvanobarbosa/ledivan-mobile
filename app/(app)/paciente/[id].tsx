import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../lib/auth";
import { theme } from "../../../lib/theme";
import { enqueueSession } from "../../../lib/localdb";
import { pushOutbox } from "../../../lib/sync";
import { uuid } from "../../../lib/uuid";

/**
 * Detalhe do paciente + REGISTRAR SESSÃO — o fluxo que precisa funcionar offline.
 *
 * O registro NÃO chama a API direto: grava na fila local (outbox) e tenta empurrar. Se estiver sem
 * rede, fica pendente e sobe depois — a psicóloga registra a sessão na hora, com ou sem sinal.
 */
export default function PacienteDetalhe() {
  const { id, nome } = useLocalSearchParams<{ id: string; nome?: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [realizada, setRealizada] = useState(true);
  const [cobravel, setCobravel] = useState(true);
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);

  const registrar = async () => {
    if (!id) return;
    setSalvando(true);
    try {
      const clientId = uuid();
      await enqueueSession({
        client_id: clientId,
        patient_id: String(id),
        patient_name: String(nome ?? ""),
        date: new Date().toISOString(),
        status: realizada ? "realizada" : "nao_realizada",
        chargeable: cobravel,
        notes: obs.trim() || undefined,
      });
      // tenta subir agora; se offline, fica na fila
      const r = await pushOutbox(token);
      const msg = r.pendentes > 0
        ? "Sessão salva. Vai subir quando houver internet."
        : "Sessão registrada.";
      Alert.alert("Pronto", msg, [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert("Erro", (e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={s.container}>
      <View style={s.topo}>
        <Text style={s.nome}>{nome ?? "Paciente"}</Text>
        <Pressable onPress={() => router.push(`/paciente/editar/${id}`)}>
          <Text style={s.editar}>Editar</Text>
        </Pressable>
      </View>

      <Text style={s.secao}>Registrar sessão de hoje</Text>

      <Toggle label="Paciente compareceu" value={realizada} onChange={setRealizada} />
      <Toggle label="Sessão cobrável" value={cobravel} onChange={setCobravel} />

      <Text style={s.lbl}>Observações (opcional)</Text>
      <TextInput
        style={s.obs} placeholder="Anotações da sessão" placeholderTextColor={theme.muted}
        value={obs} onChangeText={setObs} multiline
      />

      <Pressable style={[s.btn, salvando && { opacity: 0.6 }]} onPress={registrar} disabled={salvando}>
        <Text style={s.btnTxt}>{salvando ? "Salvando..." : "Registrar sessão"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable style={s.toggle} onPress={() => onChange(!value)}>
      <Text style={s.toggleLbl}>{label}</Text>
      <View style={[s.pill, value ? s.pillOn : s.pillOff]}>
        <Text style={s.pillTxt}>{value ? "Sim" : "Não"}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  container: { padding: 20 },
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  nome: { fontSize: 24, fontWeight: "800", color: theme.eggplant, flex: 1 },
  editar: { fontSize: 15, color: theme.violet, fontWeight: "700" },
  secao: { fontSize: 16, fontWeight: "700", color: theme.ink, marginBottom: 12 },
  toggle: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: theme.white, borderRadius: 12, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: theme.border,
  },
  toggleLbl: { fontSize: 15, color: theme.ink },
  pill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999 },
  pillOn: { backgroundColor: theme.violet },
  pillOff: { backgroundColor: theme.border },
  pillTxt: { color: theme.white, fontWeight: "700" },
  lbl: { fontSize: 14, color: theme.muted, marginTop: 8, marginBottom: 6 },
  obs: {
    minHeight: 80, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    padding: 12, backgroundColor: theme.white, color: theme.ink, textAlignVertical: "top",
  },
  btn: { height: 52, borderRadius: 14, backgroundColor: theme.violet, alignItems: "center", justifyContent: "center", marginTop: 20 },
  btnTxt: { color: theme.white, fontSize: 16, fontWeight: "700" },
});
