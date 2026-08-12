/**
 * UUID v4 para o `client_id` da fila offline. Não precisa de força criptográfica — é só um id
 * único por registro para o backend deduplicar reenvios. Math.random basta aqui.
 */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
