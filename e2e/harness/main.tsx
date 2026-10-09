/**
 * Página mínima para la prueba E2E del asistente: monta el MedicalChat real
 * con una consulta publicada en el contexto, sin Supabase ni Graph. La sesión y
 * la navegación son stubs (ver e2e/vite.config.ts) y Playwright intercepta
 * /api/clinical/assistant/chat. No forma parte de la app.
 */
import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { MedicalChat } from "@/components/app/MedicalChat";
import {
  AssistantContextProvider,
  useAssistantContextPublisher,
  type AssistantEncounterContext,
} from "@/lib/assistant/context";
import { applyProposalToNote } from "@/lib/assistant/apply";
import type { ClinicalNoteJson } from "@/lib/api/clinical";

const NOTA_INICIAL: ClinicalNoteJson = {
  summary: "Cefalea de tres días.",
  sections: [
    { key: "analisis", label: "Análisis", content: "Cefalea tensional probable." },
    { key: "plan", label: "Plan", content: "Acetaminofén." },
  ],
  warnings: [],
  missing_required_sections: [],
};

function Consulta() {
  const [note, setNote] = useState(NOTA_INICIAL);
  const context = useMemo<AssistantEncounterContext>(
    () => ({
      encounterId: null,
      specialtyCode: "medicina_general",
      note,
      codes: [],
      patient: { edad: 40, sexo: "F" },
      editable: true,
      hasTranscript: false,
      applyProposal: (proposal) => {
        setNote((current) => applyProposalToNote(current, proposal));
        return true;
      },
    }),
    [note],
  );
  useAssistantContextPublisher(context);
  return (
    <main>
      <h1>Consulta de prueba</h1>
      <section aria-label="Nota en pantalla">
        {note.sections.map((section) => (
          <p key={section.key} data-testid={`nota-${section.key}`}>
            {section.content}
          </p>
        ))}
      </section>
      <MedicalChat />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AssistantContextProvider>
      <Consulta />
    </AssistantContextProvider>
  </StrictMode>,
);
