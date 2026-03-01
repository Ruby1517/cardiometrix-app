import test from 'node:test';
import assert from 'node:assert/strict';
import renderer from 'react-test-renderer';
import { EmptyState } from './EmptyState';

test('EmptyState renders consistently', () => {
  const tree = renderer
    .create(
      <EmptyState
        title="No vitals yet"
        description="Add a BP or weight entry to start seeing trends."
        actionLabel="Add vitals"
        onAction={() => undefined}
      />,
    )
    .toJSON();

  assert.deepStrictEqual(simplify(tree), {
    type: 'View',
    children: [
      { type: 'Text', text: 'No vitals yet' },
      { type: 'Text', text: 'Add a BP or weight entry to start seeing trends.' },
      { type: 'Touchable', children: [{ type: 'Text', text: 'Add vitals' }] },
    ],
  });
});

type Simplified = {
  type: string;
  text?: string;
  children?: Simplified[];
};

function simplify(node: any): Simplified {
  if (!node) return { type: 'null' };
  if (typeof node === 'string') return { type: 'Text', text: node };
  const children = node.children?.map((child: any) => simplify(child)).filter(Boolean);
  if (node.type === 'Text') {
    const text = node.children?.join('') ?? '';
    return { type: 'Text', text };
  }
  if (node.type === 'View') {
    const isButton = node.props?.accessibilityRole === 'button';
    return { type: isButton ? 'Touchable' : 'View', children };
  }
  return { type: node.type ?? 'Unknown', children };
}
