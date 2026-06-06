// @ts-nocheck
// youtube-upload.ts — Direct Resumable Upload to YouTube API v3
// Client-side only. Requires a Google Cloud Console Client ID.

const CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com"; // ⚠️ MUST BE SET BY USER
const SCOPES = "https://www.googleapis.com/auth/youtube.upload";

// Load Google Identity Services dynamically
async function loadGoogleIdentity(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (window.google?.accounts?.oauth2) {
            resolve();
            return;
        }
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
        document.body.appendChild(script);
    });
}

export async function authenticateGoogle(): Promise<string> {
    await loadGoogleIdentity();
    return new Promise((resolve, reject) => {
        const client = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    resolve(tokenResponse.access_token);
                } else {
                    reject(new Error("No access token returned"));
                }
            },
            error_callback: (err: any) => reject(err)
        });
        client.requestAccessToken();
    });
}

// Resumable upload for large MP4 blobs
export async function uploadToYouTube(
    blob: Blob, 
    accessToken: string, 
    metadata: { title: string, description: string, privacyStatus: string },
    onProgress: (percent: number) => void
) {
    const app = (window as any).app;
    if (app?.log) app.log("🚀 جاري بدء جلسة الرفع ليوتيوب...");

    // 1. Initialize Resumable Session
    const initResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Upload-Content-Length': blob.size.toString(),
            'X-Upload-Content-Type': 'video/mp4'
        },
        body: JSON.stringify({
            snippet: {
                title: metadata.title,
                description: metadata.description,
                categoryId: "22" // People & Blogs
            },
            status: {
                privacyStatus: metadata.privacyStatus || 'private',
                selfDeclaredMadeForKids: false
            }
        })
    });

    if (!initResponse.ok) {
        throw new Error(`YouTube API Init Error: ${await initResponse.text()}`);
    }

    const uploadUrl = initResponse.headers.get('Location');
    if (!uploadUrl) {
        throw new Error("YouTube API did not return an upload URL");
    }

    if (app?.log) app.log("📤 جاري رفع ملف الفيديو...");

    // 2. Upload the Blob (Using XMLHttpRequest to get progress events easily)
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
        
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                onProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const responseData = JSON.parse(xhr.responseText);
                resolve(`https://youtu.be/${responseData.id}`);
            } else {
                reject(new Error(`Upload failed: ${xhr.responseText}`));
            }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        
        xhr.send(blob);
    });
}
