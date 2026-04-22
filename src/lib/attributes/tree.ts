export type EnrichedAttribute = {
  _id: string;
  attribute: string;
  parentId: string | null;
  dataType: string | null;
  parentName: string | null;
  dataTypeName: string | null;
};

export type AttributeTreeNode = EnrichedAttribute & {
  children: AttributeTreeNode[];
};

/** Nested shape: each key is the attribute name; `child` groups direct children. */
export type NestedAttributeMap = {
  _id: string;
  dataTypeId: string | null;
  dataTypeName: string | null;
  parentId: string | null;
  parentName: string | null;
  child?: Record<string, NestedAttributeMap>;
};

const forestCache = new WeakMap<EnrichedAttribute[], AttributeTreeNode[]>();
const nestedCache = new WeakMap<AttributeTreeNode[], Record<string, NestedAttributeMap>>();

function keyForId(id: string | null | undefined): string | null {
  if (id === null || id === undefined) return null;
  return String(id);
}

/**
 * Builds root nodes and attaches children (memoized per flat array instance).
 */
export function buildAttributeForest(flat: EnrichedAttribute[]): AttributeTreeNode[] {
  const memo = forestCache.get(flat);
  if (memo) return memo;

  const idSet = new Set(flat.map((a) => a._id));
  const byId = new Map<string, EnrichedAttribute>();
  for (const a of flat) byId.set(a._id, a);

  const childrenByParent = new Map<string, EnrichedAttribute[]>();
  for (const a of flat) {
    const p = keyForId(a.parentId);
    const bucketKey = p ?? "__root__";
    const list = childrenByParent.get(bucketKey) ?? [];
    list.push(a);
    childrenByParent.set(bucketKey, list);
  }

  const roots: EnrichedAttribute[] = [];
  for (const a of flat) {
    const p = keyForId(a.parentId);
    if (p === null || !idSet.has(p)) {
      roots.push(a);
    }
  }

  const sortByName = (xs: EnrichedAttribute[]) =>
    [...xs].sort((a, b) => a.attribute.localeCompare(b.attribute));

  function toNode(a: EnrichedAttribute): AttributeTreeNode {
    const kids = childrenByParent.get(a._id) ?? [];
    return {
      ...a,
      children: sortByName(kids).map(toNode),
    };
  }

  const forest = sortByName(roots).map(toNode);
  forestCache.set(flat, forest);
  return forest;
}

/** Nested `child` map for one node and all descendants (same shape as full-tree nested export). */
export function attributeNodeToNestedMap(node: AttributeTreeNode): NestedAttributeMap {
  const base: NestedAttributeMap = {
    _id: node._id,
    dataTypeId: node.dataType,
    dataTypeName: node.dataTypeName,
    parentId: node.parentId,
    parentName: node.parentName,
  };
  if (node.children.length === 0) return base;

  const child: Record<string, NestedAttributeMap> = {};
  for (const c of node.children) {
    child[c.attribute] = attributeNodeToNestedMap(c);
  }
  return { ...base, child };
}

/**
 * Example-oriented shape like:
 * { Conversation: { _id, ..., child: { "Conversation Phone Number": { ... } } } }
 */
export function buildNestedTreeMap(forest: AttributeTreeNode[]): Record<string, NestedAttributeMap> {
  const memo = nestedCache.get(forest);
  if (memo) return memo;

  const out: Record<string, NestedAttributeMap> = {};
  for (const root of forest) {
    out[root.attribute] = attributeNodeToNestedMap(root);
  }
  nestedCache.set(forest, out);
  return out;
}

export function collectTreeNodeIds(node: AttributeTreeNode, into: Set<string> = new Set()): Set<string> {
  into.add(node._id);
  for (const c of node.children) collectTreeNodeIds(c, into);
  return into;
}
