const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Log console messages from the browser to our node console
    page.on('console', msg => {
        console.log(`[Browser] ${msg.type()}: ${msg.text()}`);
    });

    console.log("Navigating to http://localhost:5173/test_client_render.html");
    await page.goto('http://localhost:5173/test_client_render.html', { waitUntil: 'networkidle2' });

    console.log("Clicking the start button...");
    await page.click('#startBtn');

    console.log("Waiting for rendering to finish (timeout 60s)...");
    
    try {
        await page.waitForFunction(
            () => document.getElementById('log').innerText.includes('اكتمل الدمج بنجاح'),
            { timeout: 60000 }
        );
        console.log("Rendering finished successfully!");
    } catch (e) {
        console.error("Timeout or Error waiting for render to finish.");
        const logContent = await page.$eval('#log', el => el.innerText);
        console.log("Final log content:\n", logContent);
    }

    await browser.close();
})();
