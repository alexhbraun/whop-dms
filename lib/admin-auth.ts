export function requireAdminSecret(req: Request) {
  const cfg = process.env.ADMIN_DASH_SECRET || "";
  if (!cfg) throw new Error("ADMIN_DASH_SECRET not set");
  const got =
    (req.headers.get("x-admin-secret") || req.headers.get("x-debug-secret") || "").trim();
  if (!got || got !== cfg.trim()) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}
