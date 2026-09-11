import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GenerateInput = z.object({ workId: z.string().uuid() });

function buildPrompt(w: Record<string, unknown>) {
  const opt = (w.options ?? {}) as Record<string, boolean>;
  const f = (k: string) => (w[k] ? String(w[k]) : "—");
  return `És um assistente académico especialista. Escreve um trabalho académico COMPLETO em ${f("language")}, do tipo "${f("work_type")}", nível ${f("academic_level")}, seguindo rigorosamente as normas ${f("norms")}.

DADOS:
- Tema: ${f("theme")}
- Título: ${f("title")}
- Estudante: ${f("student_name")} (nº ${f("student_number")})
- Curso: ${f("course")} | Turma: ${f("class_group")} | Classe/Ano: ${f("grade_year")}
- Instituição: ${f("institution")} | Faculdade: ${f("faculty")} | Departamento: ${f("department")}
- Disciplina: ${f("subject")} | Docente: ${f("teacher")}
- Local: ${f("city")}, ${f("country")} | Data de entrega: ${f("due_date")}
- Extensão alvo: aproximadamente ${f("pages")} páginas (escreve texto extenso e denso, sem repetições).

ESTRUTURA OBRIGATÓRIA, por esta ordem:
${opt.cover === false ? "" : "1. Capa\n2. Folha de Rosto\n"}${opt.index === false ? "" : "3. Índice\n"}4. Introdução
5. Objetivo Geral
6. Objetivos Específicos
7. Fundamentação Teórica
8. Desenvolvimento (com subtítulos)
9. Metodologia
10. Resultados
11. Discussão
12. Conclusão
13. Recomendações
14. Referências Bibliográficas${opt.citations === false ? "" : " (com citações no corpo do texto)"}
15. Anexos (se aplicável)

REGRAS DE SAÍDA:
- Devolve APENAS HTML simples do corpo do documento: <h1>, <h2>, <h3>, <p>, <ul>, <li>, <table>, <strong>. Sem markdown, sem \`\`\`, sem <html> ou <body>.
- A capa deve ser centrada com <p style="text-align:center"> contendo instituição, faculdade, departamento, curso, título, estudante, docente, cidade e data.
- Linguagem académica formal, rigorosa e original. Nada de texto de exemplo tipo "insira aqui".`;
}

export const generateWork = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Serviço de IA indisponível.");

    const { data: work, error } = await context.supabase
      .from("works")
      .select("*")
      .eq("id", data.workId)
      .single();
    if (error || !work) throw new Error("Trabalho não encontrado.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        stream: true,
        messages: [{ role: "user", content: buildPrompt(work as Record<string, unknown>) }],
      }),
    });

    if (!res.ok || !res.body) {
      if (res.status === 429) throw new Error("Muitos pedidos. Tente novamente daqui a instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos para continuar.");
      throw new Error(`Falha na geração (${res.status}).`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const json = JSON.parse(payload) as {
            choices?: { delta?: { content?: string } }[];
          };
          content += json.choices?.[0]?.delta?.content ?? "";
        } catch {
          /* ignore partial chunks */
        }
      }
    }

    const html = content
      .replace(/^```(?:html)?/i, "")
      .replace(/```$/i, "")
      .trim();
    if (!html) throw new Error("A IA não devolveu conteúdo. Tente novamente.");

    const { error: upErr } = await context.supabase
      .from("works")
      .update({ content: html })
      .eq("id", data.workId);
    if (upErr) throw new Error(upErr.message);

    return { content: html };
  });
