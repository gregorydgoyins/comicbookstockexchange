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
    const add = (name: string | undefined | null, role: string) => {
      if (!name || typeof name !== "string") return;
      const clean = name.trim();
      if (!clean || clean === "?" || clean === "none" || seen.has(`${clean}|${role}`)) return;
      seen.add(`${clean}|${role}`);
      creators.push({
        name: clean,
        role,
        bio: null,
        notableWorks: [],
        imageUrl: null,
      });
    };

    if (gcdStory?.writers) gcdStory.writers.forEach((w) => add(w, "Writer"));
    if (gcdStory?.pencilers) gcdStory.pencilers.forEach((p) => add(p, "Penciler"));
    if (gcdStory?.inkers) gcdStory.inkers.forEach((i) => add(i, "Inker"));
    if (gcdStory?.colorists) gcdStory.colorists.forEach((c) => add(c, "Colorist"));
    if (gcdStory?.letterers) gcdStory.letterers.forEach((l) => add(l, "Letterer"));
    if (gcdStory?.editors) gcdStory.editors.forEach((e) => add(e, "Editor"));

    // Fandom credits fallback (authoritative bibliographic metadata)
    const fandomCredits = (comic as any)?.fandom_credits;
    if (fandomCredits && typeof fandomCredits === "object") {
      if (Array.isArray(fandomCredits.writer)) fandomCredits.writer.forEach((w: string) => add(w, "Writer"));
      if (Array.isArray(fandomCredits.penciler)) fandomCredits.penciler.forEach((p: string) => add(p, "Penciler"));
      if (Array.isArray(fandomCredits.inker)) fandomCredits.inker.forEach((i: string) => add(i, "Inker"));
      if (Array.isArray(fandomCredits.colorist)) fandomCredits.colorist.forEach((c: string) => add(c, "Colorist"));
      if (Array.isArray(fandomCredits.letterer)) fandomCredits.letterer.forEach((l: string) => add(l, "Letterer"));
      if (Array.isArray(fandomCredits.editor)) fandomCredits.editor.forEach((e: string) => add(e, "Editor"));
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
