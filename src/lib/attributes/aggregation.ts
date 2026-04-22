import { getAttributeCollectionName } from "@/lib/mongodb";

/**
 * Enriches each attribute with resolved parent and dataType attribute names.
 * Run against the `attribute` collection (self-referential lookups).
 *
 * Paste this array into MongoDB Compass or mongosh:
 * db.attribute.aggregate([...])
 */
export function attributeEnrichmentPipeline(): object[] {
  const coll = getAttributeCollectionName();
  return [
    {
      $lookup: {
        from: coll,
        localField: "parentId",
        foreignField: "_id",
        as: "parentAttr",
      },
    },
    {
      $lookup: {
        from: coll,
        localField: "dataType",
        foreignField: "_id",
        as: "dataTypeAttr",
      },
    },
    {
      $addFields: {
        parentName: {
          $ifNull: [{ $arrayElemAt: ["$parentAttr.attribute", 0] }, null],
        },
        dataTypeName: {
          $ifNull: [{ $arrayElemAt: ["$dataTypeAttr.attribute", 0] }, null],
        },
      },
    },
    {
      $project: {
        parentAttr: 0,
        dataTypeAttr: 0,
      },
    },
  ];
}
