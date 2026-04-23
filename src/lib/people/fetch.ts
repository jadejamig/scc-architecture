import { ObjectId } from "mongodb";
import { serializeForJson } from "@/lib/serialization";
import {
  getDocumentDataCollectionName,
  getMongoClient,
  getMongoDbName,
} from "@/lib/mongodb";
import { getPeoplePipelineConfig } from "@/lib/people/config";
import {
  buildPersonDetailPipeline,
  buildPersonSearchByIdPipeline,
  buildPersonSearchByNamePipeline,
} from "@/lib/people/pipelines";

const DEFAULT_SEARCH_LIMIT = 50;

function searchLimit(): number {
  const n = Number(process.env.PEOPLE_SEARCH_LIMIT ?? DEFAULT_SEARCH_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : DEFAULT_SEARCH_LIMIT;
}

export type PersonListItem = {
  personId: string;
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  phone?: unknown;
};

function looksLikeObjectIdHex(s: string): boolean {
  return /^[a-f0-9]{24}$/i.test(s.trim());
}

export async function searchPeople(rawQuery: string): Promise<PersonListItem[]> {
  const q = rawQuery.trim();
  if (!q) return [];

  const cfg = getPeoplePipelineConfig();
  const coll = (await getMongoClient())
    .db(getMongoDbName())
    .collection(getDocumentDataCollectionName());

  const limit = searchLimit();

  const pipeline = looksLikeObjectIdHex(q)
    ? buildPersonSearchByIdPipeline(q, cfg)
    : buildPersonSearchByNamePipeline(q, cfg, limit);

  const rows = await coll.aggregate(pipeline).toArray();
  return rows.map((row) => {
    const s = serializeForJson(row) as Record<string, unknown>;
    const pid = s.personId;
    return {
      personId: typeof pid === "string" ? pid : String(pid),
      first_name: s.first_name,
      last_name: s.last_name,
      email: s.email,
      phone: s.phone,
    };
  });
}

export async function getPersonDetail(personId: string): Promise<Record<string, unknown> | null> {
  if (!ObjectId.isValid(personId)) return null;

  const cfg = getPeoplePipelineConfig();
  const coll = (await getMongoClient())
    .db(getMongoDbName())
    .collection(getDocumentDataCollectionName());

  const pipeline = buildPersonDetailPipeline(personId, cfg);
  const rows = await coll.aggregate(pipeline).toArray();
  if (rows.length === 0) return null;

  return serializeForJson(rows[0]) as Record<string, unknown>;
}
