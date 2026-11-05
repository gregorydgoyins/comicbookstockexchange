import { describe, it, expect } from "vitest";
import {
  generateComicSlug,
  parseComicSlug,
  getSeriesFromTicker,
  getVolumeYearFilter,
} from "../lib/equity/slug";
import { getComicById } from "../lib/comics/queries";

describe("Comic Slug Generation & Parsing Architecture", () => {
  describe("generateComicSlug", () => {
    it("generates unambiguous delimited slugs for Vol 1 Issue 1 vs Vol 1 Issue 11", () => {
      const vol1Issue1 = generateComicSlug("XMN", 1, 1);
      const vol1Issue11 = generateComicSlug("XMN", 1, 11);

      expect(vol1Issue1).toBe("XMN-V1-1");
      expect(vol1Issue11).toBe("XMN-V1-11");
      expect(vol1Issue1).not.toBe(vol1Issue11);
    });

    it("strips dollar signs and trims whitespace", () => {
      expect(generateComicSlug("$XMN ", 1, " 1 ")).toBe("XMN-V1-1");
      expect(generateComicSlug("asm", 2, 300)).toBe("ASM-V2-300");
    });
  });

  describe("parseComicSlug", () => {
    it("safely extracts ticker, volume, and issue from delimited slugs", () => {
      const p1 = parseComicSlug("XMN-V1-1");
      expect(p1).toEqual({
        ticker: "XMN",
        volume: 1,
        issue: "1",
        year: undefined,
        raw: "XMN-V1-1",
        isDelimited: true,
      });

      const p11 = parseComicSlug("XMN-V1-11");
      expect(p11).toEqual({
        ticker: "XMN",
        volume: 1,
        issue: "11",
        year: undefined,
        raw: "XMN-V1-11",
        isDelimited: true,
      });
    });

    it("parses delimited slugs with explicit year suffix", () => {
      const pYear = parseComicSlug("XMN-V1-1-1963");
      expect(pYear).toEqual({
        ticker: "XMN",
        volume: 1,
        issue: "1",
        year: 1963,
        raw: "XMN-V1-1-1963",
        isDelimited: true,
      });
    });

    it("parses legacy hyphenated slugs", () => {
      const pHyphen = parseComicSlug("XMN-1-1");
      expect(pHyphen).toEqual({
        ticker: "XMN",
        volume: 1,
        issue: "1",
        raw: "XMN-1-1",
        isDelimited: true,
      });
    });

    it("parses zero-padded canonical tickers like XMN01 to issue 1", () => {
      const pZero = parseComicSlug("XMN01");
      expect(pZero).toEqual({
        ticker: "XMN",
        volume: 1,
        issue: "1",
        raw: "XMN01",
        isDelimited: false,
      });
    });

    it("parses unpadded legacy tickers like XMN11 to issue 11", () => {
      const p11 = parseComicSlug("XMN11");
      expect(p11).toEqual({
        ticker: "XMN",
        volume: 1,
        issue: "11",
        raw: "XMN11",
        isDelimited: false,
      });
    });

    it("returns null for non-slug strings", () => {
      expect(parseComicSlug("")).toBeNull();
      expect(parseComicSlug("   ")).toBeNull();
      expect(parseComicSlug("invalid/slug/format")).toBeNull();
    });
  });

  describe("Series & Volume Year Boundaries", () => {
    it("resolves canonical series name from ticker root", () => {
      expect(getSeriesFromTicker("XMN")).toBe("X-Men");
      expect(getSeriesFromTicker("ASM")).toBe("Amazing Spider-Man");
      expect(getSeriesFromTicker("BAT")).toBe("Batman");
      expect(getSeriesFromTicker("ACT")).toBe("Action Comics");
    });

    it("enforces strict publication year ranges to prevent volume collisions", () => {
      const xmnVol1 = getVolumeYearFilter("X-Men", 1);
      const xmnVol2 = getVolumeYearFilter("X-Men", 2);

      expect(xmnVol1).toEqual({ minYear: 1963, maxYear: 1981 });
      expect(xmnVol2).toEqual({ minYear: 1991, maxYear: 2001 });

      // Ensures 1991 Jim Lee X-Men does not overlap with 1963 Silver Age X-Men
      expect(xmnVol1!.maxYear).toBeLessThan(xmnVol2!.minYear);
    });
  });

  describe("Database Query Resolution via getComicById", () => {
    it("resolves XMN-V1-1 strictly to 1963 X-Men #1", async () => {
      const comic = await getComicById("XMN-V1-1");
      expect(comic).not.toBeNull();
      expect(comic?.series).toBe("X-Men");
      expect(String(comic?.issue_number)).toBe("1");
      expect(Number(comic?.publication_year)).toBe(1963);
    });

    it("resolves XMN-V1-11 strictly to 1965 X-Men #11", async () => {
      const comic = await getComicById("XMN-V1-11");
      expect(comic).not.toBeNull();
      expect(comic?.series).toBe("X-Men");
      expect(String(comic?.issue_number)).toBe("11");
      expect(Number(comic?.publication_year)).toBe(1965);
    });

    it("resolves legacy XMN11 to 1965 X-Men #11 without crashing", async () => {
      const comic = await getComicById("XMN11");
      expect(comic).not.toBeNull();
      expect(comic?.series).toBe("X-Men");
      expect(String(comic?.issue_number)).toBe("11");
    });
  });
});
