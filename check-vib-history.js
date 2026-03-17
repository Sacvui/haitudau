const axios = require('axios');

async function checkVIBHistory() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const toDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const fromDate = `${thirtyDaysAgo.getDate().toString().padStart(2, '0')}/${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}/${thirtyDaysAgo.getFullYear()}`;

    try {
        const response = await axios.get(`https://iboard-api.ssi.com.vn/statistics/company/ssmi/stock-info`, {
            params: { symbol: 'VIB', fromDate, toDate, page: 1, pageSize: 50 },
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://iboard.ssi.com.vn/',
                'device-id': '530C8E53-D902-46B4-9ACC-406F881AFBDD'
            }
        });

        const data = response.data.data || [];
        console.log(`VIB History: Total ${data.length} records.`);
        const activeRecords = data.filter(r => Number(r.netBuySellVal) !== 0);
        console.log(`Active foreign trade days: ${activeRecords.length}`);
        if (activeRecords.length > 0) {
            activeRecords.slice(0, 5).forEach(r => {
                console.log(`${r.tradingDate}: ${r.netBuySellVal}`);
            });
        }
    } catch (e) {
        console.error(e.message);
    }
}

checkVIBHistory();
