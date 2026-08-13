import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "../../../../lib/auth";
import { theme } from "../../../../lib/theme";
import { api, ApiError } from "../../../../lib/api";
import { getPatient, updatePatientCache } from "../../../../lib/localdb";

/**
 * Editar dados do paciente. Lê do cache local (abre offline), mas SALVAR exige internet — editar
 * cadastro é raro e não vale a complexidade de uma segunda fila offline (a fila é só de sessões,
 * o fluxo crítico). Sem rede, avisa e não perde o que foi digitado.
 */
const STATUS = ["ativo", "inativo", "prospect", "pausado"];

export default function EditarPaciente() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [nome, setNome] = useState("");
  const [phone, setPhone] = useState("");
  const [fee, setFee] = useState("");
  const [status, setStatus] = useState("ativo");
  const [freq, setFreq] = useState("");

  useEffect(() => {
    (async () => {
      const p = id ? await getPatient(String(id)) : null;
      if (p) {
        setNome(p.name); setPhone(p.phone ?? ""); setFee(p.fee ?? "");
        setStatus(p.status ?? "ativo"); setFreq(p.frequency ?? "");
      }
      setCarregando(false);
    })();
  }, [id]);

  const salvar = async () => {
    if (!id) return;
    if (!nome.trim()) { Alert.alert("Ops", "O nome não pode ficar vazio."); return; }
    setSalvando(true);
    try {
      await api(`/api/app/patients/${id}`, {
        token, method: "PATCH",
        body: { name: nome, phone, sessionFee: fee, patientStatus: status, frequency: freq },
      });
      await updatePatientCache(String(id), { name: nome.trim(), phone: phone || null, fee, status, frequency: freq || null });
      Alert.alert("Pronto", "Dados atualizados.", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert("Erro", e instanceof ApiError && e.status === 0 ? "Sem conexão — precisa de internet para salvar." : (e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return <View style={s.center}><ActivityIndicator color={theme.violet} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Campo label="Nome" value={nome} onChange={setNome} />
      <Campo label="Telefone" value={phone} onChange={setPhone} keyboard="phone-pad" />
      <Campo label="Valor da sessão (R$)" value={fee} onChange={setFee} keyboard="numeric" />
      <Campo label="Frequência" value={freq} onChange={setFreq} placeholder="ex: semanal" />

      <Text style={s.lbl}>Status</Text>
      <View style={s.status}>
        {STATUS.map((st) => (
          <Pressable key={st} onPress={() => setStatus(st)} style={[s.chip, status === st && s.chipOn]}>
            <Text style={[s.chipTxt, status === st && s.chipTxtOn]}>{st}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[s.btn, salvando && { opacity: 0.6 }]} onPress={salvar} disabled={salvando}>
        <Text style={s.btnTxt}>{salvando ? "Salvando..." : "Salvar"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Campo({ label, value, onChange, keyboard, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: "default" | "numeric" | "phone-pad"; placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.lbl}>{label}</Text>
      <TextInput
        style={s.input} value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={theme.muted} keyboardType={keyboard ?? "default"} autoCapitalize="words"
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 20 },
  lbl: { fontSize: 14, color: theme.muted, marginBottom: 6 },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, backgroundColor: theme.white, color: theme.ink, fontSize: 16,
  },
  status: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.white },
  chipOn: { backgroundColor: theme.violet, borderColor: theme.violet },
  chipTxt: { color: theme.ink, fontSize: 14 },
  chipTxtOn: { color: theme.white, fontWeight: "700" },
  btn: { height: 52, borderRadius: 14, backgroundColor: theme.violet, alignItems: "center", justifyContent: "center" },
  btnTxt: { color: theme.white, fontSize: 16, fontWeight: "700" },
});
