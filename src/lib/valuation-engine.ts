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

// ===================== CORE METHODS =====================

/**
 * DDM - Gordon Growth Model
 * P₀ = D₁ / (r - g)
 * Best for: mature dividend-paying companies
 */
export function gordonGrowthModel(
    lastDividend: number,
    growthRate: number,     // decimal (e.g. 0.08 for 8%)
    requiredReturn: number  // decimal (e.g. 0.12 for 12%)
): number {
    if (lastDividend <= 0 || requiredReturn <= growthRate || requiredReturn <= 0) {
        return 0; // Invalid: can't value non-dividend stocks or when g >= r
    }
    const d1 = lastDividend * (1 + growthRate); // Next year's expected dividend
    return d1 / (requiredReturn - growthRate);
}

/**
 * P/E Relative Valuation
 * Fair Value = EPS × Industry P/E (or target P/E)
 * Best for: comparing with industry peers
 */
export function peRelativeValuation(
    eps: number,
    targetPE: number
): number {
    if (eps <= 0 || targetPE <= 0) return 0;
    return eps * targetPE;
}

/**
 * Graham Number (Benjamin Graham)
 * Intrinsic Value = √(Multiplier × EPS × BVPS)
 */
export function grahamNumber(eps: number, bvps: number, isBank: boolean = false): number {
    if (eps <= 0 || bvps <= 0) return 0;

    // Graham's 22.5 comes from P/E 15 * P/B 1.5. 
    // For banks, P/E 15 is too high (usually < 10) and P/B 1.5 is standard.
    // So for banks we use Multiplier = 10 * 1.5 = 15.
    const multiplier = isBank ? 15.0 : 22.5;

    return Math.sqrt(multiplier * eps * bvps);
}

/**
 * Simplified DCF (Discounted Cash Flow)
 * Uses EPS as proxy for FCF, projects growth, then discounts back
 */
export function simplifiedDCF(
    eps: number,
    initialGrowthRate: number,     // decimal (e.g. 0.15 for 15%)
    discountRate: number,   // decimal (e.g. 0.12 for 12%)
    projectionYears: number = 10,
    terminalGrowthRate: number = 0.03 // 3% perpetual growth
): number {
    if (eps <= 0 || discountRate <= terminalGrowthRate || discountRate <= 0) return 0;

    let totalPV = 0;
    let projectedEPS = eps;

    // Phase 1: Project EPS growth for N years with linear decay to terminal rate
    // E.g. yr1 = 15%, yr10 = 3%. Decay per year = (15% - 3%) / 10
    const annualDecay = (initialGrowthRate - terminalGrowthRate) / projectionYears;

    for (let year = 1; year <= projectionYears; year++) {
        const currentYearGrowth = Math.max(terminalGrowthRate, initialGrowthRate - (annualDecay * year));
        projectedEPS *= (1 + currentYearGrowth);
        totalPV += projectedEPS / Math.pow(1 + discountRate, year);
    }

    // Phase 2: Terminal value (Gordon Growth on final year's EPS)
    const terminalValue = (projectedEPS * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
    totalPV += terminalValue / Math.pow(1 + discountRate, projectionYears);

    return totalPV;
}

/**
 * Reverse DCF
 * Numerically solves for the implied growth rate `g` that makes the DCF Intrinsic Value equal to the Current Price.
 */
export function calculateReverseDCF(
    currentPrice: number,
    eps: number,
    discountRate: number,
    projectionYears: number = 10,
    terminalGrowthRate: number = 0.03
): number | null {
    if (eps <= 0 || currentPrice <= 0 || discountRate <= terminalGrowthRate) return null;

    let g_low = -0.99; // -99% growth (almost bankruptcy)
    let g_high = 2.0;  // 200% growth (hyper growth)
    let g_mid = 0;
    const tolerance = 0.0001; // 0.01% precision
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
        g_mid = (g_low + g_high) / 2;
        const pv = simplifiedDCF(eps, g_mid, discountRate, projectionYears, terminalGrowthRate);

        if (Math.abs(pv - currentPrice) < tolerance * currentPrice) {
            return g_mid; // Found it within tolerance
        }

        if (pv < currentPrice) {
            // PV is too low, we need a higher growth rate
            g_low = g_mid;
        } else {
            // PV is too high, we need a lower growth rate
            g_high = g_mid;
        }
    }

    return g_mid; // Return best approximation after max iterations
}

// ===================== MARGIN OF SAFETY =====================

export function calculateMarginOfSafety(
    intrinsicValue: number,
    currentPrice: number,
    sentimentScore: number = 50 // Default neutral
): { margin: number; verdict: 'CHEAP' | 'FAIR' | 'EXPENSIVE' | 'N/A' } {
    if (intrinsicValue <= 0 || currentPrice <= 0) {
        return { margin: 0, verdict: 'N/A' };
    }

    const margin = ((intrinsicValue - currentPrice) / intrinsicValue) * 100;

    // Adjust thresholds based on Fear & Greed
    // Greed (75+) -> Stricter buy criteria (+10% margin needed)
    // Fear (25-) -> Looser buy criteria (-10% margin needed)
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
        baseGrowthRate - 0.04,
        baseGrowthRate - 0.02,
        baseGrowthRate,
        baseGrowthRate + 0.02,
        baseGrowthRate + 0.04,
    ].map(r => Math.max(0, Math.min(r, 0.30))); // Cap 0-30%

    const discountRates = [
        baseDiscountRate - 0.02,
        baseDiscountRate - 0.01,
        baseDiscountRate,
        baseDiscountRate + 0.01,
        baseDiscountRate + 0.02,
    ].map(r => Math.max(0.05, Math.min(r, 0.25))); // Cap 5-25%

    const values = discountRates.map(dr =>
        growthRates.map(gr => simplifiedDCF(eps, gr, dr, projectionYears))
    );

    return { growthRates, discountRates, values };
}

// ===================== FULL VALUATION =====================

export function runFullValuation(
    input: ValuationInput,
    customParams?: {
        requiredReturn?: number;   // Default: 12%
        epsGrowthRate?: number;    // Default: based on ROE
        projectionYears?: number;  // Default: 10
        marketSentimentScore?: number; // Default: 50
    }
): ValuationSummary {
    const sentimentScore = customParams?.marketSentimentScore ?? 50;
    const isBank = input.industry === 'Ngân hàng' || input.bvps > input.eps * 6;
    const isGrowth = input.industry === 'Công nghệ' || (input.pe > 15 && input.roe > 15);
    
    // Dynamic Calibration Info
    let sectorCalibration = `Hệ máy tự động hiệu chuẩn cho nhóm ${input.industry || 'Chung'}.`;
    if (isBank) sectorCalibration = "⚠️ Hiệu chuẩn NH: Chặn trần Graham & DCF bảo thủ, ưu tiên Giá trị Sổ sách và Cổ tức.";
    if (isGrowth) sectorCalibration = "🚀 Hiệu chuẩn Tech: Ưu tiên Tăng trưởng kép & DCF, hạ trọng số Ben Graham.";

    // Required Return calculation (Risk-adjusted)
    // Beta is often higher in VN, so 12% is a base. Banks might be 11%, speculative 14%.
    let baseReturn = (customParams?.requiredReturn || 12) / 100;
    if (isBank) baseReturn = 0.11; // Slightly lower for systemic assets
    if (isGrowth) baseReturn = 0.13; // Higher risk premium for tech

    const requiredReturn = baseReturn;

    // Growth calculation
    // Growth stocks often have high ROE. We take 60% of ROE as sustainable growth.
    // Banks are more conservative: 40% of ROE.
    const growthCap = isGrowth ? 25 : 18;
    const growthRetention = isBank ? 0.4 : 0.6;
    const calculatedGrowth = input.roe ? Math.min(input.roe * growthRetention, growthCap) : 10;
    const epsGrowth = (customParams?.epsGrowthRate ?? calculatedGrowth) / 100;

    const projYears = customParams?.projectionYears || 10;
    const divGrowth = Math.max(0, Math.min(input.dividendGrowth / 100, requiredReturn - 0.01));

    const results: ValuationResult[] = [];

    // 1. DDM - Gordon Growth (Weight elevated for Banks)
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
            'D₁ = D₀×(1+g)': `${(input.lastDividend * (1 + divGrowth)).toLocaleString()} đ`,
        },
        notes: input.lastDividend <= 0
            ? 'Không áp dụng: Cổ phiếu không trả cổ tức'
            : 'Phù hợp nhất cho nhóm Ngân hàng và các mã Bluechip trả tiền mặt ổn định.',
    });

    // 2. P/E Relative Valuation (Always relevant as a baseline)
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
            'P/E hiện tại': `${input.pe.toFixed(1)}x`,
        },
        notes: 'Chỉ số tham chiếu nhanh từ thị trường.',
    });

    // 3. Graham Number (Significant for Banks, discounted for Growth)
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
            'Hệ số Graham': isBank ? '15.0 (Bảo thủ NH)' : '22.5 (P/E 15 × P/B 1.5)',
        },
        notes: isGrowth ? 'Ít tin cậy với hàng tăng trưởng.' : 'Mô hình kinh điển, bảo vệ vốn tuyệt vời.',
    });

    // 4. Simplified DCF (King of Tech/Growth, cautious for Banks)
    const dcfValue = simplifiedDCF(input.eps, epsGrowth, requiredReturn, projYears);
    const dcfMos = calculateMarginOfSafety(dcfValue, input.currentPrice, sentimentScore);
    results.push({
        method: 'DCF Đơn Giản',
        methodKey: 'dcf',
        intrinsicValue: dcfValue,
        marginOfSafety: dcfMos.margin,
        verdict: dcfMos.verdict,
        confidence: isGrowth ? 90 : (isBank ? 50 : 60),
        formula: 'PV(Tương lai) + Terminal Value',
        inputs: {
            'EPS hiện tại': `${input.eps.toLocaleString()} đ`,
            'Tăng trưởng dự phóng': `${(epsGrowth * 100).toFixed(1)}%`,
            'Chiết khấu (r)': `${(requiredReturn * 100).toFixed(1)}%`,
            'Số năm': `${projYears} năm`,
        },
        notes: 'Phương pháp định giá dòng tiền kỳ vọng.',
    });

    // Weighting & Final Grade
    const validResults = results.filter(r => r.intrinsicValue > 0 && r.confidence >= 20);

    const adjustedResults = validResults.map(r => {
        let adjConfidence = r.confidence;
        // Penality for extreme flyers (> 80% upside needs higher conviction)
        if (r.intrinsicValue > input.currentPrice * 1.8) adjConfidence *= 0.4;
        return { ...r, adjConfidence };
    });

    const totalWeight = adjustedResults.reduce((sum, r) => sum + r.adjConfidence, 0);
    const weightedAvg = totalWeight > 0
        ? adjustedResults.reduce((sum, r) => sum + r.intrinsicValue * r.adjConfidence, 0) / totalWeight
        : 0;

    const overallMos = calculateMarginOfSafety(weightedAvg, input.currentPrice, sentimentScore);

    // Convergence logic
    let grade = 'C';
    if (adjustedResults.length >= 2) {
        const values = adjustedResults.map(r => r.intrinsicValue);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
        const cv = stdDev / avg;

        if (cv < 0.15) grade = 'S';
        else if (cv < 0.25) grade = 'A';
        else if (cv < 0.4) grade = 'B';
        else grade = 'C';
    }

    const convictionRaw = Math.min(100, (grade === 'S' ? 95 : grade === 'A' ? 85 : 70) + (isBank || isGrowth ? 10 : 0));

    return {
        averageIntrinsic: weightedAvg,
        currentPrice: input.currentPrice,
        overallMargin: overallMos.margin,
        overallVerdict: overallMos.verdict === 'N/A' ? 'FAIR' : overallMos.verdict,
        results,
        marketSentimentScore: sentimentScore,
        convictionScore: Math.min(100, convictionRaw),
        convergenceGrade: grade,
        sectorCalibration
    };
}
