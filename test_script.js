fetch("https://finfo-api.vndirect.com.vn/v4/ratios/latest?filter=itemCode:51003,51004,51007&q=code:FPT").then(r => r.json()).then(console.log);
