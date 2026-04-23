import { ObjectId } from "mongodb";

export type PeoplePipelineConfig = {
  personAttrIds: [ObjectId, ObjectId, ObjectId, ObjectId];
  personAttrKeys: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  transactionAttrIds: {
    personRef: ObjectId;
    orderNumber: ObjectId;
    shopifyOrderId: ObjectId;
  };
  transactionAttrKeys: {
    orderNumber: string;
    shopifyOrderId: string;
  };
  conversationAttrIds: {
    personRef: ObjectId;
  };
};

function oid(envKey: string, fallbackHex: string): ObjectId {
  const v = (process.env[envKey]?.trim() || fallbackHex).toLowerCase();
  if (!ObjectId.isValid(v)) {
    throw new Error(`Invalid or missing ObjectId: ${envKey} (value: ${v})`);
  }
  return new ObjectId(v);
}

/** Defaults match your Compass pipeline; override via env. */
export function getPeoplePipelineConfig(): PeoplePipelineConfig {
  const firstName = oid("PERSON_ATTR_FIRST_NAME", "6909d92ac816ac1c36e43a99");
  const lastName = oid("PERSON_ATTR_LAST_NAME", "6909d93ec816ac1c36e43a9c");
  const email = oid("PERSON_ATTR_EMAIL", "6909d95ec816ac1c36e43a9f");
  const phone = oid("PERSON_ATTR_PHONE", "6909d974c816ac1c36e43aa2");

  const personRef = oid("TX_ATTR_PERSON_REF", "69790c9562c6e7ffe8ca2dae");
  const orderNumber = oid("TX_ATTR_ORDER_NUMBER", "69790ca962c6e7ffe8ca2db2");
  const shopifyOrderId = oid("TX_ATTR_SHOPIFY_ORDER_ID", "69790cbd62c6e7ffe8ca2db6");

  const convPersonRef = oid("CONV_ATTR_PERSON_REF", "690ca2b0470a849591056ba9");

  return {
    personAttrIds: [firstName, lastName, email, phone],
    personAttrKeys: {
      firstName: firstName.toHexString(),
      lastName: lastName.toHexString(),
      email: email.toHexString(),
      phone: phone.toHexString(),
    },
    transactionAttrIds: {
      personRef: personRef,
      orderNumber,
      shopifyOrderId,
    },
    transactionAttrKeys: {
      orderNumber: orderNumber.toHexString(),
      shopifyOrderId: shopifyOrderId.toHexString(),
    },
    conversationAttrIds: {
      personRef: convPersonRef,
    },
  };
}
