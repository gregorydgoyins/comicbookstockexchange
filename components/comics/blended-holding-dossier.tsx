"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import type { ComicRecord } from "@/lib/comics/types";
import type { CollectionItem } from "@/lib/account/types";
import {
  panelProfitsGrades,
  panelProfitsSpreads,
  panelProfitsVolume,
  type Grade,
} from "@/lib/pricing/source-ladder";
import { formatCurrency } from "@/lib/utils";
import { addOrUpdateHoldingAction, toggleWatchlistAction } from "@/lib/account/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bookmark,
  Briefcase,
  Check,
  ChevronRight,
  DollarSign,
  Edit3,
  Layers,
  Loader2,
  Plus,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

interface BlendedHoldingDossierProps {
  comic: ComicRecord;
  userStatus: {
    isInCollection: boolean;
    collectionItem: CollectionItem | null;
    isInWatchlist: boolean;
  };
  isAuthenticated: boolean;
}

export function BlendedHoldingDossier({
  comic,
  userStatus,
  isAuthenticated,
}: BlendedHoldingDossierProps) {
  const router = useRouter();
  const pp = panelProfitsGrades(comic);
  const rawSpread = panelProfitsSpreads(comic, "RAW");
  const g98Spread = panelProfitsSpreads(comic, "9.8");
  const rawVolume = panelProfitsVolume(comic, "RAW");

  // User status state
  const [inCollection, setInCollection] = useState(userStatus.isInCollection);
  const [holding, setHolding] = useState<CollectionItem | null>(userStatus.collectionItem);
  const [inWatchlist, setInWatchlist] = useState(userStatus.isInWatchlist);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [grade, setGrade] = useState(holding?.grade || "9.8");
  const [gradingCompany, setGradingCompany] = useState(holding?.grading_company || "CGC");
  const [acqCost, setAcqCost] = useState(holding?.acquisition_cost?.toString() || "");
  const [acqDate, setAcqDate] = useState(holding?.acquisition_date || "");
  const [quantity, setQuantity] = useState(holding?.quantity?.toString() || "1");
  const [notes, setNotes] = useState(holding?.notes || "");

  // Holding calculations
  // A holding is valued only at its own grade. No stored price at that grade means no valuation.
  const holdingGrade = (holding?.grade as Grade) || null;
  const marketValuationForGrade = holdingGrade ? (pp[holdingGrade] ?? null) : null;
  const userCost = holding?.acquisition_cost != null ? Number(holding.acquisition_cost) : null;

  const unrealizedGain =
    userCost != null && marketValuationForGrade != null
      ? marketValuationForGrade - userCost
      : null;

  const unrealizedReturnPct =
    userCost != null && userCost > 0 && unrealizedGain != null
      ? (unrealizedGain / userCost) * 100
      : null;

  const handleWatchlistClick = async () => {
    if (!isAuthenticated) {
      router.push(`/sign-in?returnTo=/comics/${comic.id}`);
      return;
    }
    setWatchlistLoading(true);
    const res = await toggleWatchlistAction(comic.id);
    setInWatchlist(res.inWatchlist);
    setWatchlistLoading(false);
  };

  const handleOpenModal = () => {
    if (!isAuthenticated) {
      router.push(`/sign-in?returnTo=/comics/${comic.id}`);
      return;
    }
    setIsModalOpen(true);
  };

  const handleSaveHolding = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const formData = new FormData();
    formData.set("comicId", comic.id);
    formData.set("quantity", quantity);
    formData.set("grade", grade);
    formData.set("gradingCompany", gradingCompany);
    formData.set("certificationNumber", "");
    formData.set("acquisitionCost", acqCost);
    formData.set("acquisitionDate", acqDate);
    formData.set("notes", notes);

    const res = await addOrUpdateHoldingAction(formData);
    setFormLoading(false);

    if (res.success) {
      setInCollection(true);
      setHolding({
        id: holding?.id || "temp",
        collection_id: holding?.collection_id || "default",
        user_id: holding?.user_id || "user",
        comic_id: comic.id,
        quantity: parseInt(quantity, 10) || 1,
        grade: grade || null,
        grading_company: gradingCompany || null,
        certification_number: null,
        acquisition_cost: acqCost ? parseFloat(acqCost) : null,
        acquisition_date: acqDate || null,
        notes: notes || null,
        ownership_status: "owned",
        created_at: holding?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      setIsModalOpen(false);
      router.refresh();
    }
  };

  // Authoritative cover price resolution across catalog records
  const rawCoverPrice =
    (comic.panel_profits_data as Record<string, any>)?.coverPrice ??
    (comic.panel_profits_data as Record<string, any>)?.cover_price ??
    (comic.comicbase_data as Record<string, any>)?.["CB - Cover Price"] ??
    (comic.gcd_data as Record<string, any>)?.["GCD - gcd_issue.price"] ??
    (comic.gcd_data as Record<string, any>)?.cover_price ??
    (comic as any).cover_price;

  const parsedCoverPrice =
    rawCoverPrice != null
      ? typeof rawCoverPrice === "number"
        ? rawCoverPrice
        : parseFloat(String(rawCoverPrice).replace(/[^0-9.]/g, ""))
      : null;
  const formattedCoverPrice =
    parsedCoverPrice != null && !isNaN(parsedCoverPrice)
      ? formatCurrency(parsedCoverPrice)
      : rawCoverPrice
      ? String(rawCoverPrice)
      : "—";

  const g98Benchmark = pp["9.8"] ?? null;
  const rawBenchmark = pp["RAW"] ?? null;
  const activeBenchmark = g98Benchmark ?? rawBenchmark;

  return (
    <section className="rounded-xl border border-slate-700/80 bg-[#0A0D14] p-5 sm:p-6 shadow-xl relative overflow-hidden">
      {/* Background radial highlight */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-wide uppercase">
              Your holding and stored prices
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Your cost basis next to the stored Exchange Benchmark price for the grade you hold
          </p>
        </div>

        <div className="flex items-center gap-2">
          {inCollection ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Holding
            </span>
          ) : inWatchlist ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-500/50 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Bookmark className="h-3 w-3 fill-amber-400" />
              Watchlist Target
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-medium uppercase tracking-wider">
              Unheld Asset
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleWatchlistClick}
            disabled={watchlistLoading}
            className={`text-xs h-8 border ${
              inWatchlist
                ? "border-amber-500/50 bg-amber-950/40 text-amber-300"
                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
            }`}
          >
            {watchlistLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bookmark className={`h-3.5 w-3.5 ${inWatchlist ? "fill-amber-400 text-amber-400" : ""}`} />
            )}
            <span className="ml-1.5">{inWatchlist ? "Watching" : "Watchlist"}</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenModal}
            className="text-xs h-8 bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-md shadow-cyan-900/30"
          >
            {inCollection ? (
              <>
                <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                Edit Portfolio Holding
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Issue to Portfolio
              </>
            )}
          </Button>
        </div>
      </div>

      {/* The Dual Pillars: Left = Portfolio Position, Right = Exchange Terminal Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {/* ================= PILLAR 1: PORTFOLIO POSITION & COST-BASIS LEDGER ================= */}
        <div className="rounded-xl border border-slate-800 bg-[#0D111A] p-4 sm:p-5 flex flex-col justify-between relative group hover:border-cyan-500/40 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                  Portfolio Holdings &amp; Cost-Basis Ledger
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Personal Verified Position</span>
            </div>

            {inCollection && holding ? (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Holding Grade</div>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">
                      {holding.grading_company ? `${holding.grading_company} ` : ""}
                      {holding.grade || "RAW"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Acquisition Cost Basis</div>
                    <div className="text-sm font-bold text-slate-100 mt-0.5">
                      {userCost != null ? formatCurrency(userCost) : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Acquired: {holding.acquisition_date || "—"}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Current Position FMV</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      {marketValuationForGrade != null ? formatCurrency(marketValuationForGrade) : "—"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Qty: {holding.quantity || 1}
                    </div>
                  </div>
                </div>

                {/* Unrealized Gain/Loss Bar */}
                <div className="rounded-lg p-3 border border-slate-800 bg-[#090C13] flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Unrealized Capital P&amp;L:</span>
                  {unrealizedGain != null ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-bold font-mono ${
                          unrealizedGain >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {unrealizedGain >= 0 ? `+${formatCurrency(unrealizedGain)}` : formatCurrency(unrealizedGain)}
                      </span>
                      {unrealizedReturnPct != null && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                            unrealizedReturnPct >= 0
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                              : "bg-rose-950/80 text-rose-300 border border-rose-500/40"
                          }`}
                        >
                          {unrealizedReturnPct >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {unrealizedReturnPct >= 0 ? `+${unrealizedReturnPct.toFixed(1)}%` : `${unrealizedReturnPct.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Cost basis needed for P&amp;L</span>
                  )}
                </div>

                {/* Personal Notes */}
                {holding.notes && (
                  <div className="text-xs text-slate-400 bg-slate-900/50 p-2.5 rounded border border-slate-800/80 italic">
                    &ldquo;{holding.notes}&rdquo;
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 px-4 rounded-lg border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-3">
                <Layers className="h-8 w-8 text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-300">
                    No Holding Logged in Portfolio
                  </div>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    Track your holding in your portfolio. Record your grade (0.5–10.0 or Raw), grading authority (CGC, CBCS, PSA, or Raw), acquisition cost basis, and purchase date to activate real-time equity valuation, unrealized ROI, and capital gains tracking.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleOpenModal}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Holding to Portfolio
                </Button>
              </div>
            )}
          </div>

          <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>Sovereign Storage: Supabase RLS Protected</span>
            <span className="text-slate-400 font-mono">Status: {inCollection ? "Owned Position" : "Unheld"}</span>
          </div>
        </div>

        {/* ================= PILLAR 2: INSTITUTIONAL MARKET BENCHMARKS ================= */}
        <div className="rounded-xl border border-slate-800 bg-[#0D111A] p-4 sm:p-5 flex flex-col justify-between relative group hover:border-purple-500/40 transition-colors">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                  Stored prices
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Exchange Benchmark</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Grade 9.8 Benchmark</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                  {pp["9.8"] ? formatCurrency(pp["9.8"]) : "Unpriced"}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Dealer buy: {g98Spread.buy ? formatCurrency(g98Spread.buy) : "—"} / Retail sell: {g98Spread.sell ? formatCurrency(g98Spread.sell) : "—"}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="text-[10px] font-mono text-slate-400 uppercase">RAW / Ungraded FMV</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">
                  {pp["RAW"] ? formatCurrency(pp["RAW"]) : "Unpriced"}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Dealer buy: {rawSpread.buy ? formatCurrency(rawSpread.buy) : "—"} / Retail sell: {rawSpread.sell ? formatCurrency(rawSpread.sell) : "—"}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Market Velocity</div>
                <div className="text-sm font-bold text-slate-100 mt-0.5">
                  {rawVolume || "—"}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                  Original Cover: {formattedCoverPrice}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ================= BLENDED ARBITRAGE ARITHMETIC BANNER ================= */}
      {inCollection && userCost != null && marketValuationForGrade != null && (
        <div className="mt-5 rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <DollarSign className="h-4 w-4 text-cyan-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-100">Portfolio Position Analysis: </span>
              <span className="text-slate-300">
                You acquired this {holding?.grading_company ? `${holding.grading_company} ` : ""}{holdingGrade} for{" "}
                <strong className="text-slate-100 font-mono">{formatCurrency(userCost)}</strong>. The stored Exchange Benchmark price at that grade is{" "}
                <strong className="text-cyan-300 font-mono">{formatCurrency(marketValuationForGrade)}</strong> (
                <span className={unrealizedGain != null && unrealizedGain >= 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
                  {unrealizedGain != null && unrealizedGain >= 0 ? `+${formatCurrency(unrealizedGain)}` : formatCurrency(unrealizedGain || 0)}
                </span>
                {unrealizedReturnPct != null && (
                  <span className="ml-1 text-slate-400">
                    · {unrealizedReturnPct >= 0 ? `+${unrealizedReturnPct.toFixed(1)}%` : `${unrealizedReturnPct.toFixed(1)}%`} ROI
                  </span>
                )}
                ).
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleOpenModal}
            className="text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/40 p-1 h-auto"
          >
            Adjust Cost Basis <ChevronRight className="h-3 w-3 ml-0.5 inline" />
          </Button>
        </div>
      )}

      {/* Modal for Logging / Updating Holding */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0E121B] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  {inCollection ? "Edit Portfolio Holding" : "Add Issue to Portfolio"}
                </h3>
                <p className="text-xs text-slate-400">
                  {comic.series} #{comic.issue_number}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveHolding} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Grading Authority</label>
                  <select
                    value={gradingCompany}
                    onChange={(e) => setGradingCompany(e.target.value)}
                    className="w-full h-8 rounded border border-slate-700 bg-slate-900 px-2 text-slate-200 focus:border-cyan-400 outline-none"
                  >
                    <option value="">RAW (Ungraded)</option>
                    <option value="CGC">CGC</option>
                    <option value="CBCS">CBCS</option>
                    <option value="PSA">PSA</option>
                    <option value="PGX">PGX</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Grade (0.5 – 10.0)</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full h-8 rounded border border-slate-700 bg-slate-900 px-2 text-slate-200 focus:border-cyan-400 outline-none"
                  >
                    <option value="RAW">RAW (Ungraded)</option>
                    <option value="0.5">0.5 Poor</option>
                    <option value="1.0">1.0 Fair</option>
                    <option value="1.5">1.5 Fair/Good</option>
                    <option value="1.8">1.8 Good-</option>
                    <option value="2.0">2.0 Good</option>
                    <option value="2.5">2.5 Good+</option>
                    <option value="3.0">3.0 Good/VG</option>
                    <option value="3.5">3.5 VG-</option>
                    <option value="4.0">4.0 VG</option>
                    <option value="4.5">4.5 VG+</option>
                    <option value="5.0">5.0 VG/Fine</option>
                    <option value="5.5">5.5 Fine-</option>
                    <option value="6.0">6.0 Fine</option>
                    <option value="6.5">6.5 Fine+</option>
                    <option value="7.0">7.0 Fine/VF</option>
                    <option value="7.5">7.5 VF-</option>
                    <option value="8.0">8.0 VF</option>
                    <option value="8.5">8.5 VF+</option>
                    <option value="9.0">9.0 VF/NM</option>
                    <option value="9.2">9.2 NM-</option>
                    <option value="9.4">9.4 NM</option>
                    <option value="9.6">9.6 NM+</option>
                    <option value="9.8">9.8 NM/Mint</option>
                    <option value="9.9">9.9 Mint</option>
                    <option value="10.0">10.0 Gem Mint</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Cost Basis ($ USD)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 150.00"
                    value={acqCost}
                    onChange={(e) => setAcqCost(e.target.value)}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Acquisition Date</label>
                  <Input
                    type="date"
                    value={acqDate}
                    onChange={(e) => setAcqDate(e.target.value)}
                    className="h-8 text-xs bg-slate-900 border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Quantity</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="h-8 text-xs bg-slate-900 border-slate-700 w-32"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Personal Notes / Pedigree</label>
                <textarea
                  rows={2}
                  placeholder="e.g. White pages, purchased from Heritage Auctions, signed by artist"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-xs text-slate-200 focus:border-cyan-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs h-8 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="text-xs h-8 bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                >
                  {formLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Check className="h-3.5 w-3.5 mr-1.5" />}
                  {inCollection ? "Update Portfolio Holding" : "Save Holding to Portfolio"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
