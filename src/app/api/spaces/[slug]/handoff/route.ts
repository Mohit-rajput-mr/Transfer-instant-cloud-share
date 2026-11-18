import { NextResponse, type NextRequest } from "next/server";
import { userOf } from "@/lib/account";
import { addMember, chanFor, cleanHandle, devHash, isAnonSpace, member, tokenFor } from "@/lib/spaces";

export const dynamic = "force-dynamic";

/** A logged-in user's other device takes over a space they are in (lib/vault.ts): it shows the pass another of
 *  their devices holds (device id + token, kept in their sealed vault) and gets its own. Never for anonymous spaces. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await userOf(req);
  if (!user) return NextResponse.json({ error: "Log in first" }, { status: 401 });
  const { slug } = await params;
  const b = (await req.json().catch(() => null)) as { fromDevice?: string; fromToken?: string; deviceId?: string; handle?: string } | null;
  if (!b || typeof b.deviceId !== "string" || b.deviceId.length < 8 || b.deviceId.length > 64) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const from = await member(slug, b.fromDevice, b.fromToken);
  if (!from) return NextResponse.json({ error: "That pass no longer works" }, { status: 403 });
  if (await isAnonSpace(from.slug)) return NextResponse.json({ error: "Anonymous spaces stay on one device" }, { status: 403 });
  const dh = devHash(b.deviceId);
  const handle = cleanHandle(b.handle) || from.handle;
  await addMember(from.slug, dh, handle);
  return NextResponse.json({ token: tokenFor(from.slug, dh), chan: chanFor(from.slug), handle });
}
