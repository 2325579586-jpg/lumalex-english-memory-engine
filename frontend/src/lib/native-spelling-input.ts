import type { InputHTMLAttributes } from "react";

export const nativeSpellingInputProps = {
  type: "text",
  inputMode: "text",
  lang: "en",
  autoCapitalize: "none",
  autoCorrect: "off",
  autoComplete: "off",
  spellCheck: false,
  enterKeyHint: "done",
} satisfies InputHTMLAttributes<HTMLInputElement>;

export function focusNativeSpellingInput(input: HTMLInputElement | null) {
  if (!input) return;
  window.requestAnimationFrame(() => {
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  });
}
