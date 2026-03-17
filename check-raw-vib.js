const axios = require('axios');

async function checkRawVIB() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const toDate = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    const fromDate = `${thirtyDaysAgo.getDate().toString().padStart(2, '0')}/${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}/${thirtyDaysAgo.getFullYear()}`;

    try {
        const response = await axios.get(`https://iboard-api.ssi.com.vn/statistics/company/ssmi/stock-info`, {
            params: { symbol: 'VIB', fromDate, toDate, page: 1, pageSize: 2 },
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://iboard.ssi.com.vn/',
                'device-id': '530C8E53-D902-46B4-9ACC-406F881AFBDD'
            }
        });

        console.log(JSON.stringify(response.data.data[0], null, 2));
    } catch (e) {
        console.error(e.message);
    }
}

checkRawVIB();
