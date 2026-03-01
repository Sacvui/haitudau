const fetch = require('node-fetch');

async function testFetch() {
    try {
        console.log('Testing Fireant Fundamental API...');
        // Fireant requires specific headers
        const res = await fetch('https://restv2.fireant.vn/symbols/FPT/fundamental', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Origin': 'https://fireant.vn',
                'Referer': 'https://fireant.vn/'
            }
        });

        console.log('Status:', res.status);
        if (res.status === 200) {
            const data = await res.json();
            console.log(data);
        } else {
            console.log(await res.text());
        }
    } catch (e) {
        console.error(e);
    }

    try {
        console.log('Testing DNSE Fundamental API...');
        // DNSE is a modern broker with a fast API
        const res = await fetch('https://services.entrade.com.vn/chart-api/v2/ohlcs/symbols/FPT?resolution=D&from=1700000000&to=1720000000', {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        console.log('Status DNSE:', res.status);
    } catch (e) {
        console.error(e);
    }
}

testFetch();
