export const BASE: string = (import.meta as any).env?.VITE_API_URL || "/api";
let tok = "";
export const setToken = (t: string) => { tok = t; };
const hdr = (opt: RequestInit) => { const h: Record<string, string> = { Authorization: `Bearer ${tok}` }; if (opt.body && !(opt.body instanceof FormData)) h["Content-Type"] = "application/json"; return h; };
const TOASTS: [RegExp, string][] = [[/^\/practices\/\d+\/run/, "Ejecución en cola"], [/^\/practices$/, "Práctica guardada como borrador"], [/^\/datasets\/upload/, "Dataset importado y validado"], [/^\/datasets\/\d+$/, "Dataset eliminado"], [/\/review$/, "Práctica marcada como revisada"], [/\/cancel$/, "Ejecución cancelada"], [/^\/admin\//, "Cambios guardados"]];
function notify(path: string, method: string) { if (method === "GET") return; const t = TOASTS.find(x => x[0].test(path)); if (t) window.dispatchEvent(new CustomEvent("toast", { detail: t[1] })); }
async function fail(r: Response): Promise<never> {
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) window.dispatchEvent(new Event("expired"));
  throw new Error(typeof d.detail === "string" ? d.detail : "Datos no válidos.");
}
export async function api<T = any>(path: string, opt: RequestInit = {}): Promise<T> {
  const r = await fetch(BASE + path, { ...opt, headers: hdr(opt) });
  if (!r.ok) return fail(r); notify(path, (opt.method || "GET").toUpperCase()); return r.json();
}
export async function apiBlob(path: string): Promise<Blob> {
  const r = await fetch(BASE + path, { headers: hdr({}) }); if (!r.ok) return fail(r); return r.blob();
}
