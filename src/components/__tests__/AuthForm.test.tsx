import { render, screen } from "@testing-library/react";
import AuthForm from "../AuthForm";
import userEvent from "@testing-library/user-event";

// mock router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// mock AuthProvider hook
jest.mock("../AuthProvider", () => ({
  useAuth: () => ({
    refresh: jest.fn(),
    logout: jest.fn(),
  }),
}));

describe("AuthForm", () => {
    //prvi test
    beforeEach(() => {
        jest.resetAllMocks();
});
    it("renderuje formu za prijavu zaposlenog", () => {
        render(<AuthForm mode="login" />);

    expect(
        screen.getByText("Prijava zaposlenog")
    ).toBeInTheDocument();

    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Lozinka")).toBeInTheDocument();

    expect(
        screen.getByRole("button", { name: /prijavi se/i })
    ).toBeInTheDocument();
  });
  //drugi test

  it("prikazuje grešku kada login API vrati 401", async () => {
  const user = userEvent.setup();

  // 1) mock fetch: prvi poziv je /api/auth/login i vraća 401 + error poruku
  global.fetch = jest.fn().mockResolvedValueOnce({
    ok: false,
    status: 401,
    json: async () => ({ error: "Pogrešni kredencijali." }),
  } as any);

  render(<AuthForm mode="login" />);

  // 2) popuni polja
  await user.type(screen.getByPlaceholderText("Email"), "test@test.com");
  await user.type(screen.getByPlaceholderText("Lozinka"), "pogresna");

  // 3) klikni submit
  await user.click(screen.getByRole("button", { name: /prijavi se/i }));

  // 4) očekuj poruku greške na ekranu
  expect(await screen.findByText("Pogrešni kredencijali.")).toBeInTheDocument();

  // 5) (opciono) proveri da je fetch pozvan bar jednom
  expect(global.fetch).toHaveBeenCalled();
});
});