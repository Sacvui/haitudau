const axios = require('axios');

async function testSSI() {
    try {
        const res = await axios.get('https://iboard.ssi.com.vn/api/scoreboard/stock-realtime?stockSymbol=FPT', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
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

testSSI();
