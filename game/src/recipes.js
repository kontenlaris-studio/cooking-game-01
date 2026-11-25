// recipes.js — the Sizzle Street menu: the ingredient bins on the counter, which
// of them must visit the stove, and every dish as a bottom-first layer stack.
// A layer token ending in "*" must reach the plate cooked, never raw.

export const INGREDIENTS = {
  bun:     { label: 'Bun',     needsStove: false },
  patty:   { label: 'Patty',   needsStove: true  },
  cheese:  { label: 'Cheese',  needsStove: false },
  lettuce: { label: 'Lettuce', needsStove: false },
  tomato:  { label: 'Tomato',  needsStove: false },
  egg:     { label: 'Egg',     needsStove: true  },
  greens:  { label: 'Greens',  needsStove: false },
  bread:   { label: 'Bread',   needsStove: false },
  batter:  { label: 'Pancake', needsStove: true  },
  syrup:   { label: 'Syrup',   needsStove: false },
};

// Left-to-right, top-to-bottom order of the bins on the counter.
export const BIN_ORDER = [
  'bun', 'patty', 'cheese', 'lettuce', 'tomato',
  'egg', 'greens', 'bread', 'batter', 'syrup',
];

export const DISHES = [
  { id: 'burger',   name: 'Classic Burger', price: 12, stack: ['bun', 'patty*', 'cheese', 'lettuce', 'bun'] },
  { id: 'deluxe',   name: 'Deluxe Burger',  price: 16, stack: ['bun', 'patty*', 'cheese', 'tomato', 'lettuce', 'bun'] },
  { id: 'salad',    name: 'Garden Salad',   price: 11, stack: ['greens', 'tomato', 'egg*', 'cheese'] },
  { id: 'pancakes', name: 'Pancake Stack',  price: 10, stack: ['batter*', 'batter*', 'syrup'] },
  { id: 'club',     name: 'Club Sandwich',  price: 15, stack: ['bread', 'egg*', 'cheese', 'lettuce', 'tomato', 'bread'] },
];

// One stack token -> one plate layer: { id, cooked }.
export function parseLayer(token) {
  return token.endsWith('*')
    ? { id: token.slice(0, -1), cooked: true }
    : { id: token, cooked: false };
}

export function dishLayers(dish) {
  return dish.stack.map(parseLayer);
}

// A plate matches a dish only when every layer lines up, order and all.
export function plateMatchesDish(plate, dish) {
  const want = dishLayers(dish);
  if (plate.length !== want.length) return false;
  return want.every((layer, i) => plate[i].id === layer.id && plate[i].cooked === layer.cooked);
}
