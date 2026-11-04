import { NextRequest, NextResponse } from "next/server";
import { getComicById } from "@/lib/comics/queries";
import { resolveGcdStoryDossier } from "@/lib/comics/gcd-story-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const comic = await getComicById(id);
    if (!comic) {
      return NextResponse.json({ data: [] });
    }

    const gcdStory = await resolveGcdStoryDossier(
      comic.gcd_source_id || (comic.gcd_data as any)?.["GCD - gcd_issue.id"],
      comic.series,
      comic.issue_number,
      comic.publication_year
    );

    const creators: Array<{
      name: string;
      role: string;
      bio?: string | null;
      notableWorks?: string[];
      imageUrl?: string | null;
    }> = [];

    const seen = new Set<string>();
    const splitNames = (val: string | null | undefined): string[] => {
      if (!val) return [];
      return val
        .split(/;|,|\band\b/i)
        .map((s) => s.trim())
        .filter((s) => s && s.toLowerCase() !== "typeset" && s !== "?" && s.toLowerCase() !== "various");
    };

    const add = (name: string | undefined | null, role: string) => {
      if (!name || typeof name !== "string") return;
      const clean = name.trim();
      if (!clean || clean === "?" || clean === "none" || clean.toLowerCase() === "typeset" || seen.has(`${clean}|${role}`)) return;
      seen.add(`${clean}|${role}`);
      creators.push({
        name: clean,
        role,
        bio: null,
        notableWorks: [],
        imageUrl: null,
      });
    };

    // 1. Cover Artist
    const coverStory = gcdStory?.allStories?.find((s: any) => s.sequence === 0);
    if (coverStory?.penciler) splitNames(coverStory.penciler).forEach((p) => add(p, "Cover Artist"));
    if ((comic as any)?.cover_artist) splitNames((comic as any).cover_artist).forEach((p) => add(p, "Cover Artist"));

    if (gcdStory?.writers) gcdStory.writers.forEach((w) => splitNames(w).forEach((n) => add(n, "Writer")));
    if (gcdStory?.pencilers) gcdStory.pencilers.forEach((p) => splitNames(p).forEach((n) => add(n, "Penciler")));
    if (gcdStory?.inkers) gcdStory.inkers.forEach((i) => splitNames(i).forEach((n) => add(n, "Inker")));
    if (gcdStory?.colorists) gcdStory.colorists.forEach((c) => splitNames(c).forEach((n) => add(n, "Colorist")));
    if (gcdStory?.letterers) gcdStory.letterers.forEach((l) => splitNames(l).forEach((n) => add(n, "Letterer")));
    if (gcdStory?.editors) gcdStory.editors.forEach((e) => splitNames(e).forEach((n) => add(n, "Editor")));

    // Fandom credits fallback (authoritative bibliographic metadata)
    const fandomCredits = (comic as any)?.fandom_credits;
    if (fandomCredits && typeof fandomCredits === "object") {
      if (Array.isArray(fandomCredits.writer)) fandomCredits.writer.forEach((w: string) => splitNames(w).forEach((n) => add(n, "Writer")));
      if (Array.isArray(fandomCredits.penciler)) fandomCredits.penciler.forEach((p: string) => splitNames(p).forEach((n) => add(n, "Penciler")));
      if (Array.isArray(fandomCredits.inker)) fandomCredits.inker.forEach((i: string) => splitNames(i).forEach((n) => add(n, "Inker")));
      if (Array.isArray(fandomCredits.colorist)) fandomCredits.colorist.forEach((c: string) => splitNames(c).forEach((n) => add(n, "Colorist")));
      if (Array.isArray(fandomCredits.letterer)) fandomCredits.letterer.forEach((l: string) => splitNames(l).forEach((n) => add(n, "Letterer")));
      if (Array.isArray(fandomCredits.editor)) fandomCredits.editor.forEach((e: string) => splitNames(e).forEach((n) => add(n, "Editor")));
    }

    // Fallbacks from comicbase / gcd_data
    if (creators.length === 0) {
      const cbData = (comic.comicbase_data as any) || {};
      const gcdData = (comic.gcd_data as any) || {};
      add(gcdData.writer || cbData["CB - Writer"], "Writer");
      add(gcdData.penciler || cbData["CB - Artist"], "Penciler");
      add(gcdData.inker, "Inker");
      add(gcdData.colorist, "Colorist");
      add(gcdData.letterer, "Letterer");
      add(gcdData.editor, "Editor");
    }

    return NextResponse.json({ data: creators });
  } catch (err) {
    console.error("Error in /api/creators/[id]:", err);
    return NextResponse.json({ data: [] });
  }
}
