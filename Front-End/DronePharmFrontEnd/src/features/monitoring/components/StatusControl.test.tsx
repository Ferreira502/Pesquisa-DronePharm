import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import type { PedidoStatus } from "@/types/api";

import { StatusControl } from "./StatusControl";

const makeProps = (status: PedidoStatus) => ({
  status,
  pedidoId: 1,
  onCancelar: vi.fn(),
  onEntregar: vi.fn(),
});

describe("StatusControl", () => {
  it("status='em_voo' -> mantem entrega manual e abortar simulacao disponiveis", () => {
    render(<StatusControl {...makeProps("em_voo")} />);

    expect(
      screen.getByRole("button", { name: "Confirmar Entrega Manual" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Abortar Simulação" }),
    ).toBeDisabled();
  });

  it("status='pendente' -> botao 'Cancelar' visivel e habilitado", () => {
    render(<StatusControl {...makeProps("pendente")} />);

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeEnabled();
  });

  it("status='calculado' -> confirmar cancelamento chama onCancelar 1x", async () => {
    const user = userEvent.setup();
    const props = makeProps("calculado");

    render(<StatusControl {...props} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(
      screen.getByRole("button", { name: "Confirmar cancelamento" }),
    );

    expect(props.onCancelar).toHaveBeenCalledTimes(1);
  });

  it("status='calculado' -> cancelar dialog nao chama onCancelar", async () => {
    const user = userEvent.setup();
    const props = makeProps("calculado");

    render(<StatusControl {...props} />);

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getAllByRole("button", { name: "Fechar" })[0]);

    expect(props.onCancelar).not.toHaveBeenCalled();
  });

  it("status='entregue' -> badge visivel sem botoes de acao", () => {
    render(<StatusControl {...makeProps("entregue")} />);

    expect(screen.getAllByText("entregue")[0]).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Cancelar" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Confirmar Entrega Manual" }),
    ).toBeDisabled();
  });

  it("status='em_voo' -> botao 'Confirmar Entrega Manual' presente e habilitado", () => {
    render(<StatusControl {...makeProps("em_voo")} />);

    expect(
      screen.getByRole("button", { name: "Confirmar Entrega Manual" }),
    ).toBeEnabled();
  });
});
