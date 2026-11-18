"use client";
import Link from "next/link";
import { useEffect } from "react";
import { LuUser } from "react-icons/lu";
import { useSession } from "@/lib/auth";
import { startVaultSync } from "@/lib/vault";

/** In the app (Classic, Work, the phone menu): "Log in" when signed out, your name when signed in. Logged in, what
 *  this device keeps (sent files, notes, tasks, spaces, trash) follows the account to every device (lib/vault.ts). */
export default function AccountChip({ className, children }: { className?: string; children?: (label: string, signedIn: boolean) => React.ReactNode }) {
  const session = useSession();
  useEffect(() => {
    if (session) startVaultSync();
  }, [session]);
  const meta = session?.user.user_metadata ?? {};
  const name = (typeof meta.name === "string" && meta.name) || (typeof meta.full_name === "string" && meta.full_name) || "Account";
  const label = session ? name.split(" ")[0].slice(0, 16) : "Log in";
  const href = session ? "/account" : `/login?next=${encodeURIComponent(typeof location === "undefined" ? "/" : location.pathname)}`;
  return (
    <Link href={href} className={className} title={session ? `Logged in as ${session.user.email}: your things on every device` : "Log in: your files, notes, tasks and spaces on every device"}>
      {children ? children(label, !!session) : (
        <>
          <LuUser aria-hidden />
          {label}
        </>
      )}
    </Link>
  );
}
