import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENT_METHODS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookOpen, CalendarDays, Search, LockKeyhole, BrainCircuit, FileText, Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/exames")({
  head: () => ({
    meta: [
      { title: "Comprar Exames da 12.ª Classe | RuJe IA" },
      { name: "description", content: "Exames da 12.ª classe de Moçambique, organizados por ano e disciplina, com apoio de estudo por IA." },
    ],
  }),
  component: ExamesPage,
});

// The catalogue lists only files supplied by the user; paid files must be imported into protected storage before access is enabled.
type Exam = { id: string; year: number; subject: string; label: string; sourceFile: string; status: "pending_import" };
const EXAMS: Exam[] = [
  { id: "quimica-2020-1a-epoca", year: 2020, subject: "Química", label: "1.ª época", sourceFile: "Quimica-2020-12a-Classe-1a-Epoca.pdf", status: "pending_import" },
  { id: "quimica-2020-2a-epoca", year: 2020, subject: "Química", label: "2.ª época", sourceFile: "Quimica-2020-12a-Classe-2a-Epoca.pdf", status: "pending_import" },
  { id: "quimica-2021-1a-chamada", year: 2021, subject: "Química", label: "1.ª chamada", sourceFile: "Quimica-2021-12a-classe-1a-chamada.pdf", status: "pending_import" },
  { id: "quimica-2022-1a-chamada", year: 2022, subject: "Química", label: "1.ª chamada", sourceFile: "Quimica-2022-12a-classe-1a-chamada.pdf", status: "pending_import" },
  { id: "quimica-2022-2a-chamada", year: 2022, subject: "Química", label: "2.ª chamada", sourceFile: "Quimica-2022-da-12a-classe-2a-chamada.pdf", status: "pending_import" },
];
const SUBJECTS = ["Biologia", "Desenho e Geometria Descritiva (DGD)", "Filosofia", "Física", "Francês", "Geografia", "História", "Inglês", "Matemática", "Português", "Química"];
const RECEIVED_SUBJECTS = new Set(["Química"]);

function ExamesPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [year, setYear] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showPurchase, setShowPurchase] = useState(false);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: requests = [] } = useQuery({
    queryKey: ["exam-purchase-requests", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_requests")
        .select("id, status, amount, plan, created_at")
        .eq("user_id", user.id)
        .eq("plan", "Pacote de Exames da 12.ª Classe")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => EXAMS.filter((exam) =>
    (year === null || exam.year === year) &&
    (exam.subject + " " + exam.label + " " + exam.year).toLocaleLowerCase().includes(search.toLocaleLowerCase())
  ), [year, search]);

  async function submitPurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const selectedMethod = PAYMENT_METHODS.find((item) => item.id === method);
    if (!selectedMethod) {
      toast.error("Escolha um método de pagamento.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("payment_requests").insert({
      user_id: user.id,
      plan: "Pacote de Exames da 12.ª Classe",
      amount: 125,
      method: selectedMethod.name,
      full_name: String(form.get("full_name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      proof: String(form.get("proof") ?? "").trim(),
    });
    setBusy(false);
    if (error) {
      toast.error("Não foi possível enviar o pedido. Tente novamente.");
      return;
    }
    setSent(true);
    void queryClient.invalidateQueries({ queryKey: ["exam-purchase-requests", user.id] });
    toast.success("Pedido enviado para análise. O acesso só será concedido após confirmação.");
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-primary"><BookOpen className="h-4 w-4" /> BIBLIOTECA ACADÉMICA</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Exames da 12.ª Classe</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Encontra exames por ano e disciplina e prepara-te com materiais de estudo apoiados por inteligência artificial.</p>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:min-w-56">
          <p className="text-sm text-muted-foreground">Pacote de acesso</p>
          <p className="mt-1 text-3xl font-extrabold">125 <span className="text-base">MT</span></p>
          <p className="mt-1 text-xs text-muted-foreground">Acesso ao pacote de exames incluído</p>
          <Button className="mt-4 w-full" onClick={() => { setShowPurchase((value) => !value); setSent(false); }}>
            <LockKeyhole className="mr-2 h-4 w-4" /> Comprar exames
          </Button>
        </div>
      </div>

      {showPurchase && (
        <section className="mt-6 rounded-2xl border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-bold">Solicitar compra do pacote</h2>
          <p className="mt-1 text-sm text-muted-foreground">Preço: 125 MT. Envia os dados abaixo e o comprovativo para análise da equipa RuJe IA. O envio do pedido não confirma automaticamente o pagamento nem desbloqueia os exames.</p>
          {sent ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl bg-primary/5 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
              <div><p className="font-semibold">Pedido enviado</p><p className="text-sm text-muted-foreground">Consulta o estado do pedido abaixo. O acesso depende da confirmação do pagamento e da disponibilização dos ficheiros.</p></div>
            </div>
          ) : (
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={submitPurchase}>
              <div className="grid gap-2"><Label htmlFor="exam-full-name">Nome completo</Label><Input id="exam-full-name" name="full_name" required autoComplete="name" /></div>
              <div className="grid gap-2"><Label htmlFor="exam-phone">Número usado no pagamento</Label><Input id="exam-phone" name="phone" required inputMode="tel" placeholder="Ex.: 84/85/86..." /></div>
              <div className="grid gap-2"><Label htmlFor="exam-method">Método de pagamento</Label><select id="exam-method" value={method} onChange={(event) => setMethod(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{PAYMENT_METHODS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
              <div className="grid gap-2"><Label htmlFor="exam-proof">Referência ou comprovativo</Label><Input id="exam-proof" name="proof" required placeholder="Referência da transação ou link do comprovativo" /></div>
              <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{busy ? "A enviar..." : "Enviar pedido de compra"}</Button></div>
            </form>
          )}
        </section>
      )}

      {requests.length > 0 && (
        <section className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="font-bold">Os teus pedidos de compra</h2>
          <div className="mt-3 space-y-2">{requests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
              <span>{new Date(request.created_at).toLocaleDateString("pt-PT")} · {request.amount} MT</span>
              <span className="rounded-full bg-secondary px-3 py-1 capitalize">{request.status === "pending" ? "Em análise" : request.status}</span>
            </div>
          ))}</div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="text-2xl font-bold">Explorar por ano</h2><p className="mt-1 text-sm text-muted-foreground">Seleciona um ano para consultar os exames registados. Os ficheiros só ficam disponíveis após importação segura.</p></div>
          <div className="relative w-full sm:max-w-xs"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Pesquisar disciplina..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[2020, 2021, 2022, 2023, 2024, 2025].map((item) => (
            <button key={item} onClick={() => setYear(year === item ? null : item)} className={`rounded-2xl border p-4 text-left transition-colors hover:border-primary/50 ${year === item ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card"}`}>
              <CalendarDays className="h-5 w-5 text-primary" /><p className="mt-3 text-2xl font-extrabold">{item}</p><p className="text-xs text-muted-foreground">{EXAMS.filter((exam) => exam.year === item).length} registados</p>
            </button>
          ))}
        </div>
        {year !== null && <div className="mt-4 flex items-center justify-between"><p className="text-sm font-medium">Exames de {year}</p><Button variant="ghost" size="sm" onClick={() => setYear(null)}>Ver todos os anos</Button></div>}
        {filtered.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed p-8 text-center sm:p-12">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-bold">Os exames estão a ser preparados</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Ainda não há ficheiros de exames importados para este catálogo. Assim que os documentos oficiais forem adicionados, aparecerão aqui separados por ano e disciplina.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">{filtered.map((exam) => (
            <article key={exam.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3"><FileText className="mt-1 h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><h3 className="font-semibold">{exam.subject}</h3><p className="text-sm text-muted-foreground">{exam.year} · {exam.label}</p><p className="mt-1 break-all text-xs text-muted-foreground">Ficheiro recebido: {exam.sourceFile}</p><p className="mt-2 text-xs font-medium text-amber-600">A aguardar importação segura</p></div></div>
              <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" disabled><LockKeyhole className="mr-2 h-4 w-4" /> Abrir exame</Button><Button disabled><BrainCircuit className="mr-2 h-4 w-4" /> Estudar com IA</Button></div>
            </article>
          ))}</div>
        )}
      </section>
      <section className="mt-10 rounded-2xl border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-xl font-bold">Disciplinas da 12.ª classe</h2><p className="mt-1 text-sm text-muted-foreground">Lista de referência para organizar o catálogo de exames nacionais de Moçambique.</p></div>
          <span className="rounded-full bg-secondary px-3 py-1 text-sm font-semibold">{SUBJECTS.length - RECEIVED_SUBJECTS.size} por reunir</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SUBJECTS.map((subject) => {
            const received = RECEIVED_SUBJECTS.has(subject);
            return <div key={subject} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span>{subject}</span><span className={received ? "shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary" : "shrink-0 rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground"}>{received ? "Recebido" : "Em falta"}</span></div>;
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Lista de referência baseada em listas públicas de exames finais. A oferta exacta pode variar conforme o regime e o ano.</p>
      </section>
      <p className="mt-8 text-center text-xs text-muted-foreground">RuJe IA 🇲🇿 · Conteúdos organizados para apoiar a preparação académica. A disponibilidade dos exames depende da importação dos ficheiros correspondentes.</p>
    </main>
  );
}
