import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Table from "../table";

describe("Table", () => {
  const columns = [
    { header: "Naziv", accessor: "title" },
    { header: "Vreme od", accessor: "startTime" },
  ];

  it("renderuje zaglavlja i redove sa podacima", () => {
    const data = [
      { id: 1, title: "Sastanak", startTime: "09:00:00" },
      { id: 2, title: "Kodiranje", startTime: "10:00:00" },
    ];

    render(<Table columns={columns} data={data} />);

    // headeri
    expect(screen.getByText("Naziv")).toBeInTheDocument();
    expect(screen.getByText("Vreme od")).toBeInTheDocument();

    // podaci
    expect(screen.getByText("Sastanak")).toBeInTheDocument();
    expect(screen.getByText("09:00:00")).toBeInTheDocument();
    expect(screen.getByText("Kodiranje")).toBeInTheDocument();
    expect(screen.getByText("10:00:00")).toBeInTheDocument();
  });

  it('kada nema podataka prikazuje poruku "Nema aktivnosti za izabrani datum"', () => {
    render(<Table columns={columns} data={[]} />);

    expect(
      screen.getByText("Nema aktivnosti za izabrani datum")
    ).toBeInTheDocument();
  });

  it("kada je selectable, klik na checkbox reda poziva onToggleRow sa id-jem", async () => {
    const user = userEvent.setup();

    const data = [
      { id: 10, title: "Sastanak", startTime: "09:00:00" },
      { id: 11, title: "Kodiranje", startTime: "10:00:00" },
    ];

    const onToggleRow = jest.fn();

    render(
      <Table
        columns={columns}
        data={data}
        selectable={true}
        selectedIds={[]}
        onToggleRow={onToggleRow}
      />
    );

    // kad je selectable, postoje checkbox-i: 1 u headeru + 2 reda = ukupno 3
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(3);

    // klik na checkbox prvog reda (index 1, jer je index 0 header)
    await user.click(checkboxes[1]);

    expect(onToggleRow).toHaveBeenCalledWith(10);
  });
});