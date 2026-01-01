export const EXCHANGE_RATE = 185;

export const formatLRD = (usdAmount: number): string => {
    return Math.round(usdAmount * EXCHANGE_RATE).toLocaleString();
};

export const formatUSD = (amount: number): string => {
    return amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const formatDual = (usdAmount: number): string => {
    const lrd = formatLRD(usdAmount);
    const usd = formatUSD(usdAmount);
    return `${usd} / L$ ${lrd}`;
}
