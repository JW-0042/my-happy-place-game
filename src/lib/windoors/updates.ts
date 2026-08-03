/**
 * Windoors Update catalog — styled after current Windows 11 naming:
 *   "YYYY-MM Security Update (KBxxxxxxx) (build)"
 * User-facing month tag uses MM-YYYY (e.g. 08-2026) for August 2026.
 */

export type UpdatePackage = {
  id: string;
  /** Full display title */
  title: string;
  size: string;
  kind: "security" | "preview" | "feature" | "stack" | "dotnet" | "defender";
};

export type UpdateScenario = {
  id: string;
  /** Short label for the install banner */
  headline: string;
  /** Total size shown in header */
  totalSize: string;
  packages: UpdatePackage[];
};

const MONTH_TAG = "08-2026";
const FEATURE = "26H2";
const BUILD_BASE = 26200;

/** Six distinct install scenarios (picked at random per check). */
export const UPDATE_SCENARIOS: UpdateScenario[] = [
  {
    id: "patch-tuesday",
    headline: `${MONTH_TAG} Security Update · Patch Tuesday`,
    totalSize: "1.8 GB",
    packages: [
      {
        id: "sec-main",
        title: `${MONTH_TAG} Security Update (KB5078123) (${BUILD_BASE}.7201)`,
        size: "892 MB",
        kind: "security",
      },
      {
        id: "sec-ssu",
        title: `${MONTH_TAG} Servicing Stack Update (KB5078012) (${BUILD_BASE}.1)`,
        size: "24 MB",
        kind: "stack",
      },
      {
        id: "sec-net",
        title: `${MONTH_TAG} Security Update for .NET Framework 4.8.1 (KB5078456)`,
        size: "68 MB",
        kind: "dotnet",
      },
      {
        id: "sec-def",
        title: `${MONTH_TAG} Definition Update for Windoors Security (KB2267602)`,
        size: "412 MB",
        kind: "defender",
      },
    ],
  },
  {
    id: "preview-c",
    headline: `${MONTH_TAG} Preview Update · optional quality`,
    totalSize: "1.2 GB",
    packages: [
      {
        id: "prev-main",
        title: `${MONTH_TAG} Preview Update (KB5078901) (${BUILD_BASE}.7310)`,
        size: "1.0 GB",
        kind: "preview",
      },
      {
        id: "prev-ssu",
        title: `${MONTH_TAG} Servicing Stack Update (KB5078910)`,
        size: "19 MB",
        kind: "stack",
      },
      {
        id: "prev-def",
        title: `${MONTH_TAG} Definition Update for Windoors Security (KB2267602)`,
        size: "198 MB",
        kind: "defender",
      },
    ],
  },
  {
    id: "feature-26h2",
    headline: `Windoors 11 ${FEATURE} · feature enablement`,
    totalSize: "3.4 GB",
    packages: [
      {
        id: "feat-eub",
        title: `${MONTH_TAG} Feature Update to Windoors 11, version ${FEATURE} (KB5079200)`,
        size: "2.1 GB",
        kind: "feature",
      },
      {
        id: "feat-dyn",
        title: `${MONTH_TAG} Dynamic Update for Windoors 11 ${FEATURE} (KB5079215)`,
        size: "640 MB",
        kind: "feature",
      },
      {
        id: "feat-sec",
        title: `${MONTH_TAG} Security Update (KB5078123) (${BUILD_BASE}.7201)`,
        size: "520 MB",
        kind: "security",
      },
      {
        id: "feat-def",
        title: `${MONTH_TAG} Definition Update for Windoors Security (KB2267602)`,
        size: "180 MB",
        kind: "defender",
      },
    ],
  },
  {
    id: "dotnet-heavy",
    headline: `${MONTH_TAG} .NET + runtime stack`,
    totalSize: "640 MB",
    packages: [
      {
        id: "net-48",
        title: `${MONTH_TAG} Security Update for .NET Framework 3.5 and 4.8.1 (KB5078456)`,
        size: "112 MB",
        kind: "dotnet",
      },
      {
        id: "net-8",
        title: `${MONTH_TAG} Security Update for .NET 8.0 (KB5078601)`,
        size: "98 MB",
        kind: "dotnet",
      },
      {
        id: "net-ssu",
        title: `${MONTH_TAG} Servicing Stack Update (KB5078012)`,
        size: "22 MB",
        kind: "stack",
      },
      {
        id: "net-sec",
        title: `${MONTH_TAG} Security Update (KB5078123) (${BUILD_BASE}.7201)`,
        size: "408 MB",
        kind: "security",
      },
    ],
  },
  {
    id: "defender-defs",
    headline: `${MONTH_TAG} Security intelligence · definitions`,
    totalSize: "485 MB",
    packages: [
      {
        id: "def-intel",
        title: `${MONTH_TAG} Definition Update for Windoors Security — intelligence (KB2267602)`,
        size: "312 MB",
        kind: "defender",
      },
      {
        id: "def-plat",
        title: `${MONTH_TAG} Windoors Security platform update (KB5078700)`,
        size: "96 MB",
        kind: "defender",
      },
      {
        id: "def-engine",
        title: `${MONTH_TAG} Antimalware Engine Update (1.423.1200.0)`,
        size: "41 MB",
        kind: "defender",
      },
      {
        id: "def-ssu",
        title: `${MONTH_TAG} Servicing Stack Update (KB5078012)`,
        size: "18 MB",
        kind: "stack",
      },
    ],
  },
  {
    id: "out-of-band",
    headline: `${MONTH_TAG} Out-of-band security · critical`,
    totalSize: "1.1 GB",
    packages: [
      {
        id: "oob-sec",
        title: `${MONTH_TAG} Security Update — out-of-band (KB5079501) (${BUILD_BASE}.7255)`,
        size: "756 MB",
        kind: "security",
      },
      {
        id: "oob-safe",
        title: `${MONTH_TAG} Safe OS Dynamic Update (KB5079510)`,
        size: "210 MB",
        kind: "feature",
      },
      {
        id: "oob-def",
        title: `${MONTH_TAG} Definition Update for Windoors Security (KB2267602)`,
        size: "134 MB",
        kind: "defender",
      },
    ],
  },
];

export function pickUpdateScenario(excludeId?: string | null): UpdateScenario {
  const pool =
    excludeId != null
      ? UPDATE_SCENARIOS.filter((s) => s.id !== excludeId)
      : UPDATE_SCENARIOS;
  const list = pool.length > 0 ? pool : UPDATE_SCENARIOS;
  return list[Math.floor(Math.random() * list.length)]!;
}

export function kindLabel(kind: UpdatePackage["kind"]): string {
  switch (kind) {
    case "security":
      return "Security";
    case "preview":
      return "Preview";
    case "feature":
      return "Feature";
    case "stack":
      return "SSU";
    case "dotnet":
      return ".NET";
    case "defender":
      return "Defs";
  }
}
