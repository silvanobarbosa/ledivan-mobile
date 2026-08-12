import Constants from "expo-constants";

/**
 * Cliente HTTP do app. Fala com o backend web do Ledivan por TOKEN BEARER (não cookie — o app
 * é nativo, não tem cookie jar como o navegador). O token vem do login e é guardado no
 * secure-store (ver lib/auth). O app NUNCA carrega segredo: só o token de sessão do usuário.
 */
const BASE = (Constants.expoConfig?.extra?.apiBaseUrl as string) || "https://ledivan.com.br";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Opts = { token?: string | null; method?: string; body?: unknown; timeoutMs?: number };

export async function api<T = unknown>(path: string, opts: Opts = {}): Promise<T> {
  const { token, method = "GET", body, timeoutMs = 20000 } = opts;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const txt = await res.text();
    const data = txt ? safeJson(txt) : null;
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || `Erro ${res.status}`;
      throw new ApiError(res.status, msg);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    // status 0 = sem conexão (timeout/abort/rede). O app trata como "offline".
    throw new ApiError(0, "Sem conexão com o servidor.");
  } finally {
    clearTimeout(t);
  }
}

function safeJson(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}

export { BASE };
