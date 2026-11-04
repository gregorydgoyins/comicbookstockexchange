import { Metadata } from "next";
import { BattleArena } from "@/components/battle/battle-arena";
import { getAllSuperheroContenders } from "@/lib/battle/battle-engine";

export const metadata: Metadata = {
  title: "Multiverse Versus Matchup Arena | Panel Profits",
  description:
    "Simulate head-to-head battles across superheroes, supervillains, gadgets, superpowers, places, and creators. Powered by authentic character power stats, canonical lore, and certified secondary market comic valuations.",
};

export default function VersusPage() {
  const contenders = getAllSuperheroContenders();

  return (
    <main className="min-h-screen bg-[#07090e] text-slate-100 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <BattleArena initialContenders={contenders} />
    </main>
  );
}
