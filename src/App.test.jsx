import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import App from "./App";

vi.mock("./services/genshinApi", () => ({
  fetchFallbackImage: vi.fn().mockResolvedValue(null),
  fetchGenshinData: vi.fn().mockResolvedValue({
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

  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /главная/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /пул персонажей/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /пул боссов/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /настройки/i })).toBeInTheDocument();

  expect((await screen.findAllByText(/fandom api/i)).length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: /настройки/i }));
  expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "中文" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "日本語" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "한국어" })).toBeInTheDocument();
});
