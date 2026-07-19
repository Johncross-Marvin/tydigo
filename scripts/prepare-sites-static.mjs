import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";

const distDir = join(process.cwd(), "dist");
const serverDir = join(distDir, "server");
const migrationSql = await readFile(join(process.cwd(), "drizzle", "0001_wastigo_core.sql"), "utf8");
const schemaStatements = migrationSql
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt", ".webmanifest", ".xml"]);
const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    if (entry === "server" || entry === ".openai") continue;

    const fullPath = join(directory, entry);
    const fileStat = await stat(fullPath);

    if (fileStat.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

const files = {};

for (const filePath of await walk(distDir)) {
  const routePath = `/${relative(distDir, filePath).split(sep).join("/")}`;
  const ext = extname(filePath);
  const isText = textExtensions.has(ext);
  const buffer = await readFile(filePath);

  files[routePath] = {
    body: isText ? buffer.toString("utf8") : buffer.toString("base64"),
    encoding: isText ? "text" : "base64",
    mimeType: mimeTypes.get(ext) ?? "application/octet-stream",
  };
}

const worker = `const files = ${JSON.stringify(files)};
const schemaStatements = ${JSON.stringify(schemaStatements)};
let dbReady;

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    return serveStatic(request, url);
  },
};

async function handleApi(request, env, url) {
  try {
    const db = await ensureDb(env);
    const path = url.pathname;

    if (path === "/api/health" && request.method === "GET") return json(request, { ok: true, storage: "d1" });
    if (path === "/api/auth/start" && request.method === "POST") return startAuth(request, db, env);
    if (path === "/api/auth/verify" && request.method === "POST") return verifyAuth(request, db, env);
    if (path === "/api/auth/logout" && request.method === "POST") return logout(request, db);
    if (path === "/api/me" && request.method === "GET") return json(request, { user: await requireUser(request, db) });
    if (path === "/api/me" && request.method === "PATCH") return updateMe(request, db, env);
    if (path === "/api/dashboard" && request.method === "GET") return dashboard(request, db);
    if (path === "/api/pickups" && request.method === "GET") return listPickups(request, db);
    if (path === "/api/pickups" && request.method === "POST") return createPickup(request, db);
    if (path === "/api/payments" && request.method === "POST") return createPayment(request, db);
    if (path === "/api/partner-requests" && request.method === "GET") return listPartnerRequests(request, db);
    if (path === "/api/partner-requests" && request.method === "POST") return createPartnerRequest(request, db);
    if (path === "/api/admin/overview" && request.method === "GET") return adminOverview(request, db);

    return json(request, { error: "API route not found" }, 404);
  } catch (error) {
    const status = error.status || 500;
    return json(request, { error: error.message || "Unexpected server error" }, status);
  }
}

async function ensureDb(env) {
  if (!env.DB) throw httpError("Persistent database is not configured", 503);

  if (!dbReady) {
    dbReady = (async () => {
      for (const statement of schemaStatements) {
        await env.DB.prepare(statement).run();
      }
    })();
  }

  await dbReady;
  return env.DB;
}

async function startAuth(request, db, env) {
  const body = await readJson(request);
  const mode = body.mode === "signup" ? "signup" : "signin";
  const phone = normalizePhone(body.phone);
  const name = String(body.name || "").trim();
  const role = normalizeRole(body.role || "household");

  if (phone.length < 10) throw httpError("Enter a valid phone number.", 400);

  const existing = await first(db, "SELECT id, name, role FROM users WHERE phone = ?", phone);
  if (mode === "signin" && !existing) throw httpError("No WastiGo account exists for this phone number.", 404);
  if (mode === "signup" && !name) throw httpError("Enter your full name to create an account.", 400);

  const recentRequests = await first(db, "SELECT COUNT(*) AS count FROM auth_verifications WHERE phone = ? AND created_at > ?", phone, addMinutes(-10));
  if (Number(recentRequests?.count ?? 0) >= 5) throw httpError("Too many verification requests. Try again in a few minutes.", 429);

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const verificationId = id("ver");
  const now = nowIso();
  const expiresAt = addMinutes(10);

  await db.prepare(
    "INSERT INTO auth_verifications (id, phone, code, name, role, mode, user_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(verificationId, phone, code, name || existing?.name || null, role || existing?.role || "household", mode, existing?.id || null, now, expiresAt).run();

  const delivery = await deliverVerification(env, phone, code);

  return json(request, {
    verificationId,
    maskedPhone: maskPhone(phone),
    expiresInSeconds: 600,
    ...delivery,
  });
}

async function deliverVerification(env, phone, code) {
  const smsMessage = "Your WastiGo verification code is " + code + ". It expires in 10 minutes.";
  const formattedPhone = "+" + phone;

  if (env?.TERMII_API_KEY) {
    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: env.TERMII_API_KEY,
        to: formattedPhone,
        from: env.TERMII_SENDER_ID || "WastiGo",
        sms: smsMessage,
        type: "plain",
        channel: env.TERMII_CHANNEL || "generic",
      }),
    });

    if (!response.ok) throw httpError("Unable to send verification SMS.", 502);
    return { delivery: "sms" };
  }

  if (env?.TWILIO_ACCOUNT_SID && env?.TWILIO_AUTH_TOKEN && env?.TWILIO_FROM_NUMBER) {
    const body = new URLSearchParams({
      To: formattedPhone,
      From: env.TWILIO_FROM_NUMBER,
      Body: smsMessage,
    });
    const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + env.TWILIO_ACCOUNT_SID + "/Messages.json", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(env.TWILIO_ACCOUNT_SID + ":" + env.TWILIO_AUTH_TOKEN),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    if (!response.ok) throw httpError("Unable to send verification SMS.", 502);
    return { delivery: "sms" };
  }

  return { delivery: "in_app_verification", verificationCode: code };
}

async function verifyAuth(request, db, env) {
  const body = await readJson(request);
  const verificationId = String(body.verificationId || "");
  const code = String(body.code || "");
  const verification = await first(db, "SELECT * FROM auth_verifications WHERE id = ?", verificationId);

  if (!verification || verification.used_at) throw httpError("This verification request is no longer valid.", 400);
  if (new Date(verification.expires_at).getTime() < Date.now()) throw httpError("The verification code has expired.", 400);
  if (verification.code !== code) throw httpError("The verification code is incorrect.", 400);

  let user = await first(db, "SELECT * FROM users WHERE phone = ?", verification.phone);
  const now = nowIso();

  if (!user) {
    const userId = id("usr");
    const role = normalizeRole(verification.role || "household", env);
    await db.prepare(
      "INSERT INTO users (id, phone, name, role, created_at, updated_at, last_login_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(userId, verification.phone, verification.name || "WastiGo User", role, now, now, now).run();
    await db.prepare(
      "INSERT INTO profiles (user_id, address, city, state, ecopoints, rating, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(userId, "", "Abuja", "FCT", 500, 5, now).run();
    await db.prepare(
      "INSERT INTO eco_point_transactions (id, user_id, points, reason, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(id("eco"), userId, 500, "Signup bonus", now).run();
    user = await first(db, "SELECT * FROM users WHERE id = ?", userId);
  } else {
    await db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").bind(now, now, user.id).run();
    await db.prepare(
      "INSERT OR IGNORE INTO profiles (user_id, address, city, state, ecopoints, rating, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(user.id, "", "Abuja", "FCT", 0, 5, now).run();
  }

  await db.prepare("UPDATE auth_verifications SET used_at = ? WHERE id = ?").bind(now, verificationId).run();

  const token = makeToken();
  await db.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)"
  ).bind(id("ses"), user.id, await sha256(token), now, addDays(30)).run();

  return json(request, { token, user: await getUserProfile(db, user.id) });
}

async function logout(request, db) {
  const tokenHash = await tokenHashFromRequest(request);
  if (tokenHash) {
    await db.prepare("UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL").bind(nowIso(), tokenHash).run();
  }
  return json(request, { ok: true });
}

async function updateMe(request, db, env) {
  const user = await requireUser(request, db);
  const body = await readJson(request);
  const role = body.role ? normalizeRole(body.role, env, body.adminInviteCode) : user.role;
  const name = String(body.name || user.name).trim();
  const address = String(body.address || user.address || "").trim();
  const now = nowIso();

  await db.prepare("UPDATE users SET name = ?, role = ?, updated_at = ? WHERE id = ?").bind(name, role, now, user.id).run();
  await db.prepare("UPDATE profiles SET address = ?, updated_at = ? WHERE user_id = ?").bind(address, now, user.id).run();

  return json(request, { user: await getUserProfile(db, user.id) });
}

async function dashboard(request, db) {
  const user = await requireUser(request, db);
  const totalPickups = await first(db, "SELECT COUNT(*) AS count, COALESCE(SUM(weight_kg), 0) AS weight FROM pickups WHERE user_id = ?", user.id);
  const activePickup = await first(
    db,
    "SELECT * FROM pickups WHERE user_id = ? AND status IN ('scheduled', 'assigned', 'in_progress') ORDER BY created_at DESC LIMIT 1",
    user.id
  );
  const recentPickups = await all(db, "SELECT * FROM pickups WHERE user_id = ? ORDER BY created_at DESC LIMIT 5", user.id);
  const partnerRequests = await all(db, "SELECT * FROM partner_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 5", user.id);
  const rewardTotal = await first(db, "SELECT COALESCE(SUM(points), 0) AS points FROM eco_point_transactions WHERE user_id = ?", user.id);

  return json(request, {
    user,
    stats: {
      ecopoints: Number(user.ecopoints || rewardTotal?.points || 0),
      totalPickups: Number(totalPickups?.count || 0),
      wasteRecycledKg: Number(totalPickups?.weight || 0),
      rating: Number(user.rating || 5),
    },
    activePickup,
    recentPickups,
    partnerRequests,
    challenges: buildChallenges(Number(totalPickups?.count || 0), Number(totalPickups?.weight || 0)),
  });
}

async function listPickups(request, db) {
  const user = await requireUser(request, db);
  const rows = user.role === "collector" || user.role === "admin"
    ? await all(db, "SELECT * FROM pickups ORDER BY created_at DESC LIMIT 100")
    : await all(db, "SELECT * FROM pickups WHERE user_id = ? ORDER BY created_at DESC", user.id);
  return json(request, { pickups: rows });
}

async function createPickup(request, db) {
  const user = await requireUser(request, db);
  const body = await readJson(request);
  const wasteType = String(body.wasteType || "").trim();
  const weightKg = Number(body.weightKg || 0);
  const address = String(body.address || "").trim();
  const scheduleWindow = String(body.scheduleWindow || "today").trim();
  const paymentMethod = String(body.paymentMethod || "card").trim();

  if (!wasteType) throw httpError("Select a waste type.", 400);
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw httpError("Enter a valid waste weight.", 400);
  if (!address) throw httpError("Enter a pickup address.", 400);

  const priceNgn = 500 + Math.max(0, Math.round(weightKg * 50));
  const pickupId = id("pku");
  const now = nowIso();
  const status = paymentMethod === "transfer" ? "scheduled" : "scheduled";
  const paymentStatus = paymentMethod === "transfer" ? "pay_on_pickup" : "pending";

  await db.prepare(
    "INSERT INTO pickups (id, user_id, waste_type, weight_kg, address, schedule_window, payment_method, payment_status, price_ngn, status, pickup_code, collector_name, eta_minutes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(pickupId, user.id, wasteType, weightKg, address, scheduleWindow, paymentMethod, paymentStatus, priceNgn, status, code("WST"), "Unassigned", null, now, now).run();

  return json(request, { pickup: await first(db, "SELECT * FROM pickups WHERE id = ?", pickupId) }, 201);
}

async function createPayment(request, db) {
  const user = await requireUser(request, db);
  const body = await readJson(request);
  const pickupId = String(body.pickupId || "");
  const method = String(body.method || "card");
  const pickup = await first(db, "SELECT * FROM pickups WHERE id = ? AND user_id = ?", pickupId, user.id);

  if (!pickup) throw httpError("Pickup not found.", 404);
  if (pickup.payment_status === "paid") return json(request, { pickup, alreadyPaid: true });

  const now = nowIso();
  const reference = code("PAY");
  await db.prepare(
    "INSERT INTO payments (id, pickup_id, user_id, amount_ngn, method, status, reference, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id("pay"), pickup.id, user.id, pickup.price_ngn, method, "paid", reference, now).run();
  await db.prepare("UPDATE pickups SET payment_status = ?, updated_at = ? WHERE id = ?").bind("paid", now, pickup.id).run();

  const points = Math.max(100, Math.round(Number(pickup.weight_kg) * 100));
  await db.prepare(
    "INSERT INTO eco_point_transactions (id, user_id, pickup_id, points, reason, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id("eco"), user.id, pickup.id, points, "Pickup payment reward", now).run();
  await db.prepare("UPDATE profiles SET ecopoints = ecopoints + ?, updated_at = ? WHERE user_id = ?").bind(points, now, user.id).run();

  return json(request, {
    payment: { reference, amountNgn: pickup.price_ngn, status: "paid" },
    pickup: await first(db, "SELECT * FROM pickups WHERE id = ?", pickup.id),
    pointsEarned: points,
  }, 201);
}

async function listPartnerRequests(request, db) {
  const user = await requireUser(request, db);
  const rows = await all(db, "SELECT * FROM partner_requests WHERE user_id = ? ORDER BY created_at DESC", user.id);
  return json(request, { requests: rows });
}

async function createPartnerRequest(request, db) {
  const user = await requireUser(request, db);
  const body = await readJson(request);
  const material = String(body.material || "").trim();
  const quantityKg = Number(body.quantityKg || 0);
  const pricePerKgNgn = Number(body.pricePerKgNgn || 0);
  const deliveryAddress = String(body.deliveryAddress || "").trim();

  if (!material) throw httpError("Enter the material type.", 400);
  if (!Number.isFinite(quantityKg) || quantityKg <= 0) throw httpError("Enter a valid quantity.", 400);
  if (!Number.isFinite(pricePerKgNgn) || pricePerKgNgn <= 0) throw httpError("Enter a valid preferred price.", 400);
  if (!deliveryAddress) throw httpError("Enter a delivery address.", 400);

  const now = nowIso();
  const requestId = id("mat");
  await db.prepare(
    "INSERT INTO partner_requests (id, user_id, material, quantity_kg, price_per_kg_ngn, delivery_address, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(requestId, user.id, material, quantityKg, Math.round(pricePerKgNgn), deliveryAddress, "pending", now, now).run();

  return json(request, { request: await first(db, "SELECT * FROM partner_requests WHERE id = ?", requestId) }, 201);
}

async function adminOverview(request, db) {
  const user = await requireUser(request, db);
  if (user.role !== "admin") throw httpError("Admin access required.", 403);

  const users = await first(db, "SELECT COUNT(*) AS count FROM users");
  const collectors = await first(db, "SELECT COUNT(*) AS count FROM users WHERE role = 'collector'");
  const pickups = await first(db, "SELECT COUNT(*) AS count, COALESCE(SUM(weight_kg), 0) AS weight FROM pickups");
  const revenue = await first(db, "SELECT COALESCE(SUM(amount_ngn), 0) AS amount FROM payments WHERE status = 'paid'");
  const eco = await first(db, "SELECT COALESCE(SUM(points), 0) AS points FROM eco_point_transactions");
  const pendingKyc = await all(db, "SELECT * FROM kyc_submissions WHERE status = 'pending' ORDER BY created_at DESC");

  return json(request, {
    kpis: {
      totalUsers: Number(users?.count || 0),
      activeCollectors: Number(collectors?.count || 0),
      wasteCollectedKg: Number(pickups?.weight || 0),
      pickups: Number(pickups?.count || 0),
      revenueNgn: Number(revenue?.amount || 0),
      ecopointsIssued: Number(eco?.points || 0),
      pendingKyc: pendingKyc.length,
    },
    pendingKyc,
  });
}

async function requireUser(request, db) {
  const tokenHash = await tokenHashFromRequest(request);
  if (!tokenHash) throw httpError("Sign in required.", 401);

  const row = await first(
    db,
    "SELECT users.id AS id FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.revoked_at IS NULL AND sessions.expires_at > ?",
    tokenHash,
    nowIso()
  );

  if (!row) throw httpError("Your session has expired. Please sign in again.", 401);
  return getUserProfile(db, row.id);
}

async function getUserProfile(db, userId) {
  const user = await first(
    db,
    "SELECT users.id, users.phone, users.name, users.role, users.created_at, users.last_login_at, profiles.address, profiles.city, profiles.state, profiles.ecopoints, profiles.rating FROM users LEFT JOIN profiles ON profiles.user_id = users.id WHERE users.id = ?",
    userId
  );
  if (!user) throw httpError("User not found.", 404);
  return user;
}

async function tokenHashFromRequest(request) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  return token ? sha256(token) : null;
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function first(db, sql, ...bindings) {
  return db.prepare(sql).bind(...bindings).first();
}

async function all(db, sql, ...bindings) {
  const result = await db.prepare(sql).bind(...bindings).all();
  return result.results || [];
}

function serveStatic(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const file = resolveFile(url.pathname);
  if (!file) return new Response("Not Found", { status: 404 });

  const body = request.method === "HEAD" ? null : decodeBody(file);
  const headers = new Headers({
    "Content-Type": file.mimeType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Cache-Control": url.pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  });

  return new Response(body, { status: 200, headers });
}

function resolveFile(pathname) {
  if (pathname === "/" || pathname === "") return files["/index.html"];
  if (files[pathname]) return files[pathname];
  if (!pathname.split("/").pop().includes(".")) return files["/index.html"];
  return null;
}

function decodeBody(file) {
  if (file.encoding === "base64") {
    const binary = atob(file.body);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return file.body;
}

function json(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, OAI-Sites-Authorization",
    "Vary": "Origin",
  };
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\\D/g, "");
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return "234" + digits;
}

function normalizeRole(role, env, adminInviteCode) {
  const allowed = new Set(["household", "collector", "business", "partner"]);
  if (role === "admin" && env?.ADMIN_INVITE_CODE && adminInviteCode === env.ADMIN_INVITE_CODE) return "admin";
  return allowed.has(role) ? role : "household";
}

function maskPhone(phone) {
  return "+" + phone.slice(0, 3) + " " + phone.slice(3, 6) + " " + phone.slice(6, 9) + " " + phone.slice(9).replace(/\\d/g, "*");
}

function buildChallenges(totalPickups, wasteKg) {
  return [
    { title: "Sort 10kg Plastic", progress: Math.min(100, Math.round((wasteKg / 10) * 100)), points: 500 },
    { title: "5 Pickups This Month", progress: Math.min(100, Math.round((totalPickups / 5) * 100)), points: 1000 },
    { title: "Refer a Neighbor", progress: 0, points: 2000 },
  ];
}

function id(prefix) {
  return prefix + "_" + crypto.randomUUID().replace(/-/g, "").slice(0, 18);
}

function code(prefix) {
  return prefix + "-" + Math.floor(1000 + Math.random() * 9000);
}

function makeToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function nowIso() {
  return new Date().toISOString();
}

function addMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export default worker;
`;

await mkdir(serverDir, { recursive: true });
await writeFile(join(serverDir, "index.js"), worker);
