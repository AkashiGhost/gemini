"use client";

import { useSyncExternalStore } from "react";

export const SOUND_PREF_KEY = "innerplay-sound";
export const SOUND_PREF_EVENT = "innerplay-sound-change";

export function getSoundPrefServerSnapshot(): boolean {
  return true;
}

export function getSoundPrefSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(SOUND_PREF_KEY);
  return stored === null ? true : stored === "on";
}

export function subscribeSoundPref(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === SOUND_PREF_KEY) callback();
  };
  const onLocalChange = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(SOUND_PREF_EVENT, onLocalChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SOUND_PREF_EVENT, onLocalChange);
  };
}

export function setSoundPref(nextOn: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_PREF_KEY, nextOn ? "on" : "off");
  window.dispatchEvent(new Event(SOUND_PREF_EVENT));
}

export function useSoundPref(): boolean {
  return useSyncExternalStore(
    subscribeSoundPref,
    getSoundPrefSnapshot,
    getSoundPrefServerSnapshot,
  );
}
