const axios = require('axios');

async function testVIBTrades() {
    const symbol = 'VIB';
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
    const startDate = `${thirtyDaysAgo.getFullYear()}-${(thirtyDaysAgo.getMonth() + 1).toString().padStart(2, '0')}-${thirtyDaysAgo.getDate().toString().padStart(2, '0')}`;

    console.log(`Testing VNDirect for ${symbol} starting from ${startDate}...`);
    try {
        const response = await axios.get('https://finfo-api.vndirect.com.vn/v4/foreign_trades', {
            params: {
                sort: 'date',
                q: `code:${symbol}~date:gte:${startDate}`,
                size: 50,
                page: 1,
            },
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        console.log('VNDirect Status:', response.status);
        console.log('VNDirect Data count:', response.data?.data?.length || 0);
        if (response.data?.data?.length > 0) {
            console.log('First trade:', response.data.data[0]);
        }
    } catch (e) {
        console.error('VNDirect Failed:', e.message);
    }

    console.log('\nTesting SSI for ${symbol}...');
    try {
        const ssiRes = await axios.get(`https://iboard.ssi.com.vn/api/scoreboard/stock-foreign-history?stockSymbol=${symbol}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        console.log('SSI Status:', ssiRes.status);
        console.log('SSI Data count:', ssiRes.data?.data?.length || 0);
        if (ssiRes.data?.data?.length > 0) {
            console.log('First SSI trade:', ssiRes.data.data[0]);
        }
    } catch (e) {
        console.error('SSI Failed:', e.message);
    }
}

testVIBTrades();
