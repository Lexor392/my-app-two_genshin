import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import App, { BossOption, buildTravelerDuoCharacters } from "./App";
import { translations } from "./i18n/translations";

vi.mock("./services/locale", () => ({
  fetchVisitorCountry: vi.fn().mockResolvedValue(null),
  getBrowserLanguage: vi.fn().mockReturnValue("ru"),
  getLanguageForCountry: vi.fn().mockReturnValue(null),
}));

vi.mock("./services/genshinApi", () => ({
  applyBundledCharacterImages: (characters = []) => characters,
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

afterEach(() => cleanup());

test("renders app shell", async () => {
  render(<App />);

  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /главная/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /пул персонажей/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /пул боссов/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /настройки/i })).toBeInTheDocument();

  expect((await screen.findAllByText(/fandom api/i)).length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole("button", { name: /настройки/i }));
  expect(screen.getByRole("button", { name: "5 сек." })).toHaveClass("is-active");
  fireEvent.click(screen.getByRole("button", { name: "8 сек." }));
  expect(screen.getByRole("button", { name: "8 сек." })).toHaveClass("is-active");
  expect(screen.getByRole("option", { name: "English" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "中文" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "日本語" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "한국어" })).toBeInTheDocument();
});

test("opens the support form from the sidebar and shows the unconfigured state", async () => {
  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: /написать в поддержку/i }));
  expect(screen.getByRole("dialog", { name: /написать в поддержку/i })).toBeInTheDocument();
  expect(screen.getByText(/приём обращений ещё не подключён/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /отправить сообщение/i })).toBeDisabled();
});

test("opens the donation page from the sidebar", async () => {
  render(<App />);

  fireEvent.click(await screen.findByRole("button", { name: /поддержать проект/i }));
  expect(screen.getByRole("heading", { name: /поддержать проект/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /открыть donatello/i })).toHaveAttribute("href", "https://donatello.to/MixBrend392");
  expect(screen.getByRole("link", { name: /открыть nowpayments/i })).toHaveAttribute("href", "https://nowpayments.io/donation/alex");
  expect(screen.getByText(/платежи из рф и от банков под санкциями могут быть отклонены/i)).toBeInTheDocument();
});

test("provides support and donation labels in all site languages", () => {
  for (const language of Object.values(translations)) {
    expect(language.supportMenu).toBeTruthy();
    expect(language.donateMenu).toBeTruthy();
    expect(language.supportSend).toBeTruthy();
    expect(language.donateDonatello).toBeTruthy();
    expect(language.donateCountryLimit).toBeTruthy();
    expect(language.donateNowpayments).toBeTruthy();
  }
});

test("combines both Travelers into one API-driven card for every available element", () => {
  const catalog = buildTravelerDuoCharacters([
    { id: "aether", name: "Aether", image: "aether.png" },
    { id: "lumine", name: "Lumine", image: "lumine.png" },
    { id: "xiao", name: "Xiao", element: "ANEMO" },
    { id: "zhongli", name: "Zhongli", element: "GEO" },
    { id: "citlali", name: "Citlali", element: "CRYO" },
  ]);
  const reloadedCatalog = buildTravelerDuoCharacters(catalog);

  expect(catalog.some((item) => item.id === "aether" || item.id === "lumine")).toBe(false);
  expect(catalog.filter((item) => item.id.startsWith("traveler-duo-")).map((item) => item.element)).toEqual([
    "ANEMO", "GEO", "CRYO",
  ]);
  expect(catalog.find((item) => item.id === "traveler-duo-cryo")).toMatchObject({
    duoArtwork: expect.stringContaining("traveler-twins.webp"),
    travelerImages: expect.arrayContaining([
      expect.objectContaining({ id: "aether" }),
      expect.objectContaining({ id: "lumine" }),
    ]),
  });
  expect(reloadedCatalog.filter((item) => item.id.startsWith("traveler-duo-")).map((item) => item.id)).toEqual([
    "traveler-duo-anemo", "traveler-duo-geo", "traveler-duo-cryo",
  ]);
});

test("renders a boss pool row without referencing removed name-shape filters", () => {
  render(
    <BossOption
      item={{ id: "weekly-boss", name: "Test Weekly Boss", group: "weekly", image: "/assets/bosses/andrius.webp" }}
      lang="en"
      selected={false}
      onToggle={vi.fn()}
      viewMode="list"
      t={translations.en}
    />
  );

  expect(screen.getByText("Test Weekly Boss")).toBeInTheDocument();
});
