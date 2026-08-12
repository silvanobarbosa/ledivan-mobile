import { api, ApiError } from "./api";
import {
  replacePatients, listPatients, pendingOutbox, markSent, markError, pendingCount,
  type LocalPatient,
} from "./localdb";

/**
 * Sincronização offline-first.
 *
 * - `pullPatients`: baixa a lista do servidor e atualiza o cache local. Se estiver offline, apenas
 *   devolve o que já está no cache — a tela nunca fica vazia por falta de rede.
 * - `pushOutbox`: empurra as sessões pendentes. O backend dedupe por client_id, então reenviar é
 *   seguro. Falha de rede não perde nada: o item continua 'pending' e tenta de novo depois.
 * - `syncAll`: faz os dois. Chamado ao abrir, ao voltar do background e após registrar sessão.
 */
export async function pullPatients(token: string | null): Promise<LocalPatient[]> {
  try {
    const r = await api<{ patients: LocalPatient[] }>("/api/app/patients", { token });
    await replacePatients(r.patients);
    return r.patients;
  } catch (e) {
    if (e instanceof ApiError && e.status === 0) {
      return listPatients(); // offline: usa o cache
    }
    throw e;
  }
}

export async function pushOutbox(token: string | null): Promise<{ enviados: number; pendentes: number }> {
  const fila = await pendingOutbox();
  let enviados = 0;
  for (const item of fila) {
    try {
      await api("/api/app/sessions", {
        token,
        method: "POST",
        body: {
          clientId: item.client_id,
          patientId: item.patient_id,
          date: item.date,
          status: item.status,
          chargeable: item.chargeable === 1,
          notes: item.notes ?? undefined,
        },
      });
      await markSent(item.client_id);
      enviados++;
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) break; // offline: para e tenta depois
      await markError(item.client_id, (e as Error).message); // erro real (ex.: 4xx): marca e segue
    }
  }
  return { enviados, pendentes: await pendingCount() };
}

export async function syncAll(token: string | null) {
  const out = await pushOutbox(token); // sobe o que ficou pendente primeiro
  const patients = await pullPatients(token);
  return { ...out, pacientes: patients.length };
}
