import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * El chat del asistente en pantalla, con las respuestas de Graph simuladas:
 * respuesta v1 en texto plano, abstención, fuentes de guía y de ficha técnica,
 * cifras sin fuente y aplicar una propuesta de nota.
 */

const CHAT = "**/api/clinical/assistant/chat";

async function preguntar(page: Page, pregunta: string) {
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir asistente clínico" }).click();
  await page.getByLabel("Pregunta para el asistente clínico").fill(pregunta);
  await page.getByRole("button", { name: "Enviar pregunta" }).click();
}

function responder(body: Record<string, unknown>, onRequest?: (payload: Record<string, unknown>) => void) {
  return async (route: Route) => {
    onRequest?.(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ json: { mode: "clinical_chat", ...body } });
  };
}

test("respuesta v1 (Graph anterior) se pinta como texto plano, sin tarjetas nuevas", async ({ page }) => {
  await page.route(CHAT, responder({ answer: "Primera línea de la respuesta.\nSegunda línea." }));
  await preguntar(page, "¿Qué diferenciales considero?");
  await expect(page.getByText("Primera línea de la respuesta.")).toBeVisible();
  await expect(page.getByText("Segunda línea.")).toBeVisible();
  await expect(page.getByText("Sin respaldo suficiente")).toHaveCount(0);
  await expect(page.getByText("Fuentes", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Cifras sin fuente recuperada")).toHaveCount(0);
});

test("abstención: tarjeta de sin respaldo con lo que falta por confirmar", async ({ page }) => {
  await page.route(
    CHAT,
    responder({
      answer: "No tengo respaldo para dar esa dosis.",
      support: "insuficiente",
      sources: [],
      missing_information: ["Dosis en falla hepática Child-Pugh C (ficha técnica)"],
    }),
  );
  await preguntar(page, "¿Dosis exacta de este fármaco en Child-Pugh C?");
  await expect(page.getByText("Sin respaldo suficiente")).toBeVisible();
  const tarjeta = page.getByRole("status").filter({ hasText: "El asistente prefirió no responder sin respaldo." });
  await expect(tarjeta).toBeVisible();
  await expect(tarjeta.getByText("Dosis en falla hepática Child-Pugh C (ficha técnica)")).toBeVisible();
});

test("fuentes de guía y de ficha técnica, con enlace a la ficha, y el contexto viaja sin identificadores", async ({ page }) => {
  let payload: Record<string, unknown> = {};
  await page.route(
    CHAT,
    responder(
      {
        answer: "Meta menor de 130/80 [G1]; losartán 50 mg al día [F1].",
        support: "guia",
        sources: [
          {
            ref: "G1",
            kind: "guia",
            guideline_id: "hipertension-arterial-adultos",
            title: "Hipertensión arterial en adultos",
            organism: "MinSalud",
            year: 2024,
            section: "Metas y tratamiento",
          },
          {
            ref: "F1",
            kind: "ficha_tecnica",
            guideline_id: "cima-62109",
            title: "Ficha técnica: Losartán 50 mg comprimidos",
            organism: "AEMPS",
            year: 2024,
            section: "4.2 Posología y forma de administración",
            url: "https://cima.aemps.es/cima/dochtml/ft/62109/FT_62109.html",
          },
        ],
      },
      (body) => {
        payload = body;
      },
    ),
  );
  await preguntar(page, "¿Con qué inicio la hipertensión y a qué dosis?");
  await expect(page.getByText("Con guía y ficha técnica")).toBeVisible();
  await expect(page.getByText("Fuentes", { exact: true })).toBeVisible();
  await expect(page.getByText(/Hipertensión arterial en adultos/)).toBeVisible();
  await expect(page.getByText(/Ficha técnica: Losartán 50 mg/)).toBeVisible();
  await expect(page.getByRole("link", { name: /Ver ficha/ })).toHaveAttribute(
    "href",
    "https://cima.aemps.es/cima/dochtml/ft/62109/FT_62109.html",
  );
  expect(payload.message).toBe("¿Con qué inicio la hipertensión y a qué dosis?");
  expect(payload.patient_context).toEqual({ edad: 40, sexo: "F" });
  expect(JSON.stringify(payload.note_json_draft)).toContain("Cefalea tensional probable.");
  expect(JSON.stringify(payload)).not.toMatch(/"(nombre|documento|name)"/);
});

test("cifras sin fuente: el aviso aparece con las cifras marcadas", async ({ page }) => {
  await page.route(
    CHAT,
    responder({
      answer: "Amoxicilina 500 mg cada 8 horas por 7 días.",
      support: "general",
      unverified_figures: ["500 mg cada 8 horas", "7 días"],
    }),
  );
  await preguntar(page, "¿Cuánta amoxicilina le doy?");
  await expect(page.getByText("Cifras sin fuente recuperada")).toBeVisible();
  await expect(page.getByText("500 mg cada 8 horas", { exact: true })).toBeVisible();
});

test("propuesta de nota: «Aplicar a la nota» cambia solo la sección propuesta", async ({ page }) => {
  await page.route(
    CHAT,
    responder({
      answer: "Propongo completar el plan.",
      support: "consulta",
      note_proposal: {
        proposed_note_json: {
          summary: "Cefalea de tres días.",
          sections: [
            { key: "analisis", label: "Análisis", content: "Cefalea tensional probable." },
            { key: "plan", label: "Plan", content: "Acetaminofén 1 g si hay dolor. Signos de alarma explicados." },
          ],
          warnings: [],
          missing_required_sections: [],
        },
        changed_sections: [
          {
            key: "plan",
            label: "Plan",
            content: "Acetaminofén 1 g si hay dolor. Signos de alarma explicados.",
            previous_content: "Acetaminofén.",
          },
        ],
        explanation: "Completa el plan con lo que dijo el médico.",
        requires_physician_review: true,
      },
    }),
  );
  await preguntar(page, "Completa el plan: acetaminofén 1 g si hay dolor y signos de alarma explicados");
  await page.getByRole("button", { name: /Aplicar a la nota/ }).click();
  await expect(page.getByText("Aplicada a la nota · revisa y guarda")).toBeVisible();
  await expect(page.getByTestId("nota-plan")).toHaveText("Acetaminofén 1 g si hay dolor. Signos de alarma explicados.");
  await expect(page.getByTestId("nota-analisis")).toHaveText("Cefalea tensional probable.");
});
