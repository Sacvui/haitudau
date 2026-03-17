/**
 * Professional Stock Valuation Engine
 * 4 methods: DDM Gordon Growth, P/E Relative, Graham Number, Simplified DCF
 */

// ===================== TYPES =====================

export interface ValuationInput {
    currentPrice: number;
    eps: number;
    pe: number;               // current P/E ratio
    bvps: number;
    pb: number;               // current P/B ratio
    roe: number;              // as percentage (e.g., 20 = 20%)
    lastDividend: number;     // annual dividend per share
    dividendGrowth: number;   // historical dividend growth rate (%)
    industryPE: number;
    dividendYield: number;    // as percentage
    industry?: string;        // E.g., 'Ngân hàng', 'Công nghệ', 'Bán lẻ'
}

export interface ValuationResult {
    method: string;
    methodKey: 'ddm' | 'pe' | 'graham' | 'dcf';
    intrinsicValue: number;
    marginOfSafety: number;   // percentage: positive = undervalued
    verdict: 'CHEAP' | 'FAIR' | 'EXPENSIVE' | 'N/A';
    confidence: number;       // 0-100, how reliable this method is for this stock
    formula: string;
    inputs: Record<string, string>;
    notes: string;
}

export interface ValuationSummary {
    averageIntrinsic: number;
    currentPrice: number;
    overallMargin: number;
    overallVerdict: 'CHEAP' | 'FAIR' | 'EXPENSIVE';
    results: ValuationResult[];
    marketSentimentScore?: number;
    convictionScore: number;    // 0-100%
    convergenceGrade: string;   // S, A, B, C, D
    sectorCalibration?: string; // Info about sector-specific adjustments
}

export const SECTOR_MAP: Record<string, string> = {
    'ACB': 'Ngân hàng', 'BID': 'Ngân hàng', 'CTG': 'Ngân hàng', 'HDB': 'Ngân hàng',
    'MBB': 'Ngân hàng', 'SHB': 'Ngân hàng', 'SSB': 'Ngân hàng', 'STB': 'Ngân hàng',
    'TCB': 'Ngân hàng', 'TPB': 'Ngân hàng', 'VCB': 'Ngân hàng', 'VIB': 'Ngân hàng',
    'VPB': 'Ngân hàng', 'BVH': 'Bảo hiểm', 'SSI': 'Chứng khoán',
    'FPT': 'Công nghệ', 'MWG': 'Bán lẻ', 'PNJ': 'Bán lẻ',
    'GAS': 'Dầu khí', 'PLX': 'Dầu khí', 'POW': 'Điện',
    'HPG': 'Thép', 'MSN': 'Tiêu dùng', 'SAB': 'Tiêu dùng', 'VNM': 'Tiêu dùng',
    'BCM': 'Bất động sản', 'GVR': 'Cao su', 'VHM': 'Bất động sản',
    'VIC': 'Bất động sản', 'VRE': 'Bất động sản', 'VJC': 'Hàng không', 'DGC': 'Hóa chất',
    'FRT': 'Bán lẻ', 'CTR': 'Viễn thông', 'VGI': 'Công nghệ'
};

export const VN30_BASE_RATIOS: Record<string, { pe: number, pb: number, roe: number, name?: string }> = {
    'VIB': { pe: 6, pb: 1.2, roe: 18, name: 'VIBBank' },
    'TCB': { pe: 6.5, pb: 1.1, roe: 16, name: 'Techcombank' },
    'MBB': { pe: 5.5, pb: 1.1, roe: 20, name: 'MBBank' },
    'ACB': { pe: 6.5, pb: 1.4, roe: 22, name: 'Ngân hàng Á Châu' },
    'CTG': { pe: 7.5, pb: 1.2, roe: 15, name: 'VietinBank' },
    'BID': { pe: 10, pb: 1.8, roe: 16, name: 'BIDV' },
    'VCB': { pe: 14, pb: 2.8, roe: 20, name: 'Vietcombank' },
    'FPT': { pe: 24, pb: 6.0, roe: 28, name: 'FPT Corp' }, // Updated for high valuation
    'HPG': { pe: 14, pb: 1.6, roe: 12, name: 'Hòa Phát' },
    'MWG': { pe: 25, pb: 2.5, roe: 10, name: 'Thế giới Di động' },
    'VNM': { pe: 16, pb: 4.5, roe: 28, name: 'Vinamilk' },
    'SSI': { pe: 18, pb: 1.8, roe: 10, name: 'Chứng khoán SSI' },
    'VND': { pe: 15, pb: 1.4, roe: 9, name: 'Chứng khoán VNDIRECT' },
    'VHM': { pe: 5.5, pb: 0.8, roe: 15, name: 'Vinhomes' },
    'VIC': { pe: 30, pb: 1.5, roe: 5, name: 'Vingroup' },
    'VRE': { pe: 12, pb: 1.2, roe: 10, name: 'Vincom Retail' },
    'GAS': { pe: 16, pb: 2.5, roe: 16, name: 'PV GAS' },
    'MSN': { pe: 20, pb: 3.5, roe: 18, name: 'Masan Group' },
    'DGC': { pe: 12, pb: 3.0, roe: 35, name: 'Hóa chất Đức Giang' },
    'VCI': { pe: 18, pb: 1.9, roe: 12, name: 'Chứng khoán Vietcap' },
    'FRT': { pe: 45, pb: 5.0, roe: 8, name: 'Bán lẻ FPT (Long Châu)' }
};

// ===================== CORE METHODS =====================

/**
 * DDM - Gordon Growth Model
 */
export function gordonGrowthModel(
    lastDividend: number,
    growthRate: number,
    requiredReturn: number
): number {
    if (lastDividend <= 0 || requiredReturn <= growthRate || requiredReturn <= 0) {
        return 0;
    }
    const d1 = lastDividend * (1 + growthRate);
    return d1 / (requiredReturn - growthRate);
}

/**
 * P/E Relative Valuation
 */
export function peRelativeValuation(eps: number, targetPE: number): number {
    if (eps <= 0 || targetPE <= 0) return 0;
    return eps * targetPE;
}

/**
 * Graham Number
 */
export function grahamNumber(eps: number, bvps: number, isBank: boolean = false): number {
    if (eps <= 0 || bvps <= 0) return 0;
    const multiplier = isBank ? 15.0 : 22.5;
    return Math.sqrt(multiplier * eps * bvps);
}

/**
 * Simplified DCF
 */
export function simplifiedDCF(
    eps: number,
    initialGrowthRate: number,
    discountRate: number,
    projectionYears: number = 10,
    terminalGrowthRate: number = 0.03
): number {
    if (eps <= 0 || discountRate <= terminalGrowthRate || discountRate <= 0) return 0;

    let totalPV = 0;
    let projectedEPS = eps;
    const annualDecay = (initialGrowthRate - terminalGrowthRate) / projectionYears;

    for (let year = 1; year <= projectionYears; year++) {
        const currentYearGrowth = Math.max(terminalGrowthRate, initialGrowthRate - (annualDecay * year));
        projectedEPS *= (1 + currentYearGrowth);
        totalPV += projectedEPS / Math.pow(1 + discountRate, year);
    }

    const terminalValue = (projectedEPS * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
    totalPV += terminalValue / Math.pow(1 + discountRate, projectionYears);

    return totalPV;
}

/**
 * Reverse DCF
 */
export function calculateReverseDCF(
    currentPrice: number,
    eps: number,
    discountRate: number,
    projectionYears: number = 10,
    terminalGrowthRate: number = 0.03
): number | null {
    if (eps <= 0 || currentPrice <= 0 || discountRate <= terminalGrowthRate) return null;

    let g_low = -0.99;
    let g_high = 2.0;
    let g_mid = 0;
    const tolerance = 0.0001;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
        g_mid = (g_low + g_high) / 2;
        const pv = simplifiedDCF(eps, g_mid, discountRate, projectionYears, terminalGrowthRate);
        if (Math.abs(pv - currentPrice) < tolerance * currentPrice) return g_mid;
        if (pv < currentPrice) g_low = g_mid;
        else g_high = g_mid;
    }
    return g_mid;
}

// ===================== MARGIN OF SAFETY =====================

export function calculateMarginOfSafety(
    intrinsicValue: number,
    currentPrice: number,
    sentimentScore: number = 50
): { margin: number; verdict: 'CHEAP' | 'FAIR' | 'EXPENSIVE' | 'N/A' } {
    if (intrinsicValue <= 0 || currentPrice <= 0) return { margin: 0, verdict: 'N/A' };

    const margin = ((intrinsicValue - currentPrice) / intrinsicValue) * 100;
    let cheapThreshold = 25;
    let fairThreshold = -10;

    if (sentimentScore >= 75) {
        cheapThreshold = 35;
        fairThreshold = 0;
    } else if (sentimentScore <= 25) {
        cheapThreshold = 15;
        fairThreshold = -25;
    }

    let verdict: 'CHEAP' | 'FAIR' | 'EXPENSIVE';
    if (margin >= cheapThreshold) verdict = 'CHEAP';
    else if (margin >= fairThreshold) verdict = 'FAIR';
    else verdict = 'EXPENSIVE';

    return { margin, verdict };
}

// ===================== SENSITIVITY TABLE =====================

export function generateSensitivityTable(
    eps: number,
    baseGrowthRate: number,
    baseDiscountRate: number,
    projectionYears: number = 10
): { growthRates: number[]; discountRates: number[]; values: number[][] } {
    const growthRates = [
        baseGrowthRate - 0.04, baseGrowthRate - 0.02, baseGrowthRate, baseGrowthRate + 0.02, baseGrowthRate + 0.04
    ].map(r => Math.max(0, Math.min(r, 0.30)));

    const discountRates = [
        baseDiscountRate - 0.02, baseDiscountRate - 0.01, baseDiscountRate, baseDiscountRate + 0.01, baseDiscountRate + 0.02
    ].map(r => Math.max(0.05, Math.min(r, 0.25)));

    const values = discountRates.map(dr =>
        growthRates.map(gr => simplifiedDCF(eps, gr, dr, projectionYears))
    );

    return { growthRates, discountRates, values };
}

// ===================== FULL VALUATION =====================

export function runFullValuation(
    input: ValuationInput,
    customParams?: {
        requiredReturn?: number;
        epsGrowthRate?: number;
        projectionYears?: number;
        marketSentimentScore?: number;
    }
): ValuationSummary {
    const sentimentScore = customParams?.marketSentimentScore ?? 50;
    const isBank = input.industry === 'Ngân hàng' || input.bvps > input.eps * 6;
    const isGrowth = input.industry === 'Công nghệ' || (input.pe > 15 && input.roe > 15);
    
    let sectorCalibration = `Hệ máy tự động hiệu chuẩn cho nhóm ${input.industry || 'Chung'}.`;
    if (isBank) sectorCalibration = "⚠️ Hiệu chuẩn NH: Chặn trần Graham & DCF bảo thủ, ưu tiên Giá trị Sổ sách và Cổ tức.";
    if (isGrowth) sectorCalibration = "🚀 Hiệu chuẩn Tech: Ưu tiên Tăng trưởng kép & DCF, hạ trọng số Ben Graham.";

    let baseReturn = (customParams?.requiredReturn || 12) / 100;
    if (isBank) baseReturn = 0.11;
    if (isGrowth) baseReturn = 0.13;

    const requiredReturn = baseReturn;
    const growthCap = isGrowth ? 25 : 18;
    const growthRetention = isBank ? 0.4 : 0.6;
    const calculatedGrowth = input.roe ? Math.min(input.roe * growthRetention, growthCap) : 10;
    const epsGrowth = (customParams?.epsGrowthRate ?? calculatedGrowth) / 100;
    const projYears = customParams?.projectionYears || 10;
    const divGrowth = Math.max(0, Math.min(input.dividendGrowth / 100, requiredReturn - 0.01));

    const results: ValuationResult[] = [];

    // 1. DDM
    const ddmValue = gordonGrowthModel(input.lastDividend, divGrowth, requiredReturn);
    const ddmMos = calculateMarginOfSafety(ddmValue, input.currentPrice, sentimentScore);
    results.push({
        method: 'DDM - Gordon Growth',
        methodKey: 'ddm',
        intrinsicValue: ddmValue,
        marginOfSafety: ddmMos.margin,
        verdict: ddmMos.verdict,
        confidence: isBank ? 85 : (input.lastDividend > 0 ? 75 : 15),
        formula: 'P₀ = D₁ / (r - g)',
        inputs: {
            'D₀ (Cổ tức/CP)': `${input.lastDividend.toLocaleString()} đ`,
            'g (Tăng trưởng CT)': `${(divGrowth * 100).toFixed(1)}%`,
            'r (Lãi suất yêu cầu)': `${(requiredReturn * 100).toFixed(1)}%`,
        },
        notes: input.lastDividend <= 0 ? 'Không áp dụng: Cổ phiếu không trả cổ tức' : 'Phù hợp nhất cho nhóm Ngân hàng và các mã Bluechip.',
    });

    // 2. P/E Relative
    const peValue = peRelativeValuation(input.eps, input.industryPE);
    const peMos = calculateMarginOfSafety(peValue, input.currentPrice, sentimentScore);
    results.push({
        method: 'P/E Tương Đối',
        methodKey: 'pe',
        intrinsicValue: peValue,
        marginOfSafety: peMos.margin,
        verdict: peMos.verdict,
        confidence: input.eps > 0 && input.industryPE > 0 ? 65 : 15,
        formula: 'Fair Value = EPS × P/E ngành',
        inputs: {
            'EPS': `${input.eps.toLocaleString()} đ`,
            'P/E ngành': `${input.industryPE.toFixed(1)}x`,
        },
        notes: 'Chỉ số tham chiếu nhanh từ thị trường.',
    });

    // 3. Graham Number
    const grahamValue = grahamNumber(input.eps, input.bvps, isBank);
    const grahamMos = calculateMarginOfSafety(grahamValue, input.currentPrice, sentimentScore);
    results.push({
        method: 'Số Graham',
        methodKey: 'graham',
        intrinsicValue: grahamValue,
        marginOfSafety: grahamMos.margin,
        verdict: grahamMos.verdict,
        confidence: isBank ? 80 : (isGrowth ? 20 : 65),
        formula: isBank ? '√(15.0 × EPS × BVPS)' : '√(22.5 × EPS × BVPS)',
        inputs: {
            'EPS': `${input.eps.toLocaleString()} đ`,
            'BVPS': `${input.bvps.toLocaleString()} đ`,
        },
        notes: isGrowth ? 'Ít tin cậy với hàng tăng trưởng.' : 'Mô hình bảo vệ vốn tuyệt vời.',
    });

    // 4. Simplified DCF
    const dcfValue = simplifiedDCF(input.eps, epsGrowth, requiredReturn, projYears);
    const dcfMos = calculateMarginOfSafety(dcfValue, input.currentPrice, sentimentScore);
    results.push({
        method: 'Dòng tiền DCF',
        methodKey: 'dcf',
        intrinsicValue: dcfValue,
        marginOfSafety: dcfMos.margin,
        verdict: dcfMos.verdict,
        confidence: isGrowth ? 90 : (isBank ? 50 : 60),
        formula: 'PV(Tương lai) + Terminal Value',
        inputs: {
            'EPS hiện tại': `${input.eps.toLocaleString()} đ`,
            'Tăng trưởng dự phóng': `${(epsGrowth * 100).toFixed(1)}%`,
        },
        notes: 'Phương pháp định giá dòng tiền kỳ vọng.',
    });

    const validResults = results.filter(r => r.intrinsicValue > 0 && r.confidence >= 20);
    const adjustedResults = validResults.map(r => {
        let adjConfidence = r.confidence;
        if (r.intrinsicValue > input.currentPrice * 1.8) adjConfidence *= 0.4;
        return { ...r, adjConfidence };
    });

    const totalWeight = adjustedResults.reduce((sum, r) => sum + r.adjConfidence, 0);
    const weightedAvg = totalWeight > 0 ? adjustedResults.reduce((sum, r) => sum + r.intrinsicValue * r.adjConfidence, 0) / totalWeight : 0;
    const overallMos = calculateMarginOfSafety(weightedAvg, input.currentPrice, sentimentScore);

    let grade = 'C';
    if (adjustedResults.length >= 2) {
        const values = adjustedResults.map(r => r.intrinsicValue);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const cv = (Math.sqrt(values.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / values.length)) / avg;
        if (cv < 0.15) grade = 'S';
        else if (cv < 0.25) grade = 'A';
        else if (cv < 0.4) grade = 'B';
    }

    return {
        averageIntrinsic: Math.round(weightedAvg),
        currentPrice: input.currentPrice,
        overallMargin: Math.round(overallMos.margin * 10) / 10,
        overallVerdict: overallMos.verdict === 'N/A' || overallMos.verdict === 'FAIR' ? 'FAIR' : overallMos.verdict,
        results,
        marketSentimentScore: sentimentScore,
        convictionScore: Math.min(100, (grade === 'S' ? 95 : grade === 'A' ? 85 : 70) + (isBank || isGrowth ? 10 : 0)),
        convergenceGrade: grade,
        sectorCalibration
    };
}

export function runSimpleValuation(
    symbol: string, currentPrice: number, eps: number, roe: number, bvps: number, industryPE: number = 15, lastDividend: number = 0
): ValuationSummary {
    return runFullValuation({
        currentPrice, eps, roe, bvps, pe: eps > 0 ? currentPrice / eps : 15, pb: bvps > 0 ? currentPrice / bvps : 1.5,
        lastDividend, dividendGrowth: roe * 0.4, industryPE, dividendYield: lastDividend > 0 ? (lastDividend / currentPrice) * 100 : 0,
        industry: SECTOR_MAP[symbol] || 'Khác'
    }, { requiredReturn: 12, projectionYears: 10, marketSentimentScore: 50 });
}
