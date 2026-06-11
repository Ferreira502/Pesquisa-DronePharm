import type { ReactElement } from "react";

const PAGE_CLASS_NAME =
  "flex min-h-[calc(100dvh-56px)] flex-col bg-background px-6 py-8";
const CARD_CLASS_NAME =
  "mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl border border-border bg-card p-6";

export default function PedidoCreatePage(): ReactElement {
  return (
    <section className={PAGE_CLASS_NAME}>
      <div className={CARD_CLASS_NAME}>
        <h1 className="text-xl font-semibold text-foreground">
          Novo Pedido
        </h1>
        <p className="text-sm text-muted-foreground">
          A rota de cadastro foi conectada e está pronta para receber o formulário.
        </p>
      </div>
    </section>
  );
}
