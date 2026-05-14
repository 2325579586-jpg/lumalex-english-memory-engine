import type { WordItem } from "@/types/domain";

let sharedAudio: HTMLAudioElement | null = null;

function getDictionaryAudioUrl(term: string, preferredAccent: "uk" | "us") {
  const type = preferredAccent === "uk" ? "1" : "2";
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(term.trim())}&type=${type}`;
}

function getSpeechSynthesis() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

function getBestVoice(lang: string) {
  const synth = getSpeechSynthesis();
  if (!synth) return undefined;
  const voices = synth.getVoices();
  return voices.find((voice) => voice.lang === lang) || voices.find((voice) => voice.lang.startsWith("en"));
}

function speakWithBrowser(text: string, preferredAccent: "uk" | "us") {
  const synth = getSpeechSynthesis();
  if (!synth || !text.trim()) return false;

  const lang = preferredAccent === "uk" ? "en-GB" : "en-US";
  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.lang = lang;
  utterance.rate = 0.92;

  const voice = getBestVoice(lang);
  if (voice) utterance.voice = voice;

  synth.cancel();
  synth.resume();

  window.setTimeout(() => {
    synth.speak(utterance);
  }, 40);

  return true;
}

export async function playTextPronunciation(text: string, preferredAccent: "uk" | "us") {
  return speakWithBrowser(text, preferredAccent);
}

export function warmPronunciationVoices() {
  const synth = getSpeechSynthesis();
  if (!synth) return;
  synth.getVoices();
}

export async function playPronunciation(word: Pick<WordItem, "term" | "pronunciationUk" | "pronunciationUs">, preferredAccent: "uk" | "us") {
  const audioUrl = preferredAccent === "uk" ? word.pronunciationUk || word.pronunciationUs : word.pronunciationUs || word.pronunciationUk;
  const audioSources = [audioUrl, getDictionaryAudioUrl(word.term, preferredAccent)].filter(Boolean) as string[];

  for (const source of audioSources) {
    try {
      if (!sharedAudio) sharedAudio = new Audio();
      sharedAudio.pause();
      sharedAudio.src = source;
      sharedAudio.currentTime = 0;
      await sharedAudio.play();
      return true;
    } catch {
      // Try the next audio source, then fall through to browser text-to-speech.
    }
  }

  return speakWithBrowser(word.term, preferredAccent);
}
