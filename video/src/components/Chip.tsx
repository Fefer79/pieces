import React from "react";
import { C, F } from "../theme";

export type ChipKind = "neuf" | "occasion" | "reusine" | "aftermarket" | "oem" | "import" | "ok" | "err";
const MAP: Record<ChipKind, [string, string]> = {
  neuf: [C.neufBg, C.neufFg],
  occasion: [C.occasionBg, C.occasionFg],
  reusine: [C.reusineBg, C.reusineFg],
  aftermarket: [C.aftermarketBg, C.aftermarketFg],
  oem: [C.oemBg, C.oemFg],
  import: ["#DFF1F0", "#0F5F5C"],
  ok: [C.neufBg, C.neufFg],
  err: [C.errorBg, C.errorFg],
};

/** Chip condition (cf. components/ui/chip.tsx) : rounded-full, dot, uppercase. */
export const Chip: React.FC<{ kind: ChipKind; children: React.ReactNode; size?: number }> = ({ kind, children, size = 26 }) => {
  const [bg, fg] = MAP[kind];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.3,
        padding: `${size * 0.4}px ${size * 0.9}px`,
        borderRadius: 9999,
        background: bg,
        color: fg,
        fontFamily: F.body,
        fontWeight: 600,
        fontSize: size,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
      }}
    >
      <span style={{ width: size * 0.26, height: size * 0.26, borderRadius: "50%", background: "currentColor" }} />
      {children}
    </span>
  );
};
