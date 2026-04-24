/**
 * Data stored in the signed session cookie after a successful login.
 * Mirrors the other app's session fields (resourceId, securityId, langId).
 */
export type AppSession = {
  resourceId?: string;
  securityId?: string;
  langId?: string;
};
