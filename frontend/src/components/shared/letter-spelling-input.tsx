import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { focusNativeSpellingInput, nativeSpellingInputProps } from "@/lib/native-spelling-input";
import { cn } from "@/lib/utils";

type LetterSpellingInputProps = {
  target: string;
  value: string;
  disabled?: boolean;
  status?: "idle" | "error" | "success";
  autoFocusKey?: string | number;
  onChange: (value: string) => void;
  onComplete: (value: string) => void;
  onClear?: () => void;
};

function getTargetLetters(value: string) {
  return (value.match(/[A-Za-z]/g) || []).join("").toLowerCase();
}

function getInputLetter(value: string) {
  return (value.match(/[A-Za-z]/g) || [])[0]?.toLowerCase() || "";
}

export function LetterSpellingInput({
  target,
  value,
  disabled = false,
  status = "idle",
  autoFocusKey,
  onChange,
  onComplete,
  onClear,
}: LetterSpellingInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const targetLetters = useMemo(() => getTargetLetters(target), [target]);
  const targetLength = Math.max(targetLetters.length, 1);
  const normalizedValue = value.slice(0, targetLength).toLowerCase();
  const activeIndex = Math.min(normalizedValue.length, targetLength - 1);

  useEffect(() => {
    if (disabled) return;
    window.setTimeout(() => focusNativeSpellingInput(inputRef.current), 0);
  }, [autoFocusKey, disabled]);

  const focusInput = () => {
    if (!disabled) focusNativeSpellingInput(inputRef.current);
  };

  const pushLetter = (letter: string) => {
    if (disabled || !letter || normalizedValue.length >= targetLength) return;
    const nextValue = `${normalizedValue}${letter}`.slice(0, targetLength);
    onChange(nextValue);
    if (nextValue.length === targetLength) {
      window.setTimeout(() => onComplete(nextValue), 0);
    }
  };

  const deleteLetter = () => {
    if (disabled || !normalizedValue.length) return;
    onChange(normalizedValue.slice(0, -1));
  };

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          "relative w-full rounded-2xl border border-border/70 bg-panel/60 p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4",
          status === "error" && "border-destructive/55 bg-destructive/10",
          status === "success" && "border-success/45 bg-success/10",
          disabled && "cursor-default opacity-75",
        )}
        onClick={focusInput}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            focusInput();
          }
        }}
        aria-label="拼写输入区域"
      >
        <input
          {...nativeSpellingInputProps}
          ref={inputRef}
          value=""
          maxLength={1}
          aria-label="输入下一个英文字母"
          className="absolute left-3 top-3 h-px w-px opacity-0"
          disabled={disabled}
          onBeforeInput={(event) => {
            const data = "data" in event.nativeEvent ? String(event.nativeEvent.data || "") : "";
            if (data && !/^[A-Za-z]$/.test(data)) {
              event.preventDefault();
            }
          }}
          onChange={(event) => {
            const letter = getInputLetter(event.currentTarget.value);
            event.currentTarget.value = "";
            pushLetter(letter);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              deleteLetter();
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              if (normalizedValue.length === targetLength) onComplete(normalizedValue);
              return;
            }
            if (event.key.length === 1 && !/^[A-Za-z]$/.test(event.key)) {
              event.preventDefault();
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            pushLetter(getInputLetter(event.clipboardData.getData("text")));
          }}
        />
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${targetLength}, minmax(0, 1fr))` }}>
          {Array.from({ length: targetLength }, (_, index) => {
            const letter = normalizedValue[index] || "";
            const isActive = index === activeIndex && !disabled && status !== "success";
            return (
              <span
                key={`${target}-${index}`}
                className={cn(
                  "flex aspect-square min-h-10 items-center justify-center rounded-xl border border-border/70 bg-background/50 text-lg font-semibold uppercase tracking-normal text-foreground transition sm:min-h-12 sm:text-xl",
                  letter && "border-primary/45 bg-primary/10",
                  isActive && "border-primary bg-primary/15 shadow-[0_0_0_2px_rgba(69,112,255,0.16)]",
                  status === "error" && "border-destructive/55 bg-destructive/10",
                  status === "success" && letter && "border-success/50 bg-success/10",
                )}
              >
                {letter}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {normalizedValue.length}/{targetLength}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 rounded-lg px-3"
          disabled={disabled || !normalizedValue.length}
          onClick={() => {
            onClear?.();
            focusInput();
          }}
        >
          清空
        </Button>
      </div>
    </div>
  );
}
