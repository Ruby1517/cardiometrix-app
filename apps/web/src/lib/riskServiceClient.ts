import { featuresV1Schema, FeaturesV1 } from '@/lib/featureEngineering/featuresV1';
import { z } from 'zod';

export type RiskScoreDriver = {
  name: string;
  value: number;
  direction: 'up' | 'down';
  contribution: number;
};

export type RiskScoreOut = {
  risk: number | null;
  band: 'green' | 'amber' | 'red' | 'unknown';
  drivers: RiskScoreDriver[];
  model_version: string;
  as_of_date: string;
  error?: string;
};

const riskScoreOutSchema = featuresV1Schema
  .pick({ as_of_date: true });

const riskScoreSchema = z.object({
  risk: z.number().min(0).max(1),
  band: z.enum(['green', 'amber', 'red']),
  drivers: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
      direction: z.enum(['up', 'down']),
      contribution: z.number(),
    }),
  ),
  model_version: z.string(),
  as_of_date: riskScoreOutSchema.shape.as_of_date,
});

const batchSchema = z.object({ items: z.array(riskScoreSchema) });

function isRetryable(err: unknown) {
  if (err instanceof TypeError) return true;
  if (err instanceof Error && /network|timeout|fetch/i.test(err.message)) return true;
  return false;
}

async function fetchWithRetry(path: string, payload: unknown) {
  const base = process.env.RISK_SERVICE_URL || 'http://localhost:8001';
  const url = `${base.replace(/\/$/, '')}${path}`;

  let waitMs = 120;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status >= 400 && res.status < 500) {
        const body = await res.text();
        throw new Error(`risk_service_4xx:${res.status}:${body}`);
      }

      if (!res.ok) {
        throw new Error(`risk_service_${res.status}`);
      }

      return res;
    } catch (err) {
      const is4xx = err instanceof Error && err.message.startsWith('risk_service_4xx:');
      if (is4xx || attempt === 2 || !isRetryable(err)) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      waitMs *= 2;
    }
  }
  throw new Error('risk_service_unavailable');
}

export async function scoreOne(features: FeaturesV1): Promise<RiskScoreOut> {
  const payload = featuresV1Schema.parse(features);
  try {
    const res = await fetchWithRetry('/score', payload);
    const data = await res.json();
    return riskScoreSchema.parse(data);
  } catch {
    return {
      risk: null,
      band: 'unknown',
      drivers: [],
      model_version: 'unavailable',
      as_of_date: payload.as_of_date,
      error: 'risk_service_unavailable',
    };
  }
}

export async function scoreBatch(featuresList: FeaturesV1[]): Promise<RiskScoreOut[]> {
  const items = featuresList.map((item) => featuresV1Schema.parse(item));
  if (items.length > 500) {
    throw new Error('score_batch_limit_exceeded');
  }
  const res = await fetchWithRetry('/score/batch', { items });
  const data = (await res.json()) as { items: RiskScoreOut[] };
  const parsed = batchSchema.parse({ items: data.items });
  return parsed.items;
}
