import { cookies } from "next/headers";
import { ADMIN_COOKIE, validAdminCookie } from "./admin";

/** Every /admin page asks this on the server first: without a valid HQ session it renders only the sign-in, so no HQ
 *  code or data ever reaches a visitor who typed /admin/users. */
export async function adminIn() {
  return validAdminCookie((await cookies()).get(ADMIN_COOKIE)?.value);
}
