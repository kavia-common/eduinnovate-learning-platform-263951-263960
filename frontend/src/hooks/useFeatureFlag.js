/**
 * useFeatureFlag - simple hook to query feature flags parsed from environment
 * PUBLIC_INTERFACE
 * @param {string} flagName - The name of the feature flag to check.
 * @param {boolean} [defaultValue=false] - Fallback if the flag is not found.
 * @returns {boolean} Whether the feature is enabled.
 */
import { useMemo } from "react";
import { config } from "../config/config";

export function useFeatureFlag(flagName, defaultValue = false) {
  return useMemo(() => {
    if (!flagName || typeof flagName !== "string") return Boolean(defaultValue);
    const key = flagName.trim();
    if (!key) return Boolean(defaultValue);
    const enabled = Object.prototype.hasOwnProperty.call(config.FEATURES, key)
      ? Boolean(config.FEATURES[key])
      : Boolean(defaultValue);
    return enabled;
  }, [flagName, defaultValue]);
}
