import type { AppKey } from "@/lib/windoors/config";
import type { UpdatePackage } from "@/lib/windoors/updates";

export type UpdateUiPhase = "needs-check" | "checking" | "ready" | "installing" | "up-to-date";

export type WindowState = {
  id: string;
  appKey: AppKey;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  closing: boolean;
  running: boolean;
  complete: boolean;
  progress: number;
  phase: string;
  etaMin: number;
  logLines: string[];
  drivers: { name: string; status: string }[];
  defragSeed: number;
  chkdskDrive: "A:" | "C:" | "D:";
  chkdskTest: "standard" | "thorough";
  chkdskAutoFix: boolean;
  needsUpdateFirst: boolean;
  updateUi: UpdateUiPhase;
  updateScenarioId: string | null;
  updateHeadline: string;
  updateTotalSize: string;
  updatePackages: UpdatePackage[];
  updateActivePkg: number;
};

export type Toast = {
  id: string;
  kind: "task" | "welcome" | "info" | "success";
  appKey?: AppKey;
  title: string;
  body?: string;
  leaving?: boolean;
};

export type DrainLevel = 1 | 2 | 3;
