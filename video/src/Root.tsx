import React from "react";
import { Composition } from "remotion";
import { PiecesVideo } from "./Video";

export const RemotionRoot: React.FC = () => (
  <Composition id="PiecesVideo" component={PiecesVideo} durationInFrames={1395} fps={30} width={1920} height={1080} />
);
