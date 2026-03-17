const axios = require('axios');

async function checkStock(symbol) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const toDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const fromDate = `${thirtyDaysAgo.getDate().toString().padStart(2, '0')}/${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}/${thirtyDaysAgo.getFullYear()}`;

    try {
        const response = await axios.get(`https://iboard-api.ssi.com.vn/statistics/company/ssmi/stock-info`, {
            params: { symbol, fromDate, toDate, page: 1, pageSize: 5 },
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://iboard.ssi.com.vn/',
                'device-id': '530C8E53-D902-46B4-9ACC-406F881AFBDD'
            },
            timeout: 10000
        });

        if (response.data && response.data.data) {
            const records = response.data.data;
            console.log(`[${symbol}] Found ${records.length} records.`);
            if (records.length > 0) {
                const totalNet = records.reduce((sum, r) => sum + (Number(r.netBuySellVal) || 0), 0);
                console.log(`[${symbol}] Latest: ${records[0].tradingDate}, Net: ${records[0].netBuySellVal}`);
                console.log(`[${symbol}] 5-day approx total: ${(totalNet / 1e9).toFixed(2)}B`);
            }
        } else {
            console.log(`[${symbol}] No data returned.`);
        }
    } catch (e) {
        console.error(`[${symbol}] Error: ${e.message}`);
    }
}

async function run() {
    await checkStock('VNM');
    await checkStock('VIB');
    await checkStock('FPT');
}

run();
