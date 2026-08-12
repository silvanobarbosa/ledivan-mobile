import * as SQLite from "expo-sqlite";

/**
 * Banco local (offline-first).
 *
 * Duas tabelas:
 *  - `patients`  — CACHE dos pacientes. A lista abre instantânea e funciona sem rede; a sync
 *                  atualiza quando há internet.
 *  - `outbox`    — FILA de sessões registradas offline. Cada sessão ganha um `client_id` (uuid do
 *                  device) e fica com status 'pending' até subir. A sync empurra a fila; o backend
 *                  dedupe por client_id, então reenvio é seguro.
 *
 * O objetivo: a psicóloga registra a sessão sem sinal, e ela sobe sozinha quando a rede volta.
 */
let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  const db = await SQLite.openDatabaseAsync("ledivan.db");
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      status TEXT,
      fee TEXT,
      frequency TEXT,
      updated_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS outbox (
      client_id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      chargeable INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      state TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      error TEXT
    );
  `);
  _db = db;
  return db;
}

export type LocalPatient = {
  id: string; name: string; phone: string | null;
  status: string | null; fee: string | null; frequency: string | null;
};

/** Substitui o cache de pacientes pela lista fresca do servidor. */
export async function replacePatients(list: LocalPatient[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM patients;");
    for (const p of list) {
      await db.runAsync(
        "INSERT INTO patients (id,name,phone,status,fee,frequency,updated_at) VALUES (?,?,?,?,?,?,?)",
        [p.id, p.name, p.phone, p.status, p.fee, p.frequency, Date.now()],
      );
    }
  });
}

export async function listPatients(): Promise<LocalPatient[]> {
  const db = await getDb();
  return db.getAllAsync<LocalPatient>("SELECT id,name,phone,status,fee,frequency FROM patients ORDER BY name");
}

export type OutboxItem = {
  client_id: string; patient_id: string; patient_name: string | null;
  date: string; status: string; chargeable: number; notes: string | null;
  state: string; created_at: number; error: string | null;
};

/** Enfileira uma sessão registrada no app (pode estar offline). */
export async function enqueueSession(item: {
  client_id: string; patient_id: string; patient_name: string;
  date: string; status: string; chargeable: boolean; notes?: string;
}): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    "INSERT INTO outbox (client_id,patient_id,patient_name,date,status,chargeable,notes,state,created_at) VALUES (?,?,?,?,?,?,?, 'pending', ?)",
    [item.client_id, item.patient_id, item.patient_name, item.date, item.status, item.chargeable ? 1 : 0, item.notes ?? null, Date.now()],
  );
}

export async function pendingOutbox(): Promise<OutboxItem[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxItem>("SELECT * FROM outbox WHERE state != 'sent' ORDER BY created_at");
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ n: number }>("SELECT count(*) as n FROM outbox WHERE state != 'sent'");
  return r?.n ?? 0;
}

export async function markSent(clientId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE outbox SET state='sent', error=NULL WHERE client_id=?", [clientId]);
}

export async function markError(clientId: string, err: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE outbox SET state='error', error=? WHERE client_id=?", [err, clientId]);
}
