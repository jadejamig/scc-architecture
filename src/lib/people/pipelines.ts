import type { Document } from "mongodb";
import { ObjectId } from "mongodb";
import type { PeoplePipelineConfig } from "@/lib/people/config";
import {
  getConversationLogCollectionName,
  getDocumentDataCollectionName,
} from "@/lib/mongodb";

const VALUE = {
  $ifNull: [
    "$dataValue_number",
    { $ifNull: ["$dataValue_text", "$dataValue_object"] },
  ],
} as const;

function personDataProjection(): Document {
  return {
    personId: "$_id",
    person_data: { $arrayToObject: "$kv" },
  };
}

function personFlatProjection(cfg: PeoplePipelineConfig): Document {
  const pk = cfg.personAttrKeys;
  return {
    personId: 1,
    first_name: `$person_data.${pk.firstName}`,
    last_name: `$person_data.${pk.lastName}`,
    email: `$person_data.${pk.email}`,
    phone: `$person_data.${pk.phone}`,
  };
}

function txDataFirstField(txDataPath: string, attrKeyHex: string): Document {
  return {
    $arrayElemAt: [
      {
        $map: {
          input: txDataPath,
          as: "row",
          in: { $getField: { field: attrKeyHex, input: "$$row.data" } },
        },
      },
      0,
    ],
  };
}

export function buildPersonSearchByIdPipeline(
  personId: string,
  cfg: PeoplePipelineConfig
): Document[] {
  const oid = new ObjectId(personId);
  return [
    {
      $match: {
        documentId: oid,
        attributeId: { $in: cfg.personAttrIds },
      },
    },
    {
      $project: {
        attributeId: 1,
        documentId: 1,
        value: VALUE,
      },
    },
    {
      $group: {
        _id: "$documentId",
        kv: { $push: { k: { $toString: "$attributeId" }, v: "$value" } },
      },
    },
    { $project: personDataProjection() },
    { $project: personFlatProjection(cfg) },
    { $limit: 1 },
  ];
}

/**
 * Text search: first name, last name, and **email** on `document_data` (email uses
 * `PERSON_ATTR_EMAIL` / `6909d95ec816ac1c36e43a9f` by default).
 */
export function buildPersonSearchByNamePipeline(
  q: string,
  cfg: PeoplePipelineConfig,
  limit: number
): Document[] {
  const coll = getDocumentDataCollectionName();
  const [firstOid, lastOid, emailOid] = [
    cfg.personAttrIds[0],
    cfg.personAttrIds[1],
    cfg.personAttrIds[2],
  ];
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rx = new RegExp(escaped, "i");

  return [
    {
      $match: {
        $or: [
          { attributeId: firstOid, dataValue_text: rx },
          { attributeId: lastOid, dataValue_text: rx },
          { attributeId: emailOid, dataValue_text: rx },
        ],
      },
    },
    { $group: { _id: "$documentId" } },
    { $sort: { _id: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: coll,
        let: { pid: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$documentId", "$$pid"] },
              attributeId: { $in: cfg.personAttrIds },
            },
          },
          {
            $project: {
              attributeId: 1,
              documentId: 1,
              value: VALUE,
            },
          },
          {
            $group: {
              _id: "$documentId",
              kv: { $push: { k: { $toString: "$attributeId" }, v: "$value" } },
            },
          },
          { $project: personDataProjection() },
          { $project: personFlatProjection(cfg) },
        ],
        as: "p",
      },
    },
    { $unwind: { path: "$p", preserveNullAndEmptyArrays: false } },
    { $replaceRoot: { newRoot: "$p" } },
  ];
}

export function buildPersonDetailPipeline(
  personId: string,
  cfg: PeoplePipelineConfig
): Document[] {
  const pid = new ObjectId(personId);
  const dataColl = getDocumentDataCollectionName();
  const logColl = getConversationLogCollectionName();
  const tx = cfg.transactionAttrIds;
  const txk = cfg.transactionAttrKeys;
  const conv = cfg.conversationAttrIds;
  const pk = cfg.personAttrKeys;

  return [
    {
      $match: {
        documentId: pid,
        attributeId: { $in: cfg.personAttrIds },
      },
    },
    {
      $project: {
        attributeId: 1,
        documentId: 1,
        value: VALUE,
      },
    },
    {
      $group: {
        _id: "$documentId",
        kv: { $push: { k: { $toString: "$attributeId" }, v: "$value" } },
      },
    },
    {
      $project: {
        personId: "$_id",
        person_data: { $arrayToObject: "$kv" },
      },
    },
    {
      $lookup: {
        from: dataColl,
        let: { personId: "$personId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$attributeId", tx.personRef] },
                  { $eq: ["$dataValue_object", "$$personId"] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: dataColl,
              let: { txId: "$documentId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$documentId", "$$txId"] },
                    attributeId: { $in: [tx.orderNumber, tx.shopifyOrderId] },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    attributeId: 1,
                    value: VALUE,
                  },
                },
                {
                  $group: {
                    _id: null,
                    kv: {
                      $push: {
                        k: { $toString: "$attributeId" },
                        v: "$value",
                      },
                    },
                  },
                },
                {
                  $project: {
                    _id: 0,
                    data: { $arrayToObject: "$kv" },
                  },
                },
              ],
              as: "tx_data",
            },
          },
          {
            $project: {
              _id: 0,
              transactionId: "$documentId",
              order_number: txDataFirstField("$tx_data", txk.orderNumber),
              shopify_order_id: txDataFirstField("$tx_data", txk.shopifyOrderId),
            },
          },
          { $sort: { transactionId: -1 } },
        ],
        as: "transactions",
      },
    },
    {
      $lookup: {
        from: dataColl,
        let: { personId: "$personId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$attributeId", conv.personRef] },
                  { $eq: ["$dataValue_object", "$$personId"] },
                ],
              },
            },
          },
          {
            $lookup: {
              from: logColl,
              let: { conversationId: "$documentId" },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ["$conversation_id", "$$conversationId"] },
                  },
                },
                { $sort: { log_date: -1 } },
                {
                  $group: {
                    _id: "$conversation_id",
                    total_logs: { $sum: 1 },
                    last_log_date: { $first: "$log_date" },
                    last_message: { $first: "$msg" },
                    last_log_type: { $first: "$conversation_log_type_id" },
                    resource_id: { $first: "$resource_id" },
                  },
                },
              ],
              as: "log_summary",
            },
          },
          {
            $project: {
              _id: 0,
              conversationId: "$documentId",
              total_logs: {
                $ifNull: [
                  { $arrayElemAt: ["$log_summary.total_logs", 0] },
                  0,
                ],
              },
              last_log_date: {
                $arrayElemAt: ["$log_summary.last_log_date", 0],
              },
              last_message: {
                $arrayElemAt: ["$log_summary.last_message", 0],
              },
              last_log_type: {
                $arrayElemAt: ["$log_summary.last_log_type", 0],
              },
              resource_id: {
                $arrayElemAt: ["$log_summary.resource_id", 0],
              },
            },
          },
          { $sort: { conversationId: -1 } },
        ],
        as: "conversations",
      },
    },
    {
      $project: {
        _id: 0,
        personId: 1,
        first_name: `$person_data.${pk.firstName}`,
        last_name: `$person_data.${pk.lastName}`,
        email: `$person_data.${pk.email}`,
        phone: `$person_data.${pk.phone}`,
        transactions: 1,
        conversations: 1,
      },
    },
  ];
}
