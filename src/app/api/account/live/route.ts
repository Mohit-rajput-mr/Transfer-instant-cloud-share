import { NextResponse, type NextRequest } from "next/server";
import { accountOf, userOf } from "@/lib/account";
import { rpc } from "@/lib/server";
import { validSkin } from "@/lib/skin-list";
import { cleanHandle, retagName, untag } from "@/lib/spaces";

export const dynamic = "force-dynamic";

/** A logged-in account changes what it already has floating, from any device (no owner keys needed; migration 043):
 *  { show: false } hides the bubble name on all of it, { show: true } shows it, { skin } restyles it. Objects in a
 *  space (they carry the member name) and anonymous ones are left alone. */
export async function POST(req: NextRequest) {
  const u = await userOf(req);
  if (!u) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { show?: unknown; skin?: unknown; hue?: unknown };
  const show = typeof b.show === "boolean" ? b.show : undefined;
  const skin = validSkin(b.skin) ? (b.skin as string) : undefined;
  if (show === undefined && !skin) return NextResponse.json({ error: "nothing to change" }, { status: 400 });
  const handle = show ? cleanHandle((await accountOf(u)).handle ?? "") : "";
  if (show && !handle) return NextResponse.json({ error: "Pick a bubble name first" }, { status: 400 });
  const hue = Number.isInteger(b.hue) && (b.hue as number) >= 0 && (b.hue as number) < 360 ? (b.hue as number) : u.hue ?? undefined;
  const live = (await rpc<{ id: string; name: string; expiresAt: string }[]>("orbit_user_live", { p_user: u.id })) ?? [];
  let changed = 0;
  for (const row of live) {
    const o = untag(row);
    if (o.anon) continue;
    const change: Parameters<typeof retagName>[1] = {};
    if (skin) change.skin = skin;
    if (show !== undefined && !o.space) Object.assign(change, show ? { by: handle, verified: true, hue } : { by: undefined, verified: false, hue: undefined });
    const name = retagName(o, change);
    if (name !== row.name && (await rpc<boolean>("orbit_user_retag", { p_user: u.id, p_id: row.id, p_name: name }).catch(() => false))) changed++;
  }
  return NextResponse.json({ ok: true, changed });
}
