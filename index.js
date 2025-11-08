import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 8081;

app.get('/fetch-data', async (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).json({ error: '缺少 videoUrl 参数' });

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const type = request.resourceType();
            if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(type)) {
                request.abort();
            } else {
                request.continue();
            }
        });

        await page.goto(videoUrl, { waitUntil: 'networkidle2', timeout: 60000 });

        const content = await page.content();
        const match = content.match(/https?:\/\/[^\s'"]+\.m3u8/g);
        const hlsUrl = match ? match[0] : null;

        if (hlsUrl) {
            res.json({ hlsUrl });
            console.log(new Date().toLocaleString(), '✔', videoUrl);
        } else {
            res.status(404).json({ error: '未找到 hlsUrl' });
            console.log(new Date().toLocaleString(), '❌', videoUrl);
        }

    } catch (error) {
        console.error('抓取错误:', error);
        res.status(500).json({ error: '抓取失败' });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
