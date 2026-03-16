async function createProdUser() {
    console.log("1. Đăng nhập Admin...");
    let res = await fetch('https://dautu.ncskit.org/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: 'HaiLP', password: 'DautuTudau' })
    });

    let data = await res.json();
    if (!data.success) {
        console.error("Đăng nhập Admin thất bại:", data);
        return;
    }

    // Get cookies
    let cookies = res.headers.get('set-cookie');
    if (!cookies) {
        console.error("Không lấy được Cookie session");
        return;
    }

    console.log("2. Tạo tài khoản phatht...");
    res = await fetch('https://dautu.ncskit.org/api/auth/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookies
        },
        body: JSON.stringify({
            username: 'phatht',
            password: 'Admin@123',
            displayName: 'Phat HT',
            permissions: { vn100: true, top20: true }
        })
    });

    data = await res.json();
    if (data.success) {
        console.log("✅ Đã tạo tài khoản phatht thành công trên Production!");
    } else {
        console.error("❌ Lỗi tạo tài khoản:", data.error);
    }
}

createProdUser();
