export type EducationContext = {
  bpTrend?: 'up' | 'down' | 'flat' | 'unknown';
  hasA1c?: boolean;
};

export type EducationRule = {
  id: string;
  title: string;
  body: string;
  applies: (context: EducationContext) => boolean;
};

const RULES: EducationRule[] = [
  {
    id: 'bp-trend-up',
    title: 'Why trends matter',
    body: 'Single readings can vary day to day. Trends help you see the bigger picture over time.',
    applies: (context) => context.bpTrend === 'up',
  },
  {
    id: 'a1c-info',
    title: 'What HbA1c measures',
    body: 'HbA1c reflects average blood sugar levels over the past few months.',
    applies: (context) => Boolean(context.hasA1c),
  },
];

export function selectEducationRules(context: EducationContext) {
  return RULES.filter((rule) => rule.applies(context));
}
