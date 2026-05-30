"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserCreated = exports.processRenderJob = exports.paymobWebhook = exports.confirmPayment = exports.createPaymobPayment = void 0;
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const path = require("path");
const os = require("os");
const fs = require("fs");
const https = require("https");
const http = require("http");
admin.initializeApp();
// ── Paymob Config ──────────────────────────────────────────────────────────
const PAYMOB_API_KEY = "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRFMU5qWXlOQ3dpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS5aZDB4aTRKYzU4eTJwV3ZhWUdLSExEdTl1Q3Fzc3NPdmRKVnBOYWlXMDduc2hLdlNSVlA3WWt4NTNnR1djQTI2bGJHRktyZjdOY2g4bGg4TVFJQmFtdw==";
const PAYMOB_INTEGRATION_ID_CARD = 5633576; // VPC - Visa/Card - EGP
const PAYMOB_IFRAME_ID = 1036856;
const PAYMOB_HMAC = "EEAF1E269143BE53F0BC6E88ED1EE3EE";
// Plan prices in piasters (EGP × 100)
const PLAN_PRICES = {
    pro: { monthly: 25000, yearly: 250000 }, // 250 EGP / 2500 EGP
    ultra: { monthly: 50000, yearly: 500000 }, // 500 EGP / 5000 EGP
};
// ── createPaymobPayment ────────────────────────────────────────────────────
exports.createPaymobPayment = functions
    .runWith({ timeoutSeconds: 60 })
    .https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e;
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    // Parse body — support both raw JSON and pre-parsed
    let body = req.body;
    if (typeof body === "string") {
        try {
            body = JSON.parse(body);
        }
        catch (_f) {
            body = {};
        }
    }
    if (!body || typeof body !== "object")
        body = {};
    const { plan, billing, userEmail, userName } = body;
    console.log("[Paymob] Received:", { plan, billing, userEmail: userEmail ? "✓" : "✗" });
    if (!plan || !billing || !((_a = PLAN_PRICES[plan]) === null || _a === void 0 ? void 0 : _a[billing])) {
        console.error("[Paymob] Validation failed:", { plan, billing, body: JSON.stringify(body).slice(0, 200) });
        res.status(400).json({ error: `Invalid plan (${plan}) or billing (${billing})` });
        return;
    }
    // Security Check: Verify Firebase ID Token
    const authHeader = req.headers.authorization || "";
    let uid = "guest";
    if (authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1];
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            uid = decodedToken.uid;
        }
        catch (error) {
            console.error("[Paymob] Auth token verification failed:", error);
            res.status(401).json({ error: "Unauthorized: Invalid auth token" });
            return;
        }
    }
    else {
        res.status(401).json({ error: "Unauthorized: Missing auth token" });
        return;
    }
    let amountCents = PLAN_PRICES[plan][billing];
    let isUpgrade = false;
    let isExtension = false;
    let discountCents = 0;
    let currentExpiresAt = null;
    // Fetch user's current plan from Firestore to handle proration and extensions
    try {
        const userDoc = await admin.firestore().collection("users").doc(uid).get();
        let currentPlan = "free";
        if (userDoc.exists && ((_b = userDoc.data()) === null || _b === void 0 ? void 0 : _b.plan)) {
            const userData = userDoc.data();
            currentPlan = userData.plan;
            currentExpiresAt = userData.planExpiresAt;
        }
        else {
            // Fallback: If user has no Firestore record, they might be on the default 30-day trial.
            // We verify this securely by checking their Auth account creation time.
            const userRecord = await admin.auth().getUser(uid);
            const creationTimeMs = new Date(userRecord.metadata.creationTime).getTime();
            const trialExpiresAt = creationTimeMs + 30 * 24 * 60 * 60 * 1000;
            if (trialExpiresAt > Date.now()) {
                currentPlan = "ultra";
                currentExpiresAt = trialExpiresAt;
                console.log(`[Paymob] User ${uid} has no Firestore doc, but has valid trial until ${new Date(trialExpiresAt).toISOString()}`);
            }
        }
        // Extension Logic: Buying the same plan they already have (e.g., extending Ultra trial)
        if (currentPlan === plan && currentExpiresAt && currentExpiresAt > Date.now()) {
            isExtension = true;
            console.log(`[Paymob] Extension: ${plan}. Current expiry: ${new Date(currentExpiresAt).toISOString()}`);
        }
        // Proration Logic: Upgrading from Pro to Ultra
        else if (currentPlan === "pro" && plan === "ultra" && currentExpiresAt && currentExpiresAt > Date.now()) {
            isUpgrade = true;
            const daysLeft = Math.ceil((currentExpiresAt - Date.now()) / (1000 * 60 * 60 * 24));
            const docData = userDoc.exists ? userDoc.data() : {};
            const currentBilling = docData.billing || "monthly";
            const currentPrice = PLAN_PRICES["pro"][currentBilling];
            const totalDays = currentBilling === "yearly" ? 365 : 30;
            // Calculate remaining value of current plan
            discountCents = Math.floor((daysLeft / totalDays) * currentPrice);
            amountCents = Math.max(0, amountCents - discountCents);
            console.log(`[Paymob] Upgrade: Pro -> Ultra. Days left: ${daysLeft}. Discount: ${discountCents}. New Amount: ${amountCents}`);
        }
    }
    catch (err) {
        console.warn("[Paymob] Could not fetch user data for proration:", err);
    }
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const axios = require("axios");
        // Step 1: Authenticate with Paymob
        const authRes = await axios.post("https://accept.paymob.com/api/auth/tokens", {
            api_key: PAYMOB_API_KEY,
        });
        const authToken = authRes.data.token;
        // Step 2: Create Order
        const orderRes = await axios.post("https://accept.paymob.com/api/ecommerce/orders", {
            auth_token: authToken,
            delivery_needed: false,
            amount_cents: amountCents,
            currency: "EGP",
            merchant_order_id: `${uid}_${plan}_${billing}_${Date.now()}`,
            items: [{
                    name: `AI4Montage ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan (${billing})`,
                    amount_cents: amountCents,
                    description: isUpgrade
                        ? `Upgrade to ${plan} (${billing}) - Prorated discount applied`
                        : `AI4Montage ${plan} subscription - ${billing}`,
                    quantity: 1,
                }],
        });
        const orderId = orderRes.data.id;
        // Step 3: Payment Key
        const durationMs = billing === "yearly"
            ? 365 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
        const expiresAt = (isExtension && currentExpiresAt && currentExpiresAt > Date.now())
            ? currentExpiresAt + durationMs
            : Date.now() + durationMs;
        const firstName = (userName || "AI4Montage User").split(" ")[0] || "User";
        const lastName = (userName || "AI4Montage User").split(" ").slice(1).join(" ") || "User";
        const pkRes = await axios.post("https://accept.paymob.com/api/acceptance/payment_keys", {
            auth_token: authToken,
            amount_cents: amountCents,
            expiration: 3600,
            order_id: orderId,
            billing_data: {
                apartment: "NA", floor: "NA", building: "NA",
                street: "NA", state: "NA", shipping_method: "NA",
                postal_code: "NA", city: "Cairo", country: "EG",
                phone_number: "+201000000000",
                email: userEmail || "user@ai4montage.com",
                first_name: firstName,
                last_name: lastName,
            },
            currency: "EGP",
            integration_id: PAYMOB_INTEGRATION_ID_CARD,
        });
        const paymentKey = pkRes.data.token;
        // Save pending subscription to Firestore
        await admin.firestore().collection("pendingPayments").doc(String(orderId)).set({
            uid, plan, billing, orderId, amountCents,
            status: "pending", expiresAt,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(200).json({
            paymentKey,
            orderId,
            iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`,
        });
    }
    catch (err) {
        console.error("[Paymob] Error:", ((_c = err === null || err === void 0 ? void 0 : err.response) === null || _c === void 0 ? void 0 : _c.data) || err.message);
        res.status(500).json({ error: "Payment creation failed: " + (((_e = (_d = err === null || err === void 0 ? void 0 : err.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.message) || err.message) });
    }
});
// ── confirmPayment ─────────────────────────────────────────────────────────
// Zero-Trust Server-Side Verification Protocol
// Accepts ONLY the Paymob Transaction ID from the client (from ?id= in redirect URL).
// Verifies directly via Paymob's Transaction Inquiry API, then activates subscription.
exports.confirmPayment = functions
    .runWith({ timeoutSeconds: 60, memory: "256MB" })
    .https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e, _f;
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method Not Allowed" });
        return;
    }
    try {
        const axios = require("axios"); // eslint-disable-line @typescript-eslint/no-var-requires
        // Accept transactionId (from ?id= in Paymob redirect) OR legacy orderId
        const { transactionId, orderId } = req.body;
        // ── Path A: Zero-Trust via Transaction ID (Paymob VPC/MPGS) ──
        if (transactionId) {
            console.log(`[confirmPayment] Zero-Trust path. transactionId: ${transactionId}`);
            // Step 1: Authenticate with Paymob
            const authRes = await axios.post("https://accept.paymob.com/api/auth/tokens", {
                api_key: PAYMOB_API_KEY,
            });
            const authToken = authRes.data.token;
            // Step 2: Fetch full transaction data directly from Paymob
            // This is the KEY endpoint: /api/acceptance/transactions/{id}?token={token}
            const txRes = await axios.get(`https://accept.paymob.com/api/acceptance/transactions/${transactionId}?token=${authToken}`);
            const txData = txRes.data;
            console.log(`[confirmPayment] Paymob tx data: success=${txData.success}, amount=${txData.amount_cents}, merchant_order_id=${(_a = txData.order) === null || _a === void 0 ? void 0 : _a.merchant_order_id}`);
            // Step 3: Verify transaction is successful
            const isSuccess = txData.success === true;
            const isVoided = txData.is_voided === true;
            const isRefunded = txData.is_refunded === true;
            if (!isSuccess || isVoided || isRefunded) {
                res.status(400).json({ success: false, message: "Transaction declined, voided, or refunded." });
                return;
            }
            // Step 4: Extract the internal Paymob Order ID from the transaction
            // merchant_order_id was set by us as: uid_plan_billing_timestamp
            // The Paymob Order ID (numeric) is the key in our pendingPayments collection
            const paymobOrderId = String(((_b = txData.order) === null || _b === void 0 ? void 0 : _b.id) || "");
            const merchantOrderId = ((_c = txData.order) === null || _c === void 0 ? void 0 : _c.merchant_order_id) || "";
            if (!paymobOrderId) {
                console.error(`[confirmPayment] No order.id in transaction ${transactionId}`);
                res.status(500).json({ error: "Could not resolve internal order reference." });
                return;
            }
            // Step 5: Atomic Firestore transaction for idempotency
            let alreadyPaid = false;
            await admin.firestore().runTransaction(async (fsTx) => {
                const pendingRef = admin.firestore().collection("pendingPayments").doc(paymobOrderId);
                const pendingDoc = await fsTx.get(pendingRef);
                if (!pendingDoc.exists) {
                    throw new Error("ORDER_NOT_FOUND");
                }
                const internalData = pendingDoc.data();
                // Idempotency guard
                if (internalData.status === "paid") {
                    alreadyPaid = true;
                    return;
                }
                // Amount integrity check (prevent $1 paying for $100 plan)
                if (internalData.amountCents !== txData.amount_cents) {
                    console.warn(`[confirmPayment] Amount mismatch! Expected ${internalData.amountCents}, got ${txData.amount_cents}`);
                    throw new Error("AMOUNT_MISMATCH");
                }
                // Activate subscription
                const userRef = admin.firestore().collection("users").doc(internalData.uid);
                fsTx.set(userRef, {
                    plan: internalData.plan,
                    billing: internalData.billing,
                    planExpiresAt: internalData.expiresAt,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                fsTx.update(pendingRef, {
                    status: "paid",
                    paymobTransactionId: String(transactionId),
                    merchantOrderId,
                    verificationMethod: "synchronous_polling",
                    paidAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`[confirmPayment] ✅ Activated user ${internalData.uid} → ${internalData.plan} (${internalData.billing})`);
            });
            res.json({ success: true, alreadyActivated: alreadyPaid });
            return;
        }
        // ── Path B: Legacy orderId fallback ──
        if (orderId) {
            console.log(`[confirmPayment] Legacy orderId path: ${orderId}`);
            const pendingRef = admin.firestore().collection("pendingPayments").doc(String(orderId));
            const pending = await pendingRef.get();
            if (!pending.exists) {
                res.status(404).json({ error: "Order not found" });
                return;
            }
            if (pending.data().status === "paid") {
                res.json({ success: true, alreadyActivated: true });
                return;
            }
            const authRes = await axios.post("https://accept.paymob.com/api/auth/tokens", { api_key: PAYMOB_API_KEY });
            const authToken = authRes.data.token;
            const orderRes = await axios.get(`https://accept.paymob.com/api/ecommerce/orders/${orderId}`, { headers: { Authorization: `Bearer ${authToken}` } });
            const isPaid = orderRes.data.paid_amount_cents >= orderRes.data.amount_cents;
            if (isPaid) {
                await activateSubscription(String(orderId));
                res.json({ success: true });
            }
            else {
                res.json({ success: false, message: "Payment not confirmed" });
            }
            return;
        }
        res.status(400).json({ error: "Missing transactionId or orderId" });
    }
    catch (err) {
        if (err.message === "ALREADY_PAID_IDEMPOTENT") {
            res.json({ success: true, alreadyActivated: true });
            return;
        }
        if (err.message === "ORDER_NOT_FOUND") {
            res.status(404).json({ success: false, error: "Order not found" });
            return;
        }
        if (err.message === "AMOUNT_MISMATCH") {
            res.status(400).json({ success: false, error: "Security check failed" });
            return;
        }
        console.error("[confirmPayment] Error:", ((_d = err === null || err === void 0 ? void 0 : err.response) === null || _d === void 0 ? void 0 : _d.data) || err.message);
        res.status(500).json({ error: "Confirmation failed: " + (((_f = (_e = err === null || err === void 0 ? void 0 : err.response) === null || _e === void 0 ? void 0 : _e.data) === null || _f === void 0 ? void 0 : _f.message) || err.message) });
    }
});
// ── paymobWebhook ─────────────────────────────────────────────────────────
exports.paymobWebhook = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    try {
        if (req.method === "GET" && req.query.fetchLogs === "true") {
            const snap = await admin.firestore().collection("webhookLogs").orderBy("timestamp", "desc").limit(5).get();
            res.json(snap.docs.map(d => d.data()));
            return;
        }
        const crypto = require("crypto");
        const body = req.body;
        // Full debug log
        await admin.firestore().collection("webhookLogs").add({
            method: req.method,
            contentType: req.headers["content-type"] || null,
            queryParams: req.query,
            queryHmac: req.query.hmac || null,
            body: body,
            bodyKeys: Object.keys(body || {}),
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        const hasBody = body && Object.keys(body).length > 0;
        // ── Path 1: Standard JSON webhook ──
        if (hasBody) {
            const hmacFields = [
                (_a = body.obj) === null || _a === void 0 ? void 0 : _a.amount_cents,
                (_b = body.obj) === null || _b === void 0 ? void 0 : _b.created_at,
                (_c = body.obj) === null || _c === void 0 ? void 0 : _c.currency,
                (_d = body.obj) === null || _d === void 0 ? void 0 : _d.error_occured,
                (_e = body.obj) === null || _e === void 0 ? void 0 : _e.has_parent_transaction,
                (_f = body.obj) === null || _f === void 0 ? void 0 : _f.id,
                (_g = body.obj) === null || _g === void 0 ? void 0 : _g.integration_id,
                (_h = body.obj) === null || _h === void 0 ? void 0 : _h.is_3d_secure,
                (_j = body.obj) === null || _j === void 0 ? void 0 : _j.is_auth,
                (_k = body.obj) === null || _k === void 0 ? void 0 : _k.is_capture,
                (_l = body.obj) === null || _l === void 0 ? void 0 : _l.is_refunded,
                (_m = body.obj) === null || _m === void 0 ? void 0 : _m.is_standalone_payment,
                (_o = body.obj) === null || _o === void 0 ? void 0 : _o.is_voided,
                (_q = (_p = body.obj) === null || _p === void 0 ? void 0 : _p.order) === null || _q === void 0 ? void 0 : _q.id,
                (_r = body.obj) === null || _r === void 0 ? void 0 : _r.owner,
                (_s = body.obj) === null || _s === void 0 ? void 0 : _s.pending,
                (_u = (_t = body.obj) === null || _t === void 0 ? void 0 : _t.source_data) === null || _u === void 0 ? void 0 : _u.pan,
                (_w = (_v = body.obj) === null || _v === void 0 ? void 0 : _v.source_data) === null || _w === void 0 ? void 0 : _w.sub_type,
                (_y = (_x = body.obj) === null || _x === void 0 ? void 0 : _x.source_data) === null || _y === void 0 ? void 0 : _y.type,
                (_z = body.obj) === null || _z === void 0 ? void 0 : _z.success,
            ];
            const hmacStr = hmacFields.map((v) => String(v !== null && v !== void 0 ? v : "")).join("");
            const computedHmac = crypto.createHmac("sha512", PAYMOB_HMAC).update(hmacStr).digest("hex");
            if (!req.query.hmac || computedHmac !== req.query.hmac) {
                console.warn(`[Webhook] HMAC mismatch. Expected: ${computedHmac.substring(0, 20)}..., Got: ${String(req.query.hmac || "").substring(0, 20)}...`);
                res.status(401).send("Unauthorized: Invalid HMAC");
                return;
            }
            const success = ((_0 = body.obj) === null || _0 === void 0 ? void 0 : _0.success) === true || ((_1 = body.obj) === null || _1 === void 0 ? void 0 : _1.success) === "true";
            const orderId = String(((_3 = (_2 = body.obj) === null || _2 === void 0 ? void 0 : _2.order) === null || _3 === void 0 ? void 0 : _3.id) || "");
            if (success && orderId) {
                await activateSubscription(orderId);
            }
            res.status(200).send("OK");
            return;
        }
        // ── Path 2: VPC/MPGS query-string webhook ──
        const qOrderId = String(req.query["order_id"] || req.query["orderId"] || req.query["vpc_MerchTxnRef"] || "");
        const qSuccess = req.query["vpc_TxnResponseCode"] === "0" || req.query["success"] === "true";
        console.log(`[Webhook] VPC path — orderId: ${qOrderId}, success: ${qSuccess}, query: ${JSON.stringify(req.query)}`);
        if (qSuccess && qOrderId) {
            await activateSubscription(qOrderId);
        }
        res.status(200).send("OK");
    }
    catch (err) {
        console.error("[Webhook] Error:", err);
        res.status(500).send("Error");
    }
});
// ── Helper: activate subscription ─────────────────────────────────────────
async function activateSubscription(orderId) {
    const pendingRef = admin.firestore().collection("pendingPayments").doc(orderId);
    const pending = await pendingRef.get();
    if (!pending.exists) {
        console.warn(`[Webhook] No pending payment for orderId: ${orderId}`);
        return;
    }
    const { uid, plan, billing, expiresAt } = pending.data();
    if (!uid)
        return;
    await admin.firestore().collection("users").doc(uid).set({ plan, billing, planExpiresAt: expiresAt, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    await pendingRef.update({ status: "paid", paidAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`[Webhook] ✅ Activated: user ${uid} → ${plan} (${billing}) until ${new Date(expiresAt).toISOString()}`);
}
// ── Helper: download a URL to a local file ────────────────────────────────
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const protocol = url.startsWith("https") ? https : http;
        protocol.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on("finish", () => { file.close(); resolve(); });
        }).on("error", (err) => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}
// ── processRenderJob ──────────────────────────────────────────────────────
exports.processRenderJob = functions
    .runWith({ timeoutSeconds: 540, memory: "8GB" })
    .firestore
    .document("renders/{renderId}")
    .onCreate(async (snap, context) => {
    var _a, _b, _c, _d, _e, _f;
    const renderId = context.params.renderId;
    const data = snap.data();
    const docRef = snap.ref;
    console.log(`[Render] Starting job ${renderId}`);
    await docRef.update({ status: "PROCESSING", startedAt: admin.firestore.FieldValue.serverTimestamp() });
    const timeline = data.timeline;
    const fps = timeline.fps || 30;
    const resolution = timeline.resolution || { width: 1920, height: 1080 };
    const tracks = timeline.tracks || [];
    const tmpDir = path.join(os.tmpdir(), renderId);
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const ffmpeg = require("fluent-ffmpeg");
        ffmpeg.setFfmpegPath(ffmpegInstaller.path);
        fs.mkdirSync(tmpDir, { recursive: true });
        const assetUrls = new Set();
        for (const track of tracks) {
            for (const clip of (track.clips || [])) {
                const src = clip.assetUrl || clip.src;
                if (src && (src.startsWith("http://") || src.startsWith("https://"))) {
                    assetUrls.add(src);
                }
            }
        }
        const urlToLocal = new Map();
        await Promise.all(Array.from(assetUrls).map(async (url, i) => {
            const ext = url.includes(".png") ? ".png" : url.includes(".jpg") ? ".jpg" : ".mp4";
            const localPath = path.join(tmpDir, `asset_${i}${ext}`);
            try {
                await downloadFile(url, localPath);
                urlToLocal.set(url, localPath);
                console.log(`[Render] Downloaded asset ${i}: ${url.slice(-40)}`);
            }
            catch (e) {
                console.error(`[Render] Failed to download asset: ${url}`, e);
            }
        }));
        const allClips = [];
        for (const track of tracks) {
            for (const clip of (track.clips || [])) {
                const src = clip.assetUrl || clip.src;
                const local = urlToLocal.get(src);
                if (!local && clip.type !== "image")
                    continue;
                allClips.push(Object.assign(Object.assign({}, clip), { localPath: local }));
            }
        }
        if (allClips.length === 0)
            throw new Error("No downloadable clips found in timeline");
        const totalDuration = timeline.duration ||
            Math.max(...allClips.map((c) => (c.start || 0) + (c.duration || 0)));
        const audioClips = allClips.filter((c) => (c.type === "audio" || c.type === "video") && c.localPath);
        const outputPath = path.join(tmpDir, "output.mp4");
        const cmd = ffmpeg();
        let inputIndex = 0;
        for (const clip of allClips) {
            if (!clip.localPath)
                continue;
            cmd.input(clip.localPath);
            if (clip.type === "image")
                cmd.inputOptions(["-loop", "1"]);
            clip.ffmpegInputIndex = inputIndex++;
        }
        const w = resolution.width;
        const h = resolution.height;
        const filterParts = [];
        let lastVideo = "";
        filterParts.push(`color=black:s=${w}x${h}:r=${fps}:d=${totalDuration}[base]`);
        lastVideo = "[base]";
        for (const clip of allClips) {
            if (clip.ffmpegInputIndex === undefined)
                continue;
            const idx = clip.ffmpegInputIndex;
            const outLabel = `[out${idx}]`;
            const start = clip.start || 0;
            const duration = clip.duration || 5;
            const x = Math.round((((_a = clip.properties) === null || _a === void 0 ? void 0 : _a.x) || 0) + w / 2 - (((_b = clip.properties) === null || _b === void 0 ? void 0 : _b.width) || w) / 2);
            const y = Math.round((((_c = clip.properties) === null || _c === void 0 ? void 0 : _c.y) || 0) + h / 2 - (((_d = clip.properties) === null || _d === void 0 ? void 0 : _d.height) || h) / 2);
            const cw = ((_e = clip.properties) === null || _e === void 0 ? void 0 : _e.width) || w;
            const ch = ((_f = clip.properties) === null || _f === void 0 ? void 0 : _f.height) || h;
            filterParts.push(`[${idx}:v]scale=${cw}:${ch},setpts=PTS-STARTPTS+${start}/TB[${idx}sc]`);
            filterParts.push(`${lastVideo}[${idx}sc]overlay=${x}:${y}:enable='between(t,${start},${start + duration})':format=auto[${outLabel.slice(1, -1)}]`);
            lastVideo = outLabel;
        }
        filterParts.push(`${lastVideo}copy[finalv]`);
        if (audioClips.length > 0) {
            audioClips.forEach((c) => {
                const delayMs = (c.start || 0) * 1000;
                filterParts.push(`[${c.ffmpegInputIndex}:a]adelay=${delayMs}|${delayMs}[a${c.ffmpegInputIndex}]`);
            });
            const mixInputs = audioClips.map((c) => `[a${c.ffmpegInputIndex}]`).join("");
            filterParts.push(`${mixInputs}amix=inputs=${audioClips.length}:duration=longest[finala]`);
        }
        cmd.complexFilter(filterParts).outputOptions([
            `-map [finalv]`, "-c:v libx264", "-preset fast", "-crf 23",
            `-r ${fps}`, "-pix_fmt yuv420p", "-movflags +faststart", `-t ${totalDuration}`,
        ]);
        if (audioClips.length > 0) {
            cmd.outputOptions(["-map [finala]", "-c:a aac", "-b:a 128k"]);
        }
        else {
            cmd.outputOptions("-an");
        }
        cmd.output(outputPath);
        console.log(`[Render] Starting ffmpeg render for ${renderId}...`);
        await new Promise((resolve, reject) => {
            cmd
                .on("progress", (p) => { var _a; return console.log(`[Render] Progress: ${((_a = p.percent) === null || _a === void 0 ? void 0 : _a.toFixed(1)) || "?"}%`); })
                .on("end", () => { console.log(`[Render] ffmpeg done for ${renderId}`); resolve(); })
                .on("error", (err) => { console.error(`[Render] ffmpeg error for ${renderId}:`, err); reject(err); })
                .run();
        });
        const bucket = admin.storage().bucket();
        const storagePath = `renders/${renderId}/output.mp4`;
        const token = require("crypto").randomUUID();
        await bucket.upload(outputPath, {
            destination: storagePath,
            metadata: { contentType: "video/mp4", metadata: { firebaseStorageDownloadTokens: token } },
        });
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
        await docRef.update({ status: "COMPLETED", downloadUrl, completedAt: admin.firestore.FieldValue.serverTimestamp() });
        console.log(`[Render] Job ${renderId} COMPLETED. URL: ${downloadUrl.slice(0, 60)}...`);
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    catch (error) {
        console.error(`[Render] Job ${renderId} FAILED:`, error);
        await docRef.update({ status: "FAILED", error: (error === null || error === void 0 ? void 0 : error.message) || String(error), failedAt: admin.firestore.FieldValue.serverTimestamp() });
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});
// ── onUserCreated ─────────────────────────────────────────────────────────
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    const email = user.email || "";
    const name = user.displayName || email.split("@")[0] || "User";
    const photo = user.photoURL || "";
    // Securely grant a 30-day Ultra Trial to all new users upon signup
    const creationTimeMs = new Date(user.metadata.creationTime).getTime();
    const planExpiresAt = creationTimeMs + 30 * 24 * 60 * 60 * 1000;
    console.log(`[Auth] New user created: ${uid}. Granting 30-day Ultra trial until ${new Date(planExpiresAt).toISOString()}`);
    await admin.firestore().collection("users").doc(uid).set({
        uid,
        name,
        email,
        photo,
        plan: "ultra",
        planExpiresAt,
        billing: "monthly",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
});
//# sourceMappingURL=index.js.map