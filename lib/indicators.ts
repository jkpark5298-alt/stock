export function sma(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return Number((slice.reduce((a, b) => a + b, 0) / period).toFixed(2));
  });
}

export function ema(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }
    if (i === period - 1) {
      prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(Number(prev.toFixed(2)));
      continue;
    }
    prev = data[i] * k + (prev as number) * (1 - k);
    result.push(Number(prev.toFixed(2)));
  }

  return result;
}

export function rsi(data: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = Array(data.length).fill(null);

  for (let i = period; i < data.length; i++) {
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j] - data[j - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) {
      out[i] = 100;
      continue;
    }
    const rs = avgGain / avgLoss;
    out[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
  }

  return out;
}

export function macd(data: number[]) {
  const ema12 = ema(data, 12);
  const ema26 = ema(data, 26);

  const macdLine = data.map((_, i) => {
    if (ema12[i] == null || ema26[i] == null) return null;
    return Number(((ema12[i] as number) - (ema26[i] as number)).toFixed(2));
  });

  const signalSeed = macdLine.map((v) => v ?? 0);
  const signalCalc = ema(signalSeed, 9);

  const signalLine = macdLine.map((v, i) =>
    v == null || signalCalc[i] == null ? null : Number((signalCalc[i] as number).toFixed(2))
  );

  const histogram = macdLine.map((v, i) =>
    v == null || signalLine[i] == null ? null : Number((v - (signalLine[i] as number)).toFixed(2))
  );

  return { macdLine, signalLine, histogram };
}

export function simpleForecast(closes: number[], days = 5) {
  if (closes.length < 20) return [];
  const recent = closes.slice(-20);
  const returns: number[] = [];

  for (let i = 1; i < recent.length; i++) {
    returns.push((recent[i] - recent[i - 1]) / recent[i - 1]);
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  let last = closes[closes.length - 1];
  const result: number[] = [];

  for (let i = 0; i < days; i++) {
    last *= 1 + mean;
    result.push(Number(last.toFixed(2)));
  }

  return result;
}

export function makeSignal(params: {
  current: number;
  sma20: number | null;
  sma60: number | null;
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
}) {
  const { current, sma20, sma60, rsi, macd, macdSignal } = params;
  let score = 0;
  if (sma20 && current > sma20) score += 1;
  if (sma60 && current > sma60) score += 1;
  if (rsi && rsi < 30) score += 1;
  if (rsi && rsi > 70) score -= 1;
  if (macd && macdSignal && macd > macdSignal) score += 1;
  if (macd && macdSignal && macd < macdSignal) score -= 1;

  if (score >= 2) return "상대적 강세";
  if (score <= -1) return "상대적 약세";
  return "중립";
}
