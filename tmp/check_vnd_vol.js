const axios = require('axios');

async function testVND() {
    try {
        console.log("Fetching multiple stocks from VNDirect...");
        // This is the quote API
        const res = await axios.get('https://finfo-api.vndirect.com.vn/v4/stock_prices?q=code:VIB,FPT,SSI,HPG~date:gte:2026-03-01', {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (res.data && res.data.data) {
            console.log(JSON.stringify(res.data.data[0], null, 2));
        } else {
            console.log("No data");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testVND();
