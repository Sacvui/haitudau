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
    convictionScore: number;    // 0-100
    convergenceGrade: 'S' | 'A' | 'B' | 'C';
    sectorCalibration?: string;
    relativeTarget: number;    // Short/Mid-term target price blend (P/B, P/E, PEG)
}

export const SECTOR_MAP: Record<string, string> = {
    'ACB': 'Ngân hàng', 'BID': 'Ngân hàng', 'CTG': 'Ngân hàng', 'HDB': 'Ngân hàng',
    'MBB': 'Ngân hàng', 'SHB': 'Ngân hàng', 'SSB': 'Ngân hàng', 'STB': 'Ngân hàng',
    'TCB': 'Ngân hàng', 'TPB': 'Ngân hàng', 'VCB': 'Ngân hàng', 'VIB': 'Ngân hàng',
    'VPB': 'Ngân hàng', 'BVH': 'Bảo hiểm', 'SSI': 'Chứng khoán', 'VND': 'Chứng khoán', 'VCI': 'Chứng khoán',
    'FPT': 'Công nghệ', 'MWG': 'Bán lẻ', 'PNJ': 'Bán lẻ', 'FRT': 'Bán lẻ', 'DGW': 'Bán lẻ',
    'GAS': 'Dầu khí', 'PLX': 'Dầu khí', 'POW': 'Điện', 'REE': 'Điện', 'PC1': 'Điện',
    'HPG': 'Thép', 'HSG': 'Thép', 'NKG': 'Thép',
    'MSN': 'Tiêu dùng', 'SAB': 'Tiêu dùng', 'VNM': 'Tiêu dùng', 'KDC': 'Tiêu dùng',
    'BCM': 'Bất động sản', 'GVR': 'Cao su', 'VHM': 'Bất động sản', 'DXG': 'Bất động sản', 'PDR': 'Bất động sản', 'NLG': 'Bất động sản',
    'VIC': 'Bất động sản', 'VRE': 'Bất động sản', 'VJC': 'Hàng không', 'HVN': 'Hàng không', 'DGC': 'Hóa chất',
    'CTR': 'Viễn thông', 'VGI': 'Công nghệ', 'DBC': 'Nông nghiệp', 'MSB': 'Ngân hàng', 'LPB': 'Ngân hàng', 'EIB': 'Ngân hàng',
    'OCB': 'Ngân hàng', 'TCH': 'Bất động sản'
};

export const COMPANY_NAME_MAP: Record<string, string> = {
    'ACB': 'Ngân hàng Á Châu', 'BCM': 'Bình Dương (Becamex)', 'BID': 'BIDV', 'BVH': 'Bảo hiểm Bảo Việt',
    'CTG': 'VietinBank', 'FPT': 'FPT Corp', 'GAS': 'PV GAS', 'GVR': 'Cao su Việt Nam',
    'HDB': 'HDBank', 'HPG': 'Hòa Phát', 'MBB': 'MBBank', 'MSN': 'Masan Group',
    'MWG': 'Thế giới Di động', 'PLX': 'Petrolimex', 'POW': 'PV Power', 'SAB': 'Sabeco',
    'SHB': 'SHB', 'SSB': 'SeABank', 'SSI': 'Chứng khoán SSI', 'STB': 'Sacombank',
    'TCB': 'Techcombank', 'TPB': 'TPBank', 'VCB': 'Vietcombank', 'VHM': 'Vinhomes',
    'VIB': 'VIBBank', 'VIC': 'Vingroup', 'VJC': 'Vietjet Air', 'VNM': 'Vinamilk',
    'VPB': 'VPBank', 'VRE': 'Vincom Retail', 'DGC': 'Hóa chất Đức Giang', 'VCI': 'Chứng khoán Vietcap',
    'VND': 'Chứng khoán VNDIRECT', 'FRT': 'Bán lẻ FPT (Long Châu)'
};

export const getSector = (symbol: string): string => SECTOR_MAP[symbol] || 'Khác';
export const getCompanyName = (symbol: string): string => COMPANY_NAME_MAP[symbol] || symbol;

export const VN30_BASE_RATIOS: Record<string, { pe: number, pb: number, roe: number, name?: string, eps?: number, bvps?: number }> = {
    'VIB': { pe: 6.5, pb: 1.3, roe: 18, name: 'VIBBank', eps: 2900, bvps: 15500 },
    'TCB': { pe: 7.5, pb: 1.2, roe: 16, name: 'Techcombank', eps: 3500, bvps: 22000 },
    'MBB': { pe: 6.5, pb: 1.2, roe: 20, name: 'MBBank', eps: 3800, bvps: 18000 },
    'ACB': { pe: 7.0, pb: 1.5, roe: 22, name: 'Ngân hàng Á Châu', eps: 3800, bvps: 17600 },
    'CTG': { pe: 8.5, pb: 1.4, roe: 15, name: 'VietinBank', eps: 4200, bvps: 28000 },
    'BID': { pe: 12, pb: 2.0, roe: 16, name: 'BIDV', eps: 4500, bvps: 32000 },
    'VCB': { pe: 16, pb: 3.0, roe: 20, name: 'Vietcombank', eps: 5500, bvps: 35000 },
    'STB': { pe: 9.0, pb: 1.2, roe: 18, name: 'Sacombank', eps: 2500, bvps: 16000 },
    'TPB': { pe: 8.0, pb: 1.2, roe: 15, name: 'TPBank', eps: 2000, bvps: 15000 },
    'VPB': { pe: 9.5, pb: 1.1, roe: 13, name: 'VPBank', eps: 1500, bvps: 18000 },
    'HDB': { pe: 7.5, pb: 1.4, roe: 23, name: 'HDBank', eps: 3200, bvps: 18000 },
    'LPB': { pe: 10, pb: 1.8, roe: 20, name: 'LPBank', eps: 3000, bvps: 18000 },
    'FPT': { pe: 26, pb: 6.5, roe: 28, name: 'FPT Corp', eps: 5800, bvps: 22000 },
    'HPG': { pe: 15, pb: 1.8, roe: 12, name: 'Hòa Phát', eps: 1800, bvps: 16000 },
    'MWG': { pe: 25, pb: 2.8, roe: 12, name: 'Thế giới Di động', eps: 2500, bvps: 20000 },
    'VNM': { pe: 17, pb: 4.8, roe: 28, name: 'Vinamilk', eps: 4200, bvps: 16000 },
    'SSI': { pe: 20, pb: 2.0, roe: 12, name: 'Chứng khoán SSI', eps: 1500, bvps: 18000 },
    'VHM': { pe: 6.5, pb: 1.0, roe: 15, name: 'Vinhomes', eps: 6500, bvps: 45000 },
    'VIC': { pe: 30, pb: 1.8, roe: 5, name: 'Vingroup', eps: 2000, bvps: 35000 },
    'VRE': { pe: 13, pb: 1.4, roe: 12, name: 'Vincom Retail', eps: 1800, bvps: 18000 },
    'GAS': { pe: 17, pb: 2.8, roe: 16, name: 'PV GAS' },
    'MSN': { pe: 22, pb: 3.8, roe: 18, name: 'Masan Group' },
    'DGC': { pe: 13, pb: 3.5, roe: 35, name: 'Hóa chất Đức Giang' },
    'VCI': { pe: 20, pb: 2.2, roe: 13, name: 'Chứng khoán Vietcap' },
    'FRT': { pe: 50, pb: 6.0, roe: 10, name: 'Bán lẻ FPT (Long Châu)' },
    'BVH': { pe: 13, pb: 1.2, roe: 10, name: 'Bảo Việt' },
    'PLX': { pe: 15, pb: 1.8, roe: 14, name: 'Petrolimex' },
    'POW': { pe: 16, pb: 0.9, roe: 6, name: 'PV Power' },
    'SAB': { pe: 19, pb: 3.5, roe: 18, name: 'Sabeco' },
    'GVR': { pe: 28, pb: 3.0, roe: 12, name: 'Tập đoàn Cao su' },
    'BCM': { pe: 28, pb: 4.0, roe: 15, name: 'Becamex IDC' },
    'VJC': { pe: 22, pb: 3.5, roe: 12, name: 'Vietjet Air' }
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

    // Unified Margin Logic: (Intrinsic - Price) / Price = Upside Potential (%)
    const margin = currentPrice > 0 ? ((intrinsicValue - currentPrice) / currentPrice) * 100 : 0;
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
    
    // Sector Flags
    const isBank = input.industry === 'Ngân hàng' || input.bvps > input.eps * 6;
    const isTech = input.industry === 'Công nghệ';
    const isRE = input.industry === 'Bất động sản';
    const isGrowth = isTech || input.industry === 'Bán lẻ' || (input.roe > 20 && input.pe > 20);

    // Dynamic Parameters
    let baseReturn = (customParams?.requiredReturn ?? 12) / 100;
    let growthCap = isGrowth ? 25 : 18;
    let growthRetention = isBank ? 0.4 : 0.6;
    let sectorCalibration = isBank ? '🏦 Bank Mode (P/B Focus)' : isTech ? '🚀 Tech Growth Mode' : isRE ? '🏗️ Real Estate (Asset Focus)' : '📊 Standard Mode';

    // Sector-specific adjustments
    if (isBank) {
        baseReturn = 0.11; // Banks usually have lower cost of equity in VN
        growthCap = 15;
    } else if (isTech) {
        baseReturn = 0.13; // High risk, high reward
        growthCap = 30;
    } else if (isRE) {
        baseReturn = 0.14; // High risk sector
        growthCap = 12;
    }

    const requiredReturn = baseReturn;
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

    let grade: 'S' | 'A' | 'B' | 'C' = 'C';
    if (adjustedResults.length >= 2) {
        const values = adjustedResults.map(r => r.intrinsicValue);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const cv = (Math.sqrt(values.map(v => Math.pow(v - avg, 2)).reduce((a, b) => a + b, 0) / values.length)) / avg;
        if (cv < 0.15) grade = 'S';
        else if (cv < 0.25) grade = 'A';
        else if (cv < 0.4) grade = 'B';
    }

    const relativeTarget = calculateRelativeTarget(input);

    return {
        averageIntrinsic: Math.round(weightedAvg),
        currentPrice: input.currentPrice,
        overallMargin: Math.round(overallMos.margin * 10) / 10,
        overallVerdict: overallMos.verdict === 'N/A' || overallMos.verdict === 'FAIR' ? 'FAIR' : overallMos.verdict,
        results,
        marketSentimentScore: sentimentScore,
        convictionScore: Math.min(100, (grade === 'S' ? 95 : grade === 'A' ? 85 : 70) + (isBank || isGrowth ? 10 : 0)),
        convergenceGrade: grade,
        sectorCalibration,
        relativeTarget
    };
}

/**
 * Calculates a relative valuation blend targeting short/mid term (3-12 months)
 */
export function calculateRelativeTarget(input: ValuationInput): number {
    const isBank = input.industry === 'Ngân hàng' || input.industry?.includes('Bank');
    const roe = input.roe;
    const eps = input.eps;
    const bvps = input.bvps;
    
    const industryPE = input.industryPE || 15;

    // Method 1: P/B Blend
    let fairPB = Math.max(1.2, roe / 10);
    if (isBank) fairPB = Math.min(1.8, fairPB); 
    const targetPB = bvps * fairPB;

    // Method 2: P/E Blend
    let targetPE_ratio = Math.max(8, Math.min(industryPE * 1.5, (industryPE + 15) / 2));
    if (isBank) targetPE_ratio = Math.min(11, targetPE_ratio);
    const targetPE = eps * targetPE_ratio;

    // Method 3: PEG Blend (Estimated Growth from ROE)
    const growth = Math.min(25, roe * 0.8);
    const targetPEG = eps * growth * 1.0; // Fair PEG is 1.0

    // Sector Weighting
    let wPB = 0.33, wPE = 0.33, wPEG = 0.34;
    if (isBank) {
        wPB = 0.60; wPE = 0.30; wPEG = 0.10;
    } else if (industryPE > 20 || roe > 25) {
        wPB = 0.10; wPE = 0.45; wPEG = 0.45;
    }

    return (targetPB * wPB) + (targetPE * wPE) + (targetPEG * wPEG);
}

/**
 * Unifies valuation logic for APIs that may not have full fundamental data
 */
export function runUnifiedValuation(
    symbol: string,
    currentPrice: number,
    fundamentalInput?: Partial<ValuationInput>
): ValuationSummary {
    const symbolSector = getSector(symbol);
    const base = VN30_BASE_RATIOS[symbol] || { pe: 12, pb: 1.5, roe: 15 };

    // Fill in missing values using baseline ratios
    const input: ValuationInput = {
        currentPrice: currentPrice,
        eps: fundamentalInput?.eps ?? base.eps ?? (currentPrice / base.pe),
        pe: fundamentalInput?.pe ?? base.pe,
        bvps: fundamentalInput?.bvps ?? base.bvps ?? (currentPrice / base.pb),
        pb: fundamentalInput?.pb ?? base.pb,
        roe: fundamentalInput?.roe ?? base.roe,
        lastDividend: fundamentalInput?.lastDividend ?? 0,
        dividendGrowth: fundamentalInput?.dividendGrowth ?? 0,
        industryPE: fundamentalInput?.industryPE ?? base.pe,
        dividendYield: fundamentalInput?.dividendYield ?? 0,
        industry: fundamentalInput?.industry ?? symbolSector
    };

    return runFullValuation(input);
}

export function runSimpleValuation(
    symbol: string, currentPrice: number, eps: number, roe: number, bvps: number, industryPE: number = 15, lastDividend: number = 0
): ValuationSummary {
    return runUnifiedValuation(symbol, currentPrice, {
        eps, roe, bvps, industryPE, lastDividend
    });
}

export const TARGET_2026: Record<string, number> = {
    'FPT': 200000,
    'HPG': 40000,
    'VCB': 120000,
    'TCB': 65000,
    'MBB': 35000,
    'ACB': 42000,
    'VIB': 30000,
    'MSN': 110000,
    'MWG': 95000,
    'VNM': 92000,
    'PNJ': 130000,
    'DGC': 150000,
    'STB': 45000,
    'VHM': 72000,
    'VIC': 68000
};

export const getTarget2026 = (symbol: string, currentPrice: number): number => {
    return TARGET_2026[symbol] || Math.round(currentPrice * 1.5);
};
