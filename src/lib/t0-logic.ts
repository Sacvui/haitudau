/**
 * Logic Engine for T+0 Intra-day Trading (Lướt T0)
 */

export interface T0Signal {
    symbol: string;
    action: 'BUY' | 'SELL' | 'HOLD';
    strength: number; // 0 to 100
    message: string;
    targetPrice?: number;
}

export interface DayRange {
    high: number;
    low: number;
    current: number;
    open: number;
}

/**
 * Calculates a T+0 signal based on intra-day volatility.
 * Logic:
 * - If price is near Day High (>90% of range) -> Suggest SELL (to buy back lower)
 * - If price is near Day Low (<10% of range) -> Suggest BUY (to lower ave cost)
 * - Also considers deviation from Open price.
 */
export function calculateT0Signal(symbol: string, range: DayRange, avgCost: number): T0Signal {
    const { high, low, current, open } = range;
    
    if (high === low) return { symbol, action: 'HOLD', strength: 0, message: 'Thị trường chưa có biến động đủ lớn.' };

    const rangeSize = high - low;
    const positionInRange = (current - low) / rangeSize;
    
    // Deviation from open
    const openChange = (current - open) / open;
    
    // Logic for SELL signal (Sell at high, buy back lower)
    // Strong signal if price is near high and current price > avgCost (selling at profit)
    if (positionInRange > 0.85) {
        let strength = (positionInRange - 0.85) / 0.15 * 100;
        if (openChange > 0.03) strength += 20; // Extra strength if up > 3% from open
        
        return {
            symbol,
            action: 'SELL',
            strength: Math.min(strength, 100),
            message: current > avgCost 
                ? `Giá đang tiệm cận đỉnh ngày. Hãy chốt lời một phần để mua lại khi hạ nhiệt.`
                : `Giá đang hồi phục về đỉnh ngày. Cơ hội tốt để hạ tỷ trọng nợ margin.`,
            targetPrice: low + (rangeSize * 0.3) // Suggest buying back at 30% of range
        };
    }

    // Logic for BUY signal (Buy at low, sell back higher)
    if (positionInRange < 0.15) {
        let strength = (0.15 - positionInRange) / 0.15 * 100;
        if (openChange < -0.03) strength += 20; // Extra strength if down > 3% from open

        return {
            symbol,
            action: 'BUY',
            strength: Math.min(strength, 100),
            message: `Giá đang rũ bỏ về đáy ngày. Cơ hội tuyệt vời để mua trung bình giá hạ giá vốn.`,
            targetPrice: high - (rangeSize * 0.3) // Suggest selling at 70% of range
        };
    }

    return {
        symbol,
        action: 'HOLD',
        strength: 0,
        message: 'Giá đang ở vùng trung tính. Chưa có điểm đảo hàng tối ưu.'
    };
}
