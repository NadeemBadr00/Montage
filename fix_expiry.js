const admin = require("firebase-admin");
const serviceAccount = require("./functions/service-account-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const UID = "WsffbzJxL5MlMre1ddEAakI8zo92"; // from merchant_order_id

// 10 paid transactions × 30 days = 300 days from now
const newExpiresAt = Date.now() + (300 * 24 * 60 * 60 * 1000);

async function fix() {
  await db.collection("users").doc(UID).set({
    plan: "ultra",
    billing: "monthly",
    planExpiresAt: newExpiresAt,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`✅ Updated planExpiresAt to ${new Date(newExpiresAt).toISOString()}`);
  console.log(`   That's ${Math.ceil((newExpiresAt - Date.now()) / (1000*60*60*24))} days from now`);
  process.exit(0);
}

fix().catch(e => { console.error(e); process.exit(1); });
