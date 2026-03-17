const axios = require('axios');

async function testVNDirect(symbol) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const startDate = `${thirtyDaysAgo.getFullYear()}-${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}-${thirtyDaysAgo.getDate().toString().padStart(2, '0')}`;

    console.log(`Testing VNDirect for ${symbol} starting ${startDate}...`);
    try {
        const response = await axios.get(`https://finfo-api.vndirect.com.vn/v4/foreign_trades`, {
            params: {
                sort: 'date',
                q: `code:${symbol}~date:gte:${startDate}`,
                size: 50,
                page: 1,
            },
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.vndirect.com.vn/' },
            timeout: 10000
        });

        if (response.data && response.data.data) {
            console.log(`Success! Found ${response.data.data.length} records.`);
            if (response.data.data.length > 0) {
                console.log("Sample:", response.data.data[0]);
            }
        } else {
            console.log("No data returned from VNDirect");
        }
    } catch (e) {
        console.error("VNDirect Error:", e.message);
    }
}

testVNDirect('VIB');
