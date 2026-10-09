/**
 * Stub del cliente Supabase para la prueba E2E: una sesión fija para que
 * lib/api/clinical arme la petición. Nunca toca la red.
 */
export function createClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: { access_token: "e2e-token" } }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  };
}
