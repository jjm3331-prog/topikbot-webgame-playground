// Centralized mapping between UI route exam types and DB-constrained values.
// UI/URL values: topik1 | topik2 | eps
// DB values (enforced by check constraints): TOPIK_I | TOPIK_II | TOPIK_EPS

export type UiExamType = "topik1" | "topik2" | "eps";
export type DbExamType = "TOPIK_I" | "TOPIK_II" | "TOPIK_EPS";

export function mapExamTypeToDb(examType: string): DbExamType {
  const key = (examType || "").toLowerCase();
  switch (key) {
    case "topiki":
    case "topik_i":
    case "topik1":
      return "TOPIK_I";
    case "topikii":
    case "topik_ii":
    case "topik2":
      return "TOPIK_II";
    case "eps":
    case "topik_eps":
    case "topikeps":
      return "TOPIK_EPS";
    default:
      // Default to TOPIK_I to avoid DB constraint violations.
      return "TOPIK_I";
  }
}

export function mapExamTypeFromDb(examType: string): UiExamType {
  const key = (examType || "").toUpperCase();
  switch (key) {
    case "TOPIK_I":
      return "topik1";
    case "TOPIK_II":
      return "topik2";
    case "TOPIK_EPS":
      return "eps";
    default:
      // If DB already contains UI-like values, keep them when possible.
      const low = (examType || "").toLowerCase();
      if (low === "topik1" || low === "topik2" || low === "eps") return low as UiExamType;
      return "topik1";
  }
}
