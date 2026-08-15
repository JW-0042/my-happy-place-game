import { pickUpdateScenario, type UpdateScenario } from "@/lib/windoors/updates";
import type { WindowState } from "@/lib/windoors/types";

export function emptyUpdateFields(forceCheck: boolean): Pick<
  WindowState,
  | "updateUi"
  | "updateScenarioId"
  | "updateHeadline"
  | "updateTotalSize"
  | "updatePackages"
  | "updateActivePkg"
> {
  if (forceCheck) {
    return {
      updateUi: "needs-check",
      updateScenarioId: null,
      updateHeadline: "",
      updateTotalSize: "—",
      updatePackages: [],
      updateActivePkg: -1,
    };
  }
  const scenario = pickUpdateScenario();
  return {
    updateUi: "ready",
    updateScenarioId: scenario.id,
    updateHeadline: scenario.headline,
    updateTotalSize: scenario.totalSize,
    updatePackages: scenario.packages,
    updateActivePkg: -1,
  };
}

export function applyScenario(
  scenario: UpdateScenario,
): Pick<
  WindowState,
  | "updateUi"
  | "updateScenarioId"
  | "updateHeadline"
  | "updateTotalSize"
  | "updatePackages"
  | "updateActivePkg"
  | "phase"
> {
  return {
    updateUi: "ready",
    updateScenarioId: scenario.id,
    updateHeadline: scenario.headline,
    updateTotalSize: scenario.totalSize,
    updatePackages: scenario.packages,
    updateActivePkg: -1,
    phase: "Updates available",
  };
}
