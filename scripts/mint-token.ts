import { signToken } from "../lib/token.ts";

async function main() {

  // Minimal payload for our API; adjust fields if you need to test authorization logic
  const payload = { sub: "test-user", role: "tester" };

  // 1 hour expiry
  const token = signToken(payload, "1h");

  console.log("Minted token:", token);

  console.log(`curl.exe -i https://whop-dms.vercel.app/api/debug-token -H "Authorization: Bearer ${token}"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
