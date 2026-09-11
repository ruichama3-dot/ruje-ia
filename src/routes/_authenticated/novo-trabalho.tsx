import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { generateWork } from "@/lib/works.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/novo-trabalho")({
  head: () => ({
    meta: [
      { title: "Criar novo trabalho | RuJe IA" },
      { name: "description", content: "Preencha os dados académicos e deixe a IA escrever o seu trabalho." },
      { property: "og:title", content: "Criar novo trabalho | RuJe IA" },
      { property: "og:description", content: "A IA escreve o seu trabalho académico completo." },
    ],
  }),
  component: NovoTrabalho,
});

const WORK_TYPES = [
  "Trabalho Escolar",
  "Trabalho Científico",
  "Monografia",
  "Projeto de Pesquisa",
  "Relatório",
  "Artigo Científico",
  "Seminário",
  "Revisão Bibliográfica",
  "Estudo de Caso",
  "Dissertação",
  "TCC",
];
const LEVELS = ["Ensino Médio", "Ensino Técnico", "Licenciatura", "Mestrado", "Doutoramento"];
const LANGS = ["Português", "Inglês", "Francês", "Espanhol"];
const NORMS = ["APA", "ABNT", "Vancouver"];

function Field({ id, label, ...rest }: { id: string; label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={id} {...rest} />
    </div>
  );
}

function Sel({ id, label, options }: { id: string; label: string; options: string[] }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={id}
        className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function NovoTrabalho() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const generate = useServerFn(generateWork);
  const [busy, setBusy] = useState(false);
  const [opts, setOpts] = useState({ cover: true, index: true, citations: true, references: true });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    setBusy(true);
    try {
      const { data: work, error } = await supabase
        .from("works")
        .insert({
          user_id: user.id,
          theme: s("theme"),
          title: s("title") || s("theme"),
          work_type: s("work_type"),
          student_name: s("student_name"),
          student_number: s("student_number"),
          course: s("course"),
          class_group: s("class_group"),
          grade_year: s("grade_year"),
          institution: s("institution"),
          faculty: s("faculty"),
          department: s("department"),
          subject: s("subject"),
          teacher: s("teacher"),
          city: s("city"),
          country: s("country"),
          due_date: s("due_date") || null,
          pages: Number(f.get("pages")) || 10,
          language: s("language"),
          academic_level: s("academic_level"),
          norms: s("norms"),
          options: opts,
        })
        .select()
        .single();
      if (error) throw error;
      toast.info("A IA está a escrever o seu trabalho… pode demorar 1 a 3 minutos.");
      await generate({ data: { workId: work.id } });
      toast.success("Trabalho gerado!");
      navigate({ to: "/trabalho/$id", params: { id: work.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o trabalho.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <h1 className="text-3xl font-extrabold">Criar novo trabalho</h1>
      <p className="text-muted-foreground mt-1">Quanto mais completo o formulário, melhor o resultado.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-6">
        <section className="shadow-soft rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Informações académicas</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="theme">Tema do trabalho</Label>
              <Textarea id="theme" name="theme" required rows={2} placeholder="Ex.: Impacto das energias renováveis em Moçambique" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="title" label="Título do trabalho" />
              <Sel id="work_type" label="Tipo de trabalho" options={WORK_TYPES} />
              <Field id="student_name" label="Nome do estudante" />
              <Field id="student_number" label="Número do estudante" />
              <Field id="course" label="Curso" />
              <Field id="class_group" label="Turma" />
              <Field id="grade_year" label="Classe / Ano" />
              <Field id="institution" label="Instituição de ensino" />
              <Field id="faculty" label="Faculdade" />
              <Field id="department" label="Departamento" />
              <Field id="subject" label="Disciplina" />
              <Field id="teacher" label="Nome do docente" />
              <Field id="city" label="Cidade" defaultValue="Maputo" />
              <Field id="country" label="País" defaultValue="Moçambique" />
              <Field id="due_date" label="Data de entrega" type="date" />
            </div>
          </div>
        </section>

        <section className="shadow-soft rounded-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-bold">Configurações</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="pages" label="Quantidade de páginas" type="number" min={2} max={60} defaultValue={10} />
            <Sel id="language" label="Idioma" options={LANGS} />
            <Sel id="academic_level" label="Nível académico" options={LEVELS} />
            <Sel id="norms" label="Normas" options={NORMS} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["cover", "Gerar capa automática"],
              ["index", "Gerar índice automático"],
              ["citations", "Inserir citações automáticas"],
              ["references", "Referências automáticas"],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center justify-between rounded-xl border border-border px-4 py-2.5 text-sm">
                {label}
                <Switch
                  checked={opts[k as keyof typeof opts]}
                  onCheckedChange={(v) => setOpts((o) => ({ ...o, [k as string]: v }))}
                />
              </label>
            ))}
          </div>
        </section>

        <Button type="submit" size="lg" className="shadow-brand w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          {busy ? "A gerar o trabalho…" : "Gerar trabalho com IA"}
        </Button>
      </form>
    </main>
  );
}
