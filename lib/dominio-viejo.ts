// El portal vive en www.itsmiracleai.com. itsmiracleai.com.co era el dominio
// del portal viejo (repo joseph1356k/Pagina-web-clientes-final), que dejó de
// recibir cambios el 2026-09-08: quien entraba por ahí usaba un portal de hace
// un mes, sin ninguno de los arreglos del Mira, y como el navegador guarda el
// vínculo Bluetooth, su nombre y la sesión POR DOMINIO, alternar entre los dos
// hacía que el collar «se desconectara» y hubiera que emparejarlo otra vez.
//
// Esta regla manda a las personas al portal nuevo, con la misma ruta y la
// misma query. La misma regla vive en el next.config del repo viejo (fase A del
// corte: docs/monorepo/corte-com-co.md) y aquí (fase B: cuando el dominio se
// mude a este proyecto, sigue redirigiendo sin tocar nada).
//
// LO QUE NO SE REDIRIGE, y por qué:
//   - /api/*       Llamadas de máquinas. Stripe NO sigue redirecciones: su
//                  webhook (/api/billing/webhook) dejaría de registrar pagos.
//   - /auth/*      Los correos de Supabase (confirmar cuenta, recuperar
//                  contraseña) vuelven aquí con un código que solo sirve en el
//                  dominio donde empezó el flujo (la cookie PKCE es suya).
//   - /_next/*     Recursos del propio portal que aún estén abiertos.
//   - /monitoring  El túnel de Sentry.
//
// Temporal (307) a propósito: si algo falla, quitar la regla deshace el
// cambio al instante; un 308 lo recordaría cada navegador.

export const DOMINIO_NUEVO = "https://www.itsmiracleai.com";

/** Hosts del dominio viejo, con y sin www (expresión del `has` de Next). */
export const HOSTS_DEL_DOMINIO_VIEJO = "(?:www\\.)?itsmiracleai\\.com\\.co";

/** Primeros segmentos de ruta que se quedan en el dominio viejo. */
export const RUTAS_QUE_NO_SE_REDIRIGEN = ["api", "auth", "_next", "monitoring"] as const;

const EXCLUIDAS = RUTAS_QUE_NO_SE_REDIRIGEN.map((r) => `${r}(?:/|$)`).join("|");

export function redireccionesDelDominioViejo() {
  return [
    {
      source: `/:ruta((?!${EXCLUIDAS}).*)`,
      has: [{ type: "host" as const, value: HOSTS_DEL_DOMINIO_VIEJO }],
      destination: `${DOMINIO_NUEVO}/:ruta`,
      permanent: false,
    },
  ];
}
