const fetch = require('node-fetch');

async function scrape() {
    try {
        console.log('Fetching Simplize page...');
        const res = await fetch('https://simplize.vn/co-phieu/FPT/ho-so-doanh-nghiep', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const html = await res.text();

        // Find __NEXT_DATA__
        const regex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
        const match = html.match(regex);
        if (match && match[1]) {
            const data = JSON.parse(match[1]);
            // Search inside the huge JSON for anything looking like "eps" or "pe"
            const strData = JSON.stringify(data);
            console.log('Found NEXT_DATA, length:', strData.length);

            // Try Fireant page scraping
            const res2 = await fetch('https://fireant.vn/dashboard/content/symbols/FPT', {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            console.log('Fireant status:', res2.status);

        } else {
            console.log('No NEXT_DATA found');
        }
    } catch (e) {
        console.error(e);
    }
}
scrape();
