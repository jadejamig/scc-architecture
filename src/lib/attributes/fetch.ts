import { Document, ObjectId } from "mongodb";
import { attributeEnrichmentPipeline } from "@/lib/attributes/aggregation";
import type { EnrichedAttribute } from "@/lib/attributes/tree";
import {
  getAttributeCollectionName,
  getMongoClient,
  getMongoDbName,
} from "@/lib/mongodb";

function asStringId(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof ObjectId) return v.toHexString();
  if (typeof v === "string") return v;
  return String(v);
}

export async function fetchEnrichedAttributes(): Promise<EnrichedAttribute[]> {
  const client = await getMongoClient();
  const coll = client.db(getMongoDbName()).collection(getAttributeCollectionName());
  const pipeline = attributeEnrichmentPipeline();
  const docs = (await coll
    .aggregate<Document>(pipeline)
    .toArray()) as Document[];

  return docs.map((d) => ({
    _id: asStringId(d._id)!,
    attribute: String(d.attribute ?? ""),
    parentId: asStringId(d.parentId),
    dataType: asStringId(d.dataType),
    parentName: d.parentName != null ? String(d.parentName) : null,
    dataTypeName: d.dataTypeName != null ? String(d.dataTypeName) : null,
  }));
}
