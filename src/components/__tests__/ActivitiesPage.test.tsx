import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ActivitiesPage from "@/src/app/activities/page";

const replaceMock = jest.fn();
const routerMock = {
  replace: replaceMock,
};

jest.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

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
    jest.clearAllMocks();
    replaceMock.mockReset();
  });

  it("renderuje aktivnosti za ulogovanog korisnika", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
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
        } as Response);
      }

      if (url.includes("/api/activities?date=")) {
        return Promise.resolve({
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
        } as Response);
      }

      return Promise.reject(new Error("Nepoznat fetch poziv"));
    }) as jest.Mock;

    render(<ActivitiesPage />);

    expect(await screen.findByText("Aktivnosti")).toBeInTheDocument();
    expect(await screen.findByText("Rad na UI")).toBeInTheDocument();
    expect(screen.getByText("Dorada forme")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("prikazuje gresku kada dodavanje aktivnosti ne uspe", async () => {
    const user = userEvent.setup();

    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
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
        } as Response);
      }

      if (url.includes("/api/activities?date=") && method === "GET") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            activities: [],
          }),
        } as Response);
      }

      if (url === "/api/activities" && method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({
            error: "Vreme zavrsetka mora biti posle vremena pocetka.",
          }),
        } as Response);
      }

      return Promise.reject(new Error("Nepoznat fetch poziv"));
    }) as jest.Mock;

    render(<ActivitiesPage />);

    expect(await screen.findByText("Aktivnosti")).
toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dodaj aktivnost/i }));

    await user.type(
      screen.getByPlaceholderText("Npr. Rad na korisničkom interfejsu"),
      "Nova aktivnost"
    );

    const timeInputs = document.querySelectorAll('input[type="time"]');
    const vremeOd = timeInputs[0] as HTMLInputElement;
    const vremeDo = timeInputs[1] as HTMLInputElement;

    await user.clear(vremeOd);
    await user.type(vremeOd, "12:00");

    await user.clear(vremeDo);
    await user.type(vremeDo, "10:00");

    await user.click(
      screen.getByRole("button", { name: /sačuvaj aktivnost/i })
    );

    expect(
      await screen.findByText("Vreme zavrsetka mora biti posle vremena pocetka.")
    ).toBeInTheDocument();
  });
});
