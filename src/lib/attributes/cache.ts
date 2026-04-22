import { unstable_cache } from "next/cache";
import { fetchEnrichedAttributes } from "@/lib/attributes/fetch";
import {
  buildAttributeForest,
  buildNestedTreeMap,
  type AttributeTreeNode,
  type EnrichedAttribute,
  type NestedAttributeMap,
} from "@/lib/attributes/tree";

export type CachedAttributePayload = {
  flat: EnrichedAttribute[];
  forest: AttributeTreeNode[];
  nested: Record<string, NestedAttributeMap>;
  cachedAt: string;
};

async function loadPayload(): Promise<CachedAttributePayload> {
  const flat = await fetchEnrichedAttributes();
  const forest = buildAttributeForest(flat);
  const nested = buildNestedTreeMap(forest);
  return {
    flat,
    forest,
    nested,
    cachedAt: new Date().toISOString(),
  };
}

const REVALIDATE_SECONDS = Number(process.env.ATTRIBUTE_TREE_CACHE_SECONDS ?? 120);

const getCachedPayload = unstable_cache(loadPayload, ["attributes-tree-payload"], {
  revalidate: REVALIDATE_SECONDS,
  tags: ["attributes-tree"],
});

/**
 * Server-side cache: avoids hitting Mongo on every request.
 * Bust with `revalidateTag("attributes-tree")` (see revalidate route).
 */
export function getCachedAttributePayload(): Promise<CachedAttributePayload> {
  return getCachedPayload();
}
