# Vietnam Stock Investment Analyzer

🚀 Ứng dụng phân tích đầu tư cổ phiếu Việt Nam với tính năng tái đầu tư cổ tức tự động.

![Stock Analyzer](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-green?style=flat-square&logo=supabase)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)

## ✨ Tính năng

- 📈 **Phân tích lợi nhuận đầu tư**: Tính toán lợi nhuận khi đầu tư vào một cổ phiếu từ thời điểm bất kỳ
- 💰 **Tái đầu tư cổ tức**: Tự động tính toán việc mua thêm cổ phiếu từ cổ tức tiền mặt
- 🎁 **Cổ tức cổ phiếu**: Tự động cộng thêm cổ phiếu thưởng
- 📊 **Charts đẹp**: Biểu đồ giá, lợi nhuận theo năm, phân tích theo tháng
- ⏰ **Phân tích thời điểm tối ưu**: Xác định ngày/tháng/quý tốt nhất để mua
- 🔐 **Xác thực người dùng**: Đăng nhập bằng email hoặc Google
- 💾 **Lưu lịch sử**: Lưu và xem lại các phân tích trước đó
- 🔄 **Tự động cập nhật**: Dữ liệu được cập nhật hàng ngày qua Vercel Cron

## 🛠️ Công nghệ

- **Next.js 15** - React framework với App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling với thiết kế premium
- **Recharts** - Charts đẹp và responsive
- **Supabase** - Database, Auth, và Storage
- **Vercel** - Hosting và Cron Jobs

## 📦 Cài đặt

### 1. Clone repository

```bash
git clone https://github.com/your-username/stock-analyzer.git
cd stock-analyzer
```

### 2. Cài đặt dependencies

```bash
npm install
```

### 3. Cấu hình Supabase

1. Tạo project mới tại [Supabase](https://supabase.com)
2. Chạy script SQL trong `supabase/schema.sql` để tạo tables
3. Bật Authentication và cấu hình providers (Email, Google)
4. Copy URL và Keys vào file `.env.local`

```bash
cp .env.example .env.local
```

Điền các giá trị:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=random-string-for-cron-security
```

### 4. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## 🚀 Deploy lên Vercel

### Cách 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Cách 2: GitHub Integration

1. Push code lên GitHub
2. Vào [Vercel Dashboard](https://vercel.com/dashboard)
3. Import repository từ GitHub
4. Thêm Environment Variables
5. Deploy!

### Cấu hình Cron Jobs

Vercel sẽ tự động đọc `vercel.json` và chạy cron job hàng ngày lúc 18:00 (GMT+7) để sync dữ liệu.

## 📁 Cấu trúc project

```
stock-analyzer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── stock/         # APIs lấy dữ liệu cổ phiếu
│   │   │   └── sync/          # API sync dữ liệu tự động
│   │   ├── auth/              # Auth callback
│   │   ├── history/           # Trang lịch sử
│   │   ├── page.tsx           # Trang chủ
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   ├── contexts/              # React contexts (Auth)
│   └── lib/                   # Utils và API helpers
├── supabase/
│   └── schema.sql             # Database schema
├── vercel.json                # Vercel config với cron
└── README.md
```

## 🔧 Nguồn dữ liệu

- **VNDirect API**: Dữ liệu giá lịch sử
- **CafeF**: Dữ liệu cổ tức và điều chỉnh giá

## 📊 Cách tính lợi nhuận

1. **Mua ban đầu**: Mua tối đa số cổ phiếu có thể với số tiền đầu tư
2. **Cổ tức tiền mặt**: Tự động mua thêm cổ phiếu tại giá ngày GDKHQ
3. **Cổ tức cổ phiếu**: Thêm trực tiếp vào số lượng nắm giữ
4. **Giá sử dụng**: Giá đóng cửa điều chỉnh (adjusted close)
5. **CAGR**: Compound Annual Growth Rate = (Giá trị cuối / Giá trị đầu)^(1/số năm) - 1

## ⚠️ Lưu ý

- Dữ liệu chỉ mang tính chất tham khảo
- **Không phải lời khuyên đầu tư**
- Kết quả trong quá khứ không đảm bảo lợi nhuận tương lai
- Chưa tính phí giao dịch và thuế

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

---

Made with ❤️ for Vietnamese investors
