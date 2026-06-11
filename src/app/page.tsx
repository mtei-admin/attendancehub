import { redirect } from "next/navigation";

import { getRole, routeForRole } from "@/lib/role";

export default async function HomePage() {
  const role = await getRole();
  redirect(routeForRole(role));
}
