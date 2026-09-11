import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/partilha/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Trabalho partilhado | RuJe IA" },
      { name: "description", content: "Trabalho académico partilhado através da RuJe IA." },
      { property: "og:title", content: "Trabalho partilhado | RuJe IA" },
      { property: "og:description", content: "Trabalho académico partilhado através da RuJe IA." },
    ],
  }),
  component: Partilha,
});

function Partilha() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["shared", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("title, work_type, content")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <Logo size="sm" />
      {isLoading ? (
        <p className="text-muted-foreground mt-8">A carregar…</p>
      ) : !data ? (
        <p className="text-muted-foreground mt-8">Este trabalho não está disponível.</p>
      ) : (
        <>
          <h1 className="mt-6 text-2xl font-extrabold">{data.title}</h1>
          <p className="text-muted-foreground text-sm">{data.work_type}</p>
          <div
            className="doc-sheet shadow-soft mt-6 rounded-2xl border border-border bg-white p-8 sm:p-14"
            dangerouslySetInnerHTML={{ __html: data.content }}
          />
        </>
      )}
    </main>
  );
}
