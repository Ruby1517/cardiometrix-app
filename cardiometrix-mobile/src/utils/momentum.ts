export type Momentum = 'Improving' | 'Stable' | 'Worsening';

export function computeSlope(values: number[], timestamps: number[]) {
  if (values.length < 2 || values.length !== timestamps.length) return 0;
  const points = values
    .map((value, index) => ({ value, time: timestamps[index] }))
    .filter((point) => Number.isFinite(point.value) && Number.isFinite(point.time));
  if (points.length < 2) return 0;

  const start = points[0].time;
  const xValues = points.map((point) => (point.time - start) / (1000 * 60 * 60 * 24));
  const yValues = points.map((point) => point.value);
  const meanX = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
  const meanY = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;
  const numerator = xValues.reduce((sum, x, i) => sum + (x - meanX) * (yValues[i] - meanY), 0);
  const denominator = xValues.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

export function classifyMomentum(
  bpSlope: number,
  weightSlope: number,
  symptomTrend: number,
): { momentum: Momentum; reasons: string[] } {
  const reasons: string[] = [];
  const bpSignal = slopeSignal(bpSlope, 0.05);
  const weightSignal = slopeSignal(weightSlope, 0.02);
  const symptomSignal = slopeSignal(symptomTrend, 0.03);

  if (bpSignal === 'down') reasons.push('Blood pressure is trending down.');
  if (bpSignal === 'up') reasons.push('Blood pressure is trending up.');
  if (weightSignal === 'down') reasons.push('Weight is trending down.');
  if (weightSignal === 'up') reasons.push('Weight is trending up.');
  if (symptomSignal === 'down') reasons.push('Symptoms are showing up less often.');
  if (symptomSignal === 'up') reasons.push('Symptoms are showing up more often.');

  const improving = [bpSignal, weightSignal, symptomSignal].filter((signal) => signal === 'down').length;
  const worsening = [bpSignal, weightSignal, symptomSignal].filter((signal) => signal === 'up').length;

  let momentum: Momentum = 'Stable';
  if (improving >= 2 && worsening === 0) momentum = 'Improving';
  else if (worsening >= 2 && improving === 0) momentum = 'Worsening';
  else if (improving === 0 && worsening === 0) momentum = 'Stable';
  else if (worsening > improving) momentum = 'Worsening';
  else if (improving > worsening) momentum = 'Improving';

  return { momentum, reasons: reasons.slice(0, 3) };
}

function slopeSignal(slope: number, threshold: number) {
  if (Math.abs(slope) < threshold) return 'flat';
  return slope > 0 ? 'up' : 'down';
}
