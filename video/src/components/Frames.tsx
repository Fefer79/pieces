import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, F, shadowLg } from "../theme";

/** Fenêtre de navigateur desktop (capture 2880×1800). */
export const DesktopFrame: React.FC<{
  src: string;
  url: string;
  width: number;
  zoomFrom?: number;
  zoomTo?: number;
  originY?: string;
  style?: React.CSSProperties;
}> = ({ src, url, width, zoomFrom = 1, zoomTo = 1.07, originY = "0%", style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const k = width / 1280;
  const bar = 44 * k;
  const zoom = interpolate(frame, [0, durationInFrames], [zoomFrom, zoomTo], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width,
        borderRadius: 16 * k,
        overflow: "hidden",
        background: C.card,
        boxShadow: shadowLg,
        border: `${Math.max(1, k)}px solid rgba(0,17,58,0.12)`,
        ...style,
      }}
    >
      <div
        style={{
          height: bar,
          background: "#F1F1EF",
          display: "flex",
          alignItems: "center",
          padding: `0 ${16 * k}px`,
          gap: 8 * k,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 11 * k, height: 11 * k, borderRadius: "50%", background: "#D4D4D2" }} />
        ))}
        <div
          style={{
            marginLeft: 16 * k,
            flex: 1,
            maxWidth: 420 * k,
            height: 26 * k,
            borderRadius: 13 * k,
            background: "#fff",
            border: `1px solid ${C.border}`,
            fontFamily: F.mono,
            fontSize: 13 * k,
            color: C.muted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ width, height: width * 0.625, overflow: "hidden", position: "relative" }}>
        <Img
          src={staticFile(`shots/${src}`)}
          style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(zoom), transformOrigin: `50% ${originY}` }}
        />
      </div>
    </div>
  );
};

/** iPhone (capture 1179×2556, viewport 393×852). */
export const PhoneFrame: React.FC<{
  src: string;
  width: number;
  zoomFrom?: number;
  zoomTo?: number;
  style?: React.CSSProperties;
}> = ({ src, width, zoomFrom = 1, zoomTo = 1.05, style }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const bezel = width * 0.034;
  const screenW = width - bezel * 2;
  const screenH = screenW * (2556 / 1179);
  const zoom = interpolate(frame, [0, durationInFrames], [zoomFrom, zoomTo], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width,
        height: screenH + bezel * 2,
        borderRadius: width * 0.16,
        background: "#0B0F1C",
        padding: bezel,
        boxShadow: `${shadowLg}, inset 0 0 0 ${width * 0.006}px #2A3042`,
        position: "relative",
        ...style,
      }}
    >
      <div style={{ width: screenW, height: screenH, borderRadius: width * 0.125, overflow: "hidden", position: "relative", background: C.surface }}>
        <Img
          src={staticFile(`shots/${src}`)}
          style={{ width: "100%", height: "100%", objectFit: "cover", scale: String(zoom), transformOrigin: "50% 0%" }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: bezel + width * 0.03,
          left: "50%",
          translate: "-50% 0",
          width: width * 0.3,
          height: width * 0.085,
          borderRadius: width,
          background: "#0B0F1C",
        }}
      />
    </div>
  );
};
