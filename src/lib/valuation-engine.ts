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
    roe: number;              // as percentage (e.g., 20 = 20%)
    lastDividend: number;     // annual dividend per share
    dividendGrowth: number;   // historical dividend growth rate (%)
    industryPE: number;
    dividendYield: number;    // as percentage
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
}

// ===================== CORE METHODS =====================

/**
 * DDM - Gordon Growth Model
 * P₀ = D₁ / (r - g)
 * Best for: mature dividend-paying companies
 */
export function gordonGrowthModel(
    lastDividend: number,
    growthRate: number,     // decimal (e.g., 0.08 for 8%)
    requiredReturn: number  // decimal (e.g., 0.12 for 12%)
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
 * Intrinsic Value = √(22.5 × EPS × BVPS)
 * The 22.5 comes from Graham's criteria: P/E ≤ 15 and P/B ≤ 1.5 (15 × 1.5 = 22.5)
 * Best for: value investing, conservative valuation
 */
export function grahamNumber(eps: number, bvps: number): number {
    if (eps <= 0 || bvps <= 0) return 0;
    return Math.sqrt(22.5 * eps * bvps);
}

/**
 * Simplified DCF (Discounted Cash Flow)
 * Uses EPS as proxy for FCF, projects growth, then discounts back
 * Terminal value via Gordon Growth
 * Best for: growth companies
 */
export function simplifiedDCF(
    eps: number,
    growthRate: number,     // decimal (e.g., 0.15 for 15%)
    discountRate: number,   // decimal (e.g., 0.12 for 12%)
    projectionYears: number = 10,
    terminalGrowthRate: number = 0.03 // 3% perpetual growth
): number {
    if (eps <= 0 || discountRate <= terminalGrowthRate || discountRate <= 0) return 0;

    let totalPV = 0;
    let projectedEPS = eps;

    // Phase 1: Project EPS growth for N years
    for (let year = 1; year <= projectionYears; year++) {
        projectedEPS *= (1 + growthRate);
        totalPV += projectedEPS / Math.pow(1 + discountRate, year);
    }

    // Phase 2: Terminal value (Gordon Growth on final year's EPS)
    const terminalValue = (projectedEPS * (1 + terminalGrowthRate)) / (discountRate - terminalGrowthRate);
    totalPV += terminalValue / Math.pow(1 + discountRate, projectionYears);

    return totalPV;
}

// ===================== MARGIN OF SAFETY =====================

export function calculateMarginOfSafety(
    intrinsicValue: number,
    currentPrice: number
): { margin: number; verdict: 'CHEAP' | 'FAIR' | 'EXPENSIVE' | 'N/A' } {
    if (intrinsicValue <= 0 || currentPrice <= 0) {
        return { margin: 0, verdict: 'N/A' };
    }

    const margin = ((intrinsicValue - currentPrice) / intrinsicValue) * 100;

    let verdict: 'CHEAP' | 'FAIR' | 'EXPENSIVE';
    if (margin >= 25) verdict = 'CHEAP';         // >25% discount = undervalued
    else if (margin >= -10) verdict = 'FAIR';    // -10% to +25% = fairly valued
    else verdict = 'EXPENSIVE';                   // >10% premium = overvalued

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
    }
): ValuationSummary {
    const requiredReturn = (customParams?.requiredReturn || 12) / 100;
    const epsGrowth = (customParams?.epsGrowthRate ?? Math.min(input.roe * 0.6, 25)) / 100; // ROE × retention ratio
    const projYears = customParams?.projectionYears || 10;
    const divGrowth = Math.max(0, Math.min(input.dividendGrowth / 100, requiredReturn - 0.01));

    const results: ValuationResult[] = [];

    // 1. DDM - Gordon Growth
    const ddmValue = gordonGrowthModel(input.lastDividend, divGrowth, requiredReturn);
    const ddmMos = calculateMarginOfSafety(ddmValue, input.currentPrice);
    results.push({
        method: 'DDM - Gordon Growth',
        methodKey: 'ddm',
        intrinsicValue: ddmValue,
        marginOfSafety: ddmMos.margin,
        verdict: ddmMos.verdict,
        confidence: input.lastDividend > 0 && input.dividendGrowth > 0 ? 75 : 20,
        formula: 'P₀ = D₁ / (r - g)',
        inputs: {
            'D₀ (Cổ tức/CP)': `${input.lastDividend.toLocaleString()} đ`,
            'g (Tăng trưởng CT)': `${(divGrowth * 100).toFixed(1)}%`,
            'r (Lãi suất yêu cầu)': `${(requiredReturn * 100).toFixed(1)}%`,
            'D₁ = D₀×(1+g)': `${(input.lastDividend * (1 + divGrowth)).toLocaleString()} đ`,
        },
        notes: input.lastDividend <= 0
            ? 'Không áp dụng: Cổ phiếu không trả cổ tức'
            : ddmValue <= 0
                ? 'Không áp dụng: Tốc độ tăng trưởng ≥ lãi suất yêu cầu'
                : 'Phù hợp cho cổ phiếu trả cổ tức ổn định (ngân hàng, tiện ích)',
    });

    // 2. P/E Relative Valuation
    const peValue = peRelativeValuation(input.eps, input.industryPE);
    const peMos = calculateMarginOfSafety(peValue, input.currentPrice);
    results.push({
        method: 'P/E Tương Đối',
        methodKey: 'pe',
        intrinsicValue: peValue,
        marginOfSafety: peMos.margin,
        verdict: peMos.verdict,
        confidence: input.eps > 0 && input.industryPE > 0 ? 70 : 15,
        formula: 'Fair Value = EPS × P/E ngành',
        inputs: {
            'EPS': `${input.eps.toLocaleString()} đ`,
            'P/E ngành': `${input.industryPE.toFixed(1)}x`,
            'P/E hiện tại': `${input.pe.toFixed(1)}x`,
        },
        notes: input.eps <= 0
            ? 'Không áp dụng: EPS âm (công ty thua lỗ)'
            : 'So sánh định giá với trung bình ngành',
    });

    // 3. Graham Number
    const grahamValue = grahamNumber(input.eps, input.bvps);
    const grahamMos = calculateMarginOfSafety(grahamValue, input.currentPrice);
    results.push({
        method: 'Số Graham',
        methodKey: 'graham',
        intrinsicValue: grahamValue,
        marginOfSafety: grahamMos.margin,
        verdict: grahamMos.verdict,
        confidence: input.eps > 0 && input.bvps > 0 ? 65 : 10,
        formula: '√(22.5 × EPS × BVPS)',
        inputs: {
            'EPS': `${input.eps.toLocaleString()} đ`,
            'BVPS': `${input.bvps.toLocaleString()} đ`,
            'Hệ số Graham': '22.5 (P/E≤15 × P/B≤1.5)',
        },
        notes: input.eps <= 0 || input.bvps <= 0
            ? 'Không áp dụng: EPS hoặc BVPS âm'
            : 'Phương pháp bảo thủ của Benjamin Graham — phù hợp Value Investing',
    });

    // 4. Simplified DCF
    const dcfValue = simplifiedDCF(input.eps, epsGrowth, requiredReturn, projYears);
    const dcfMos = calculateMarginOfSafety(dcfValue, input.currentPrice);
    results.push({
        method: 'DCF Đơn Giản',
        methodKey: 'dcf',
        intrinsicValue: dcfValue,
        marginOfSafety: dcfMos.margin,
        verdict: dcfMos.verdict,
        confidence: input.eps > 0 ? 60 : 10,
        formula: 'PV(EPS tương lai) + Terminal Value',
        inputs: {
            'EPS hiện tại': `${input.eps.toLocaleString()} đ`,
            'Tăng trưởng EPS': `${(epsGrowth * 100).toFixed(1)}%`,
            'Chiết khấu (WACC)': `${(requiredReturn * 100).toFixed(1)}%`,
            'Số năm dự phóng': `${projYears} năm`,
            'Tăng trưởng vĩnh viễn': '3%',
        },
        notes: input.eps <= 0
            ? 'Không áp dụng: EPS âm'
            : 'Dùng EPS làm proxy cho Free Cash Flow — phù hợp công ty tăng trưởng',
    });

    // Calculate weighted average intrinsic value (only from valid results)
    const validResults = results.filter(r => r.intrinsicValue > 0 && r.confidence > 20);
    const totalWeight = validResults.reduce((sum, r) => sum + r.confidence, 0);
    const weightedAvg = totalWeight > 0
        ? validResults.reduce((sum, r) => sum + r.intrinsicValue * r.confidence, 0) / totalWeight
        : 0;

    const overallMos = calculateMarginOfSafety(weightedAvg, input.currentPrice);

    return {
        averageIntrinsic: weightedAvg,
        currentPrice: input.currentPrice,
        overallMargin: overallMos.margin,
        overallVerdict: overallMos.verdict === 'N/A' ? 'FAIR' : overallMos.verdict,
        results,
    };
}
