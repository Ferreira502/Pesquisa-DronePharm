import { useEffect, useRef, useState, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { lerp } from "@/lib/utils";
import type { WSTelemetriaPayload } from "@/types/api";

import { useTelemetryStore } from "../store/useTelemetryStore";

const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "medium",
});
const SECTION_CLASS_NAME =
  "border-b border-[var(--surface-border)] px-5 py-[14px]";
const TITLE_CLASS_NAME =
  "mb-[10px] text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";
const WRAPPER_CLASS_NAME =
  "rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface-overlay)] p-[13px]";

type ReplaySpeed = (typeof SPEED_OPTIONS)[number];

function getSliderMax(history: WSTelemetriaPayload[]): number {
  return Math.max(history.length - 1, 0);
}

function getFrameTimestamp(frame: WSTelemetriaPayload): number {
  return Date.parse(frame.criado_em);
}

function getFrameByIndex(
  history: WSTelemetriaPayload[],
  index: number,
): WSTelemetriaPayload | null {
  if (history.length === 0) {
    return null;
  }

  const clampedIndex = Math.min(Math.max(index, 0), getSliderMax(history));

  return history[clampedIndex];
}

function formatFrameTimestamp(frame: WSTelemetriaPayload | null): string {
  if (frame === null) {
    return "--";
  }

  return DATE_TIME_FORMATTER.format(getFrameTimestamp(frame));
}

function getCurrentTimestamp(): number {
  return window.performance.timeOrigin + window.performance.now();
}

function buildInterpolatedFrame(
  currentFrame: WSTelemetriaPayload,
  nextFrame: WSTelemetriaPayload,
  replayTimestamp: number,
): WSTelemetriaPayload {
  const currentTimestamp = getFrameTimestamp(currentFrame);
  const nextTimestamp = getFrameTimestamp(nextFrame);
  const duration = Math.max(nextTimestamp - currentTimestamp, 1);
  const progress = Math.min(
    Math.max((replayTimestamp - currentTimestamp) / duration, 0),
    1,
  );

  return {
    ...currentFrame,
    latitude: lerp(currentFrame.latitude, nextFrame.latitude, progress),
    longitude: lerp(currentFrame.longitude, nextFrame.longitude, progress),
    altitude_m: lerp(currentFrame.altitude_m, nextFrame.altitude_m, progress),
    velocidade_ms: lerp(
      currentFrame.velocidade_ms,
      nextFrame.velocidade_ms,
      progress,
    ),
    criado_em: new Date(replayTimestamp).toISOString(),
  };
}

export function ReplayTimeline(): ReactElement {
  const selectedDroneId = useTelemetryStore((state) => state.selectedDroneId);
  const history = useTelemetryStore((state) => state.getHistory(selectedDroneId));
  const isReplaying = useTelemetryStore((state) => state.isReplaying);
  const setReplaying = useTelemetryStore((state) => state.setReplaying);
  const setFrame = useTelemetryStore((state) => state.setFrame);
  const [sliderValue, setSliderValue] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<ReplaySpeed>(1);
  const intervalIdRef = useRef<number | null>(null);
  const currentIndexRef = useRef(0);
  const replayOffsetRef = useRef<number | null>(null);

  function clearReplayInterval(): void {
    if (intervalIdRef.current === null) {
      return;
    }

    window.clearInterval(intervalIdRef.current);
    intervalIdRef.current = null;
  }

  function syncFrame(index: number): void {
    const nextFrame = getFrameByIndex(history, index);

    if (nextFrame === null) {
      return;
    }

    currentIndexRef.current = index;
    setSliderValue(index);
    setFrame(selectedDroneId, nextFrame);
  }

  function stopReplay(): void {
    clearReplayInterval();
    setReplaying(false);
  }

  function tickReplay(): void {
    if (history.length < 2 || replayOffsetRef.current === null) {
      stopReplay();
      return;
    }

    const replayTimestamp = getCurrentTimestamp() - replayOffsetRef.current;
    const lastIndex = getSliderMax(history);
    const lastFrame = history[lastIndex];

    if (replayTimestamp >= getFrameTimestamp(lastFrame)) {
      syncFrame(lastIndex);
      stopReplay();
      return;
    }

    let segmentIndex = currentIndexRef.current;

    while (
      segmentIndex < lastIndex - 1 &&
      replayTimestamp >= getFrameTimestamp(history[segmentIndex + 1])
    ) {
      segmentIndex += 1;
    }

    const currentFrame = history[segmentIndex];
    const nextFrame = history[segmentIndex + 1];

    currentIndexRef.current = segmentIndex;
    setSliderValue(segmentIndex);
    setFrame(
      selectedDroneId,
      buildInterpolatedFrame(currentFrame, nextFrame, replayTimestamp),
    );
  }

  function startReplay(): void {
    clearReplayInterval();
    intervalIdRef.current = window.setInterval(tickReplay, 1000 / playbackSpeed);
  }

  function handleReplayToggle(checked: boolean): void {
    if (!checked || history.length < 2) {
      stopReplay();
      return;
    }

    const startFrame = getFrameByIndex(history, currentIndexRef.current);

    if (startFrame === null) {
      stopReplay();
      return;
    }

    replayOffsetRef.current = getCurrentTimestamp() - getFrameTimestamp(startFrame);
    setReplaying(true);
    startReplay();
  }

  function handleSliderChange(values: number[]): void {
    stopReplay();
    syncFrame(values[0] ?? 0);
  }

  function handleSpeedChange(speed: ReplaySpeed): void {
    setPlaybackSpeed(speed);

    if (isReplaying) {
      startReplay();
    }
  }

  useEffect(() => {
    const nextIndex = Math.min(currentIndexRef.current, getSliderMax(history));

    clearReplayInterval();
    setReplaying(false);
    currentIndexRef.current = nextIndex;
    setSliderValue(nextIndex);
  }, [history, setReplaying]);

  useEffect(() => {
    return () => {
      clearReplayInterval();
    };
  }, []);

  const currentTimelineFrame = getFrameByIndex(history, sliderValue);

  return (
    <section className={SECTION_CLASS_NAME} aria-label="Replay de telemetria">
      <div className={TITLE_CLASS_NAME}>Replay de Telemetria</div>
      <div className={WRAPPER_CLASS_NAME}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <label
            htmlFor="replay-toggle"
            className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
          >
            <Switch
              id="replay-toggle"
              checked={isReplaying}
              disabled={history.length < 2}
              onCheckedChange={handleReplayToggle}
            />
            Modo Replay ativo
          </label>

          <div className="flex gap-1">
            {SPEED_OPTIONS.map((speed) => (
              <Button
                key={speed}
                type="button"
                size="sm"
                variant={playbackSpeed === speed ? "default" : "outline"}
                onClick={() => handleSpeedChange(speed)}
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>

        <Slider
          aria-label="Linha do tempo do replay"
          value={[sliderValue]}
          min={0}
          max={getSliderMax(history)}
          step={1}
          disabled={history.length === 0}
          onValueChange={handleSliderChange}
        />

        <div className="mt-2 text-right font-mono text-xs tabular-nums text-[var(--text-muted)]">
          {formatFrameTimestamp(currentTimelineFrame)}
        </div>
      </div>
    </section>
  );
}