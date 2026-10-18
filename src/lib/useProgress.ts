"use client";
import { useSyncExternalStore } from "react";
import { getServerState, getState, subscribe, type Progress } from "./progress";

export const useProgress = (): Progress => useSyncExternalStore(subscribe, getState, getServerState);
