// Entitlement abstraction. In this build we ship a mock store; a native port
// will replace this with Google Play Billing (product id pro_lifetime_unlock).
import AsyncStorage from "@react-native-async-storage/async-storage";

export type EntitlementState =
  | "FREE"
  | "PRO_CONFIRMED"
  | "PRO_CACHED"
  | "PURCHASE_PENDING"
  | "BILLING_UNAVAILABLE";

const KEY = "memoraq.entitlement.v1";

export const FREE_CUSTOMER_LIMIT = 5;
export const FREE_RESCUE_PACK_LIMIT = 1;

export async function getEntitlement(): Promise<EntitlementState> {
  const v = (await AsyncStorage.getItem(KEY)) as EntitlementState | null;
  return v ?? "FREE";
}
export async function setEntitlement(e: EntitlementState) {
  await AsyncStorage.setItem(KEY, e);
}
export async function isPro(): Promise<boolean> {
  const e = await getEntitlement();
  return e === "PRO_CONFIRMED" || e === "PRO_CACHED";
}
