/**
 * app/api/ingestion/pricecharting/route.ts
 * Receives the PriceCharting comics price file from the collector extension (downloaded on the
 * user's machine, because PriceCharting refuses the same request from cloud servers) and runs it
 * through the SAME Postgres steps the nightly edge function uses:
 *   begin  -> clear any stale staging for today's label
 *   chunk  -> pp_stage_csv_chunk (keeps Comic Books rows, parses, maps the 37 columns)
 *   check  -> row-count sanity check (>= 300,000 and >= 90% of the previous snapshot)
 *   commit -> pp_commit_prices, one hash part per call (history snapshot + current prices where changed)
 *   finish -> clear staging
 * Auth: Bearer GPA_INGESTION_SECRET (same as the other ingestion routes).
 * Every step is idempotent, so a failed run can simply be started again.
 */

import { createAdminServerClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const INGESTION_SECRET = process.env.GPA_INGESTION_SECRET;
const MIN_ROWS = 300_000;
const MAX_PARTS = 64;

const EXPECTED_HEADER =
  "id,console-name,product-name,loose-price,cib-price,new-price,graded-price,box-only-price,manual-only-price,bgs-10-price,condition-9-price,condition-10-price,condition-13-price,condition-14-price,condition-15-price,condition-16-price,condition-17-price,condition-18-price,condition-19-price,condition-20-price,condition-21-price,condition-22-price,gamestop-price,gamestop-trade-price,retail-loose-buy,retail-loose-sell,retail-cib-buy,retail-cib-sell,retail-new-buy,retail-new-sell,upc,sales-volume,genre,tcg-id,asin,epid,release-date";

interface Body {
  action?: "begin" | "chunk" | "check" | "commit" | "finish";
  label?: string;
  csv?: string;
  first?: boolean;
  snap?: string;
  part?: number;
  parts?: number;
  force?: boolean;
}

const bad = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(req: NextRequest) {
  const auth = req.headers.get("Authorization") || "";
  const secret = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!INGESTION_SECRET || secret !== INGESTION_SECRET) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const label = (body.label || "").trim();
  if (!/^PriceCharting nightly \d{4}-\d{2}-\d{2}$/.test(label)) return bad("label must be 'PriceCharting nightly YYYY-MM-DD'");
  const supabase = createAdminServerClient();

  try {
    switch (body.action) {
      case "begin": {
        if (!body.force) {
          const { data: done, error } = await supabase.from("pp_price_history").select("pp_id").eq("snapshot_label", label).limit(1);
          if (error) throw new Error("history check: " + error.message);
          if (done && done.length) return NextResponse.json({ ok: true, skipped: "already loaded today", label });
        }
        const { error: delErr } = await supabase.from("pp_price_stage").delete().eq("run_label", label);
        if (delErr) throw new Error("clear stage: " + delErr.message);
        return NextResponse.json({ ok: true, label });
      }

      case "chunk": {
        let csv = body.csv ?? "";
        if (!csv) return bad("csv is empty");
        if (body.first) {
          csv = csv.replace(/^﻿/, "");
          const nl = csv.indexOf("\n");
          const hdr = csv.slice(0, nl === -1 ? csv.length : nl).replace(/[\r ]+$/g, "");
          if (hdr !== EXPECTED_HEADER) return bad("header differs from the 37-column layout", 422);
        }
        const { data, error } = await supabase.rpc("pp_stage_csv_chunk", {
          p_label: label,
          p_chunk: csv,
          p_skip_header: !!body.first,
        });
        if (error) throw new Error("stage: " + error.message);
        return NextResponse.json({ ok: true, staged: Number(data || 0) });
      }

      case "check": {
        const { count, error } = await supabase.from("pp_price_stage").select("pp_id", { count: "exact", head: true }).eq("run_label", label);
        if (error) throw new Error("count stage: " + error.message);
        const n = count ?? 0;
        const { data: prev } = await supabase.rpc("pp_prev_snapshot_rows");
        const prevN = Number(prev ?? 0);
        if (n < MIN_ROWS || (prevN > 0 && n * 100 < prevN * 90)) {
          await supabase.from("pp_price_stage").delete().eq("run_label", label);
          return NextResponse.json(
            { ok: false, error: `file rejected: ${n} comic rows (previous snapshot ${prevN}); nothing committed`, rows: n, previous_rows: prevN },
            { status: 422 }
          );
        }
        return NextResponse.json({ ok: true, rows: n, previous_rows: prevN });
      }

      case "commit": {
        const parts = Number(body.parts);
        const part = Number(body.part);
        if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS || !Number.isInteger(part) || part < 0 || part >= parts) {
          return bad("part/parts out of range");
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.snap || "")) return bad("snap must be YYYY-MM-DD");
        const { data, error } = await supabase.rpc("pp_commit_prices", { p_label: label, p_snap: body.snap, p_part: part, p_parts: parts });
        if (error) throw new Error("commit: " + error.message);
        return NextResponse.json({ ok: true, result: data });
      }

      case "finish": {
        const { error } = await supabase.from("pp_price_stage").delete().eq("run_label", label);
        if (error) throw new Error("clear stage: " + error.message);
        return NextResponse.json({ ok: true });
      }

      default:
        return bad("unknown action");
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error).message || err) }, { status: 500 });
  }
}
