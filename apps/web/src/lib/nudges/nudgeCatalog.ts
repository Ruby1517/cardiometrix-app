export type NudgeTag = 'sleep' | 'movement' | 'sodium' | 'meds' | 'hydration' | 'weight';

export type NudgeItem = {
  key: string;
  tag: NudgeTag;
  text: string;
  burden: 1 | 2 | 3;
  variant?: string;
};

export const nudgeCatalog: NudgeItem[] = [
  { key: 'sleep_early_20', tag: 'sleep', burden: 1, text: 'Try getting to bed 20 minutes earlier tonight.' },
  { key: 'sleep_screen_break', tag: 'sleep', burden: 1, text: 'Pause screens 30 minutes before sleep to improve recovery.' },
  { key: 'sleep_breathing', tag: 'sleep', burden: 1, text: 'Do 3 minutes of slow breathing before bed.' },
  { key: 'move_walk_10', tag: 'movement', burden: 1, text: 'Add a 10-minute easy walk after a meal today.' },
  { key: 'move_breaks', tag: 'movement', burden: 1, text: 'Take a 2-minute movement break every hour for 4 hours.' },
  { key: 'move_steps_goal', tag: 'movement', burden: 2, text: 'Set a realistic step goal and check progress by evening.' },
  { key: 'sodium_swap', tag: 'sodium', burden: 1, text: 'Swap one salty snack for fruit or unsalted nuts today.' },
  { key: 'sodium_label', tag: 'sodium', burden: 2, text: 'Check labels and keep sodium lower at one meal today.' },
  { key: 'meds_checkin', tag: 'meds', burden: 1, text: 'Take meds on schedule and mark them done in the app.' },
  { key: 'meds_refill', tag: 'meds', burden: 2, text: 'Verify your next refill date to avoid missed doses.' },
  { key: 'hydrate_water', tag: 'hydration', burden: 1, text: 'Drink one extra glass of water before lunch.' },
  { key: 'hydrate_reduce_soda', tag: 'hydration', burden: 2, text: 'Replace one sugary drink with water today.' },
  { key: 'weight_portion', tag: 'weight', burden: 2, text: 'Use a smaller portion at one meal today.' },
  { key: 'weight_evening_walk', tag: 'weight', burden: 1, text: 'Take a light 10-minute evening walk.' },
];
