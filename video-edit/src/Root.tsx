/**
 * Remotion Root — InnerPlay Demo Video
 * Each scene registered as its own composition AND as a combined sequence.
 */
import React from "react";
import { Composition, Series } from "remotion";
import { VIDEO } from "./tokens";
import { BlackRing } from "./scenes/01-BlackRing";
import { AlexText } from "./scenes/02-AlexText";
import { TitleCard } from "./scenes/03-Title";
import { Subtitle } from "./scenes/04-Subtitle";
import { PoweredBy } from "./scenes/05-PoweredBy";
import { EndCard } from "./scenes/06-EndCard";
import { Architecture } from "./scenes/07-Architecture";

const { width, height, fps } = VIDEO;

// Scene durations in seconds → frames
const S = (seconds: number) => Math.round(seconds * fps);

// Combined full demo sequence
const InnerPlayDemo: React.FC = () => (
  <Series>
    <Series.Sequence durationInFrames={S(5)}>
      <BlackRing />
    </Series.Sequence>
    <Series.Sequence durationInFrames={S(4)}>
      <AlexText />
    </Series.Sequence>
    <Series.Sequence durationInFrames={S(3)}>
      <TitleCard />
    </Series.Sequence>
    <Series.Sequence durationInFrames={S(3)}>
      <Subtitle />
    </Series.Sequence>
    <Series.Sequence durationInFrames={S(2)}>
      <PoweredBy />
    </Series.Sequence>
    <Series.Sequence durationInFrames={S(5)}>
      <EndCard />
    </Series.Sequence>
    <Series.Sequence durationInFrames={S(8)}>
      <Architecture />
    </Series.Sequence>
  </Series>
);

// Total: 5+4+3+3+2+5+8 = 30s = 900 frames
const TOTAL_FRAMES = S(5 + 4 + 3 + 3 + 2 + 5 + 8);

export const RemotionRoot: React.FC = () => (
  <>
    {/* Full combined demo */}
    <Composition
      id="InnerPlayDemo"
      component={InnerPlayDemo}
      durationInFrames={TOTAL_FRAMES}
      fps={fps}
      width={width}
      height={height}
    />

    {/* Individual scenes for isolated rendering */}
    <Composition
      id="01-BlackRing"
      component={BlackRing}
      durationInFrames={S(5)}
      fps={fps}
      width={width}
      height={height}
    />
    <Composition
      id="02-AlexText"
      component={AlexText}
      durationInFrames={S(4)}
      fps={fps}
      width={width}
      height={height}
    />
    <Composition
      id="03-Title"
      component={TitleCard}
      durationInFrames={S(3)}
      fps={fps}
      width={width}
      height={height}
    />
    <Composition
      id="04-Subtitle"
      component={Subtitle}
      durationInFrames={S(3)}
      fps={fps}
      width={width}
      height={height}
    />
    <Composition
      id="05-PoweredBy"
      component={PoweredBy}
      durationInFrames={S(2)}
      fps={fps}
      width={width}
      height={height}
    />
    <Composition
      id="06-EndCard"
      component={EndCard}
      durationInFrames={S(5)}
      fps={fps}
      width={width}
      height={height}
    />
    <Composition
      id="07-Architecture"
      component={Architecture}
      durationInFrames={S(8)}
      fps={fps}
      width={width}
      height={height}
    />
  </>
);
