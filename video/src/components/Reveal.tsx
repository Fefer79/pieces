import React from "react";
import { useCurrentFrame } from "remotion";
import { reveal } from "../theme";

/** Apparition : fondu + glissement. `from` = direction d'origine. */
export const Reveal: React.FC<{
  delay?: number;
  dur?: number;
  from?: "bottom" | "right" | "left" | "none";
  dist?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ delay = 0, dur = 22, from = "bottom", dist = 36, style, children }) => {
  const frame = useCurrentFrame();
  const p = reveal(frame, delay, dur);
  const off = (1 - p) * dist;
  const t =
    from === "bottom" ? `0px ${off}px` : from === "right" ? `${off}px 0px` : from === "left" ? `${-off}px 0px` : "0px 0px";
  return (
    <div style={{ opacity: p, translate: t, ...style }}>{children}</div>
  );
};
