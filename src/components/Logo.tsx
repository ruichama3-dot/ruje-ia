export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12 text-lg" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${box} bg-brand shadow-brand grid place-items-center rounded-xl font-bold tracking-tight text-primary-foreground`}
      >
        RJ
      </span>
      <span className={`${text} font-display font-bold tracking-tight`}>
        RuJe <span className="text-brand-gradient">IA</span> <span aria-hidden>🇲🇿</span>
      </span>
    </span>
  );
}
