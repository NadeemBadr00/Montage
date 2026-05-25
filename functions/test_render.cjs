const admin = require("firebase-admin");

// Initialize Firebase Admin (assuming credentials are set or using default from gcloud)
admin.initializeApp({
  projectId: "ai-roadmap-nadeem", // the project ID used in the function deploy
  storageBucket: "ai-roadmap-nadeem.firebasestorage.app"
});

const db = admin.firestore();

async function testRender() {
  console.log("Creating test render job in Firestore...");
  
  // A test timeline with a single 8-second image clip
  const timelineJson = {
      projectId: "proj_test_" + Date.now(),
      resolution: { width: 1080, height: 1920 }, // 9:16 vertical
      fps: 30,
      duration: 8,
      tracks: [
          {
              id: "track_0",
              clips: [
                  {
                      id: "clip_0",
                      type: "image",
                      src: "https://firebasestorage.googleapis.com/v0/b/ai-roadmap-nadeem.firebasestorage.app/o/editor-assets%2F1779652741005_2qvew8oweb1?alt=media", // user's previous bg.png
                      assetUrl: "https://firebasestorage.googleapis.com/v0/b/ai-roadmap-nadeem.firebasestorage.app/o/editor-assets%2F1779652741005_2qvew8oweb1?alt=media",
                      start: 0,
                      duration: 8, // 8 seconds
                      properties: { width: 1080, height: 1920, x: 0, y: 0, opacity: 100 }
                  }
              ]
          }
      ]
  };

  const docRef = await db.collection("renders").add({
      status: "QUEUED",
      timeline: timelineJson,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Job created with ID: ${docRef.id}`);
  console.log("Listening for status updates...");

  // Listen to changes
  const unsubscribe = docRef.onSnapshot(doc => {
      const data = doc.data();
      if (!data) return;
      
      console.log(`[Status Update] Status: ${data.status}`);
      if (data.status === "COMPLETED") {
          console.log(`✅ Render Complete! URL: ${data.downloadUrl}`);
          unsubscribe();
          process.exit(0);
      } else if (data.status === "FAILED") {
          console.error(`❌ Render Failed! Error: ${data.error}`);
          unsubscribe();
          process.exit(1);
      }
  });
}

testRender().catch(err => {
    console.error("Script error:", err);
    process.exit(1);
});
