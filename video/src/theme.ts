import { Easing, interpolate } from "remotion";
import { loadFont as loadGloock } from "@remotion/google-fonts/Gloock";
import { loadFont as loadInstrument } from "@remotion/google-fonts/InstrumentSans";
import { loadFont as loadDmMono } from "@remotion/google-fonts/DMMono";

// Tokens issus de DESIGN.md / globals.css (@theme)
export const C = {
  ink: "#00113A",
  ink2: "#002366",
  accent: "#FF6B00",
  surface: "#FAFAF9",
  card: "#FFFFFF",
  border: "#E8E8E8",
  borderStrong: "#D4D4D2",
  muted: "#6B6B6B",
  neufBg: "#E6F2EC",
  neufFg: "#1E6F4C",
  occasionBg: "#E4ECF5",
  occasionFg: "#2D5A8A",
  reusineBg: "#FFF0E0",
  reusineFg: "#B85200",
  aftermarketBg: "#F3EAF7",
  aftermarketFg: "#6B3E8F",
  oemBg: "rgba(0,35,102,0.08)",
  oemFg: "#002366",
  errorBg: "#FBE8E5",
  errorFg: "#B42318",
};

export const F = {
  display: loadGloock().fontFamily,
  body: loadInstrument("normal", { weights: ["400", "500", "600", "700"] }).fontFamily,
  mono: loadDmMono("normal", { weights: ["400"] }).fontFamily,
};

export const shadowMd = "0 4px 14px rgba(0,17,58,0.10), 0 1px 2px rgba(0,17,58,0.06)";
export const shadowLg = "0 30px 80px rgba(0,17,58,0.28), 0 6px 18px rgba(0,17,58,0.14)";

export const enter = Easing.bezier(0.22, 0.61, 0.36, 1);

/** Progression 0→1 avec l'easing « enter » du design system. */
export const reveal = (frame: number, delay: number, dur = 20) =>
  interpolate(frame, [delay, delay + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: enter,
  });

export const nbsp = (n: number) => n.toLocaleString("fr-FR").replace(/[  ]/g, " ");
