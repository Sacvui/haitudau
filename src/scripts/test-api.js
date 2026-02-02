
const axios = require('axios');

async function testTCBS() {
    try {
        // 1. Lấy thông tin cơ bản & chỉ số định giá hiện tại
        console.log("Fetching General Rating...");
        const resRating = await axios.get('https://apipubaws.tcbs.com.vn/tcanalysis/v1/rating/FPT/general?fType=TICKER');
        console.log("Rating Data:", JSON.stringify(resRating.data, null, 2));

        // 2. Lấy lịch sử chỉ số tài chính (PE, PB) - Hy vọng có
        // TCBS thường có endpoint finance-ratio
        console.log("\nFetching Financial Ratios...");
        const resRatio = await axios.get('https://apipubaws.tcbs.com.vn/tcanalysis/v1/finance/FPT/financial-ratio?yearly=0&isAll=true');
        // yearly=0 => Quarterly
        console.log("Ratio Data Sample:", JSON.stringify(resRatio.data.slice(0, 2), null, 2));

    } catch (e) {
        console.error("Error:", e.message);
    }
}

testTCBS();
