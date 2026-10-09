/** Stub de next/navigation para la página de prueba E2E (fuera de Next). */
export function usePathname(): string {
  return "/app/consultas/e2e";
}

export function useRouter() {
  return { push() {}, replace() {}, refresh() {}, back() {}, prefetch() {} };
}

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams();
}
