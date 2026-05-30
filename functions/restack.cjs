/**
 * Run with: node restack.js
 * Uses firebase-admin with application default credentials (from firebase login)
 */

process.env.GOOGLE_CLOUD_PROJECT = "ai-roadmap-nadeem";

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp({ credential: applicationDefault(), projectId: "ai-roadmap-nadeem" });

const db = getFirestore();

const UID = "WsffbzJxL5MlMre1ddEAakI8zo92";

async function restack() {
  const userRef = db.collection("users").doc(UID);

  // Step 1: Reset to 0
  await userRef.set({ planExpiresAt: 0 }, { merge: true });
  console.log("✅ Reset planExpiresAt to 0");

  // Step 2: Get all paid orders sorted by paidAt
  const snap = await db.collection("pendingPayments")
    .where("uid", "==", UID)
    .where("status", "==", "paid")
    .get();

  const docs = snap.docs.sort((a, b) =>
    (a.data().paidAt?.toMillis?.() ?? 0) - (b.data().paidAt?.toMillis?.() ?? 0)
  );

  console.log(`Found ${docs.length} paid orders`);

  let currentExpiry = 0;
  for (const doc of docs) {
    const { plan, billing } = doc.data();
    const durationMs = billing === "yearly"
      ? 365 * 24 * 60 * 60 * 1000
      : 30  * 24 * 60 * 60 * 1000;

    const newExpiry = currentExpiry > Date.now()
      ? currentExpiry + durationMs
      : Date.now() + durationMs;

    await userRef.set({
      plan, billing,
      planExpiresAt: newExpiry,
      updatedAt: new Date(),
    }, { merge: true });

    currentExpiry = newExpiry;
    console.log(`  ✦ Order ${doc.id} (${billing}) → expires ${new Date(newExpiry).toDateString()}`);
  }

  const days = Math.ceil((currentExpiry - Date.now()) / (1000 * 60 * 60 * 24));
  console.log(`\n🎉 Done! Total: ${days} days → expires ${new Date(currentExpiry).toDateString()}`);
  process.exit(0);
}

restack().catch(e => { console.error(e); process.exit(1); });
