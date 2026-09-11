import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  List,
  ListOrdered,
  Image as ImageIcon,
  Table as TableIcon,
  Save,
  FileDown,
  FileText,
  Share2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/trabalho/$id")({
  head: () => ({
    meta: [
      { title: "Editor de trabalho | RuJe IA" },
      { name: "description", content: "Edite, formate e exporte o seu trabalho académico." },
      { property: "og:title", content: "Editor de trabalho | RuJe IA" },
      { property: "og:description", content: "Edite e exporte o seu trabalho em PDF ou Word." },
    ],
  }),
  component: Editor,
});

const FONTS = ["Times New Roman", "Arial", "Calibri", "Georgia", "Verdana"];
const SIZES = ["1", "2", "3", "4", "5", "6", "7"];

function Editor() {
  const { id } = Route.useParams();
  const ref = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);

  const { data: work } = useQuery({
    queryKey: ["work", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("works").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (work && ref.current && !ref.current.innerHTML) ref.current.innerHTML = work.content;
  }, [work]);

  const cmd = (command: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, value);
  };

  async function save() {
    if (!ref.current) return;
    setSaving(true);
    const { error } = await supabase.from("works").update({ content: ref.current.innerHTML }).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Alterações guardadas.");
  }

  function exportDocx() {
    if (!ref.current || !work) return;
    const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.6}p{text-align:justify}</style></head><body>${ref.current.innerHTML}</body></html>`;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${work.title}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    void supabase
      .from("works")
      .update({ download_count: (work.download_count ?? 0) + 1 })
      .eq("id", id);
  }

  function insertImage() {
    const url = window.prompt("Cole o link da imagem:");
    if (url) cmd("insertImage", url);
  }

  function insertTable() {
    const cols = Number(window.prompt("Número de colunas:", "3")) || 3;
    const rows = Number(window.prompt("Número de linhas:", "3")) || 3;
    const body = Array.from({ length: rows })
      .map(() => `<tr>${"<td>&nbsp;</td>".repeat(cols)}</tr>`)
      .join("");
    cmd("insertHTML", `<table>${body}</table><p><br/></p>`);
  }

  async function share() {
    const { error } = await supabase.from("works").update({ is_public: true }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const link = `${window.location.origin}/partilha/${id}`;
    await navigator.clipboard.writeText(link).catch(() => undefined);
    toast.success("Link de partilha copiado!");
  }

  const btn = "inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent";

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold">{work?.title ?? "A carregar…"}</h1>
          <p className="text-muted-foreground text-sm">{work?.work_type}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={saving}>
            <Save className="h-4 w-4" /> Guardar
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportDocx}>
            <FileText className="h-4 w-4" /> Word
          </Button>
          <Button variant="outline" onClick={share}>
            <Share2 className="h-4 w-4" /> Partilhar
          </Button>
        </div>
      </div>

      <div className="shadow-soft sticky top-16 z-20 mt-5 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-2 print:hidden">
        <select
          onChange={(e) => cmd("fontName", e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          defaultValue="Times New Roman"
        >
          {FONTS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          onChange={(e) => cmd("fontSize", e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          defaultValue="3"
        >
          {SIZES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button type="button" className={btn} onClick={() => cmd("bold")} aria-label="Negrito">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => cmd("italic")} aria-label="Itálico">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => cmd("underline")} aria-label="Sublinhado">
          <Underline className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => cmd("justifyLeft")} aria-label="Alinhar à esquerda">
          <AlignLeft className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => cmd("justifyCenter")} aria-label="Centrar">
          <AlignCenter className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => cmd("justifyFull")} aria-label="Justificar">
          <AlignJustify className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => cmd("insertUnorderedList")} aria-label="Lista">
          <List className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => cmd("insertOrderedList")} aria-label="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={insertImage} aria-label="Inserir imagem">
          <ImageIcon className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={insertTable} aria-label="Inserir tabela">
          <TableIcon className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className="doc-sheet shadow-soft mt-5 min-h-[60vh] rounded-2xl border border-border bg-white p-8 outline-none sm:p-14"
      />
    </main>
  );
}
