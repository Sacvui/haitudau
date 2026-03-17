const axios = require('axios');

async function checkAllFields() {
    try {
        const response = await axios.get(`https://iboard-api.ssi.com.vn/statistics/company/ssmi/stock-info`, {
            params: { symbol: 'VIB', fromDate: '01/03/2026', toDate: '17/03/2026', page: 1, pageSize: 1 },
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://iboard.ssi.com.vn/',
                'device-id': '530C8E53-D902-46B4-9ACC-406F881AFBDD'
            }
        });

        console.log("Keys found:", Object.keys(response.data.data[0]));
        console.log("Values:", response.data.data[0]);
    } catch (e) {
        console.error(e.message);
    }
}

checkAllFields();
