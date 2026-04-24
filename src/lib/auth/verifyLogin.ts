import argon2 from "argon2";
import { ObjectId } from "mongodb";
import {
  getDocumentDataCollectionName,
  getMongoClient,
  getMongoDbName,
} from "@/lib/mongodb";

const DEFAULT_EMAIL_ATTR = "6909d95ec816ac1c36e43a9f";
const DEFAULT_PASSWORD_ATTR = "6909db23c816ac1c36e43ab3";
const DEFAULT_SECURITY = "64cd0eedbcff230df89c16e3";
const DEFAULT_LANG = "649d8d8dccdc9d4f76e29cf0";

export type LoginSuccess = {
  resourceId: string;
  securityId: string;
  langId: string;
};

/**
 * Replicates the other app's `check_login` against the shared `document_data` collection.
 * Username is matched on the email field; password is verified with argon2 against the hash row.
 */
export async function verifyUserPassword(
  user: string,
  password: string,
): Promise<LoginSuccess | null> {
  const u = user.trim();
  if (!u || !password) {
    return null;
  }

  const emailAttr = process.env.AUTH_EMAIL_ATTRIBUTE_ID?.trim() ?? DEFAULT_EMAIL_ATTR;
  const passwordAttr =
    process.env.AUTH_PASSWORD_ATTRIBUTE_ID?.trim() ?? DEFAULT_PASSWORD_ATTR;

  const client = await getMongoClient();
  const coll = client.db(getMongoDbName()).collection(getDocumentDataCollectionName());

  const emailQuery: Record<string, unknown> = {
    attributeId: new ObjectId(emailAttr),
    dataValue_text: u,
  };
  const extra = process.env.AUTH_DOCUMENT_DATA_QUERY_JSON?.trim();
  if (extra) {
    try {
      const parsed = JSON.parse(extra) as Record<string, unknown>;
      Object.assign(emailQuery, parsed);
    } catch {
      throw new Error("AUTH_DOCUMENT_DATA_QUERY_JSON must be valid JSON");
    }
  }

  const resource = await coll.findOne(emailQuery);
  if (!resource) {
    return null;
  }

  const documentId = resource.documentId;
  if (documentId == null) {
    return null;
  }
  const resourceOid =
    documentId instanceof ObjectId ? documentId : new ObjectId(String(documentId));

  const tokenDoc = await coll.findOne({
    documentId: resourceOid,
    attributeId: new ObjectId(passwordAttr),
  });
  if (!tokenDoc) {
    return null;
  }

  const storedHash = tokenDoc.dataValue_text;
  if (typeof storedHash !== "string" || !storedHash) {
    return null;
  }

  const valid = await argon2.verify(storedHash, password);
  if (!valid) {
    return null;
  }

  const securityId = process.env.AUTH_SECURITY_ID?.trim() ?? DEFAULT_SECURITY;
  const langId = process.env.AUTH_LANG_ID?.trim() ?? DEFAULT_LANG;

  return {
    resourceId: resourceOid.toHexString(),
    securityId,
    langId,
  };
}
