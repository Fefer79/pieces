import React from "react";
import { C, F } from "../theme";

export const Logo: React.FC<{ size: number; dark?: boolean }> = ({ size, dark = false }) => (
  <span style={{ fontFamily: F.display, fontSize: size, letterSpacing: "-0.015em", color: dark ? "#fff" : C.ink, lineHeight: 1, whiteSpace: "nowrap" }}>
    Pièces
    {/* point orange = ponctuation finale, posé sur la ligne de base */}
    <span style={{ display: "inline-block", width: size * 0.125, height: size * 0.125, borderRadius: "50%", background: C.accent, marginLeft: size * 0.03 }} />
  </span>
);

export const Eyebrow: React.FC<{ children: React.ReactNode; dark?: boolean; accent?: boolean }> = ({ children, dark, accent }) => (
  <div
    style={{
      fontFamily: F.mono,
      fontSize: 26,
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      color: accent ? C.accent : dark ? "rgba(255,255,255,0.7)" : C.ink2,
    }}
  >
    {children}
  </div>
);

export const Headline: React.FC<{ children: React.ReactNode; dark?: boolean; size?: number; style?: React.CSSProperties }> = ({ children, dark, size = 100, style }) => (
  <div style={{ fontFamily: F.display, fontSize: size, lineHeight: 1.08, letterSpacing: "-0.01em", color: dark ? "#fff" : C.ink, ...style }}>{children}</div>
);

/** Puce flèche orange (arrow bullets du design system). */
export const Bullet: React.FC<{ children: React.ReactNode; dark?: boolean; size?: number }> = ({ children, dark, size = 38 }) => (
  <div style={{ display: "flex", gap: 20, fontFamily: F.body, fontSize: size, lineHeight: 1.3, color: dark ? "rgba(255,255,255,0.92)" : C.ink }}>
    <span style={{ color: C.accent, fontWeight: 700 }}>→</span>
    <span>{children}</span>
  </div>
);

export const Sub: React.FC<{ children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }> = ({ children, dark, style }) => (
  <div style={{ fontFamily: F.body, fontSize: 42, lineHeight: 1.35, color: dark ? "rgba(255,255,255,0.78)" : C.muted, ...style }}>{children}</div>
);
