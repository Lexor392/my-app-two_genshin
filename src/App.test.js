import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./services/genshinApi", () => ({
  fetchGenshinData: jest.fn().mockResolvedValue({
    characters: [],
    bosses: {
      all: [],
      weekly: [],
      ascension: [],
      localLegends: [],
    },
    meta: {
      fetchedAt: "2026-02-11T00:00:00.000Z",
    },
  }),
}));

test("renders app shell", async () => {
  render(<App />);

  expect(screen.getByText(/genshin impact random lab/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /дашборд/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /пул персонажей/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /пул боссов/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /настройки/i })).toBeInTheDocument();

  expect(await screen.findByText(/fandom api/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /настройки/i }));
  expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "中文" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "日本語" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "한국어" })).toBeInTheDocument();
});
