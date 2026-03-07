import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivitiesPage from "@/src/app/activities/page";

// mock router
const replaceMock = jest.fn();
const routerMock = {
  replace: replaceMock,
};

jest.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

// mock Button da ne zavisimo od interne implementacije
jest.mock("@/src/components/button", () => {
  return function MockButton({
    text,
    onClick,
    disabled,
    type,
  }: {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit";
  }) {
    return (
      <button type={type ?? "button"} onClick={onClick} disabled={disabled}>
        {text}
      </button>
    );
  };
});

// mock Table da test ne zavisi od cele table implementacije
jest.mock("@/src/components/table", () => {
  return function MockTable({
    data,
  }: {
    data: Array<{
      id: number;
      title: string;
      description: string | null;
      startTime: string;
      endTime: string;
    }>;
  }) {
    return (
      <div data-testid="activities-table">
        {data.map((row) => (
          <div key={row.id}>
            <span>{row.title}</span>
            <span>{row.description}</span>
            <span>{row.startTime}</span>
            <span>{row.endTime}</span>
          </div>
        ))}
      </div>
    );
  };
});

describe("ActivitiesPage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    replaceMock.mockReset();
    global.fetch=jest.fn() as jest.Mock;
  });

  it("renderuje aktivnosti za ulogovanog korisnika", async () => {
    global.fetch = jest
      .fn()
      // /api/auth/me
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 1,
            fullName: "Andjela Kandic",
            email: "andjela@gmail.com",
            roleId: 3,
          },
        }),
      } as any)
      // /api/activities?date=...
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          activities: [
            {
              id: 1,
              title: "Rad na UI",
              description: "Dorada forme",
              startTime: "09:00:00",
              endTime: "11:00:00",
            },
          ],
        }),
      } as any);

    render(<ActivitiesPage />);

    expect(await screen.findByText("Aktivnosti")).toBeInTheDocument();
    expect(await screen.findByText("Rad na UI")).toBeInTheDocument();
    expect(screen.getByText("Dorada forme")).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("prikazuje gresku kada dodavanje aktivnosti ne uspe", async () => {
    const user = userEvent.setup();

    global.fetch = jest
      .fn()
      // /api/auth/me
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          user: {
            id: 1,
            fullName: "Andjela Kandic",
            email: "andjela@gmail.com",
            roleId: 3,
          },
        }),
      } as any)
      // initial GET /api/activities?date=...
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          activities: [],
        }),
      } as any)
      // POST /api/activities
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: "Vreme zavrsetka mora biti posle vremena pocetka.",
        }),
      } as any);

    render(<ActivitiesPage />);

    expect(await screen.findByText("Aktivnosti")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dodaj aktivnost/i }));

    await user.type(
      screen.getByPlaceholderText("Npr. Rad na korisničkom interfejsu"),
      "Nova aktivnost"
    );

    const timeInputs = screen.getAllByDisplayValue("");
    await user.type(timeInputs[0], "12:00");
    await user.type(timeInputs[1], "10:00");

    await user.click(
      screen.getByRole("button", { name: /sačuvaj aktivnost/i })
    );
    expect(
      await screen.findByText("Vreme zavrsetka mora biti posle vremena pocetka.")
    ).toBeInTheDocument();
  });
});
