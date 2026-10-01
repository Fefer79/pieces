import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, F, enter, nbsp, reveal, shadowLg } from "../theme";

export type ReceiptLine = { label: string; value: number };

/** Composant signature « Reçu » : en-tête navy, dotted leaders, total DM Mono, sceau séquestre. */
export const Receipt: React.FC<{
  eyebrow: string;
  title: string;
  lines: ReceiptLine[];
  totalLabel: string;
  seal: string;
  width: number;
  delay?: number;
}> = ({ eyebrow, title, lines, totalLabel, seal, width, delay = 0 }) => {
  const frame = useCurrentFrame();
  const k = width / 640;
  const total = lines.reduce((s, l) => s + l.value, 0);
  const totalStart = delay + 18 + lines.length * 12 + 6;
  const count = interpolate(frame, [totalStart, totalStart + 30], [0, total], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: enter,
  });
  const sealP = reveal(frame, totalStart + 28, 18);
  return (
    <div style={{ width, borderRadius: 24 * k, overflow: "hidden", background: C.card, boxShadow: shadowLg, fontFamily: F.body }}>
      <div style={{ background: C.ink, padding: `${26 * k}px ${34 * k}px` }}>
        <div style={{ fontFamily: F.mono, fontSize: 15 * k, letterSpacing: "0.1em", color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>
          {eyebrow}
        </div>
        <div style={{ fontFamily: F.display, fontSize: 38 * k, color: "#fff", marginTop: 6 * k, lineHeight: 1.12 }}>{title}</div>
      </div>
      <div style={{ padding: `${24 * k}px ${34 * k}px ${30 * k}px` }}>
        {lines.map((l, i) => {
          const p = reveal(frame, delay + 18 + i * 12, 16);
          return (
            <div
              key={l.label}
              style={{ display: "flex", alignItems: "baseline", gap: 12 * k, padding: `${11 * k}px 0`, opacity: p, translate: `0px ${(1 - p) * 14}px`, fontSize: 25 * k, color: C.ink }}
            >
              <span>{l.label}</span>
              <span style={{ flex: 1, borderBottom: `${2 * k}px dotted ${C.borderStrong}`, translate: `0 ${-5 * k}px` }} />
              <span style={{ fontFamily: F.mono, fontSize: 26 * k }}>{nbsp(l.value)}</span>
            </div>
          );
        })}
        <div style={{ height: 3 * k, background: C.ink, margin: `${14 * k}px 0` }} />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", color: C.ink }}>
          <span style={{ fontWeight: 700, fontSize: 27 * k }}>{totalLabel}</span>
          <span style={{ fontFamily: F.mono, fontSize: 46 * k }}>{nbsp(Math.round(count))} FCFA</span>
        </div>
        <div
          style={{
            marginTop: 20 * k,
            padding: `${14 * k}px ${18 * k}px`,
            borderRadius: 10 * k,
            background: C.neufBg,
            color: C.neufFg,
            fontWeight: 600,
            fontSize: 21 * k,
            whiteSpace: "nowrap",
            opacity: sealP,
            translate: `0px ${(1 - sealP) * 10}px`,
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 12 * k }}>
            <svg width={26 * k} height={26 * k} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
              <path d="M8.5 12.2l2.5 2.5 4.5-5" />
            </svg>
            {seal}
          </span>
        </div>
      </div>
    </div>
  );
};
