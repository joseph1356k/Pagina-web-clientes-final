import { describe, expect, it } from "vitest";
import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";
import {
  DOMINIO_NUEVO,
  HOSTS_DEL_DOMINIO_VIEJO,
  redireccionesDelDominioViejo,
} from "@/lib/dominio-viejo";

// Se compila la regla igual que Next compila los redirects (getPathMatch con
// removeUnnamedParams y strict), y el host como Next compila un `has`.
const [regla] = redireccionesDelDominioViejo();
const coincide = getPathMatch(regla.source, { removeUnnamedParams: true, strict: true });
const host = new RegExp(`^${HOSTS_DEL_DOMINIO_VIEJO}$`);

function destino(ruta: string): string | null {
  const params = coincide(ruta);
  if (!params) return null;
  return regla.destination.replace(":ruta", String(params.ruta ?? ""));
}

describe("itsmiracleai.com.co manda al portal nuevo", () => {
  it.each([
    ["/", `${DOMINIO_NUEVO}/`],
    ["/login", `${DOMINIO_NUEVO}/login`],
    ["/app", `${DOMINIO_NUEVO}/app`],
    ["/app/consultas/en-vivo", `${DOMINIO_NUEVO}/app/consultas/en-vivo`],
    ["/app/configuracion/audio", `${DOMINIO_NUEVO}/app/configuracion/audio`],
    ["/suscripcion", `${DOMINIO_NUEVO}/suscripcion`],
    ["/apple-touch-icon.png", `${DOMINIO_NUEVO}/apple-touch-icon.png`],
    ["/authors", `${DOMINIO_NUEVO}/authors`],
  ])("%s → %s", (ruta, esperado) => {
    expect(destino(ruta)).toBe(esperado);
  });

  it.each([
    "/api/billing/webhook",
    "/api/stt/session",
    "/api",
    "/auth/callback",
    "/auth",
    "/_next/static/chunks/main.js",
    "/monitoring",
  ])("%s se queda (máquinas, correos de acceso, recursos)", (ruta) => {
    expect(destino(ruta)).toBeNull();
  });

  it("solo aplica al dominio viejo, con y sin www", () => {
    expect(host.test("itsmiracleai.com.co")).toBe(true);
    expect(host.test("www.itsmiracleai.com.co")).toBe(true);
    expect(host.test("www.itsmiracleai.com")).toBe(false);
    expect(host.test("itsmiracleai.com")).toBe(false);
    expect(host.test("miracle-web.vercel.app")).toBe(false);
    expect(host.test("evil-itsmiracleai.com.co.example.com")).toBe(false);
  });

  it("es temporal (307): quitar la regla deshace el corte al instante", () => {
    expect(regla.permanent).toBe(false);
  });
});
