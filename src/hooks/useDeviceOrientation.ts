"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export type CompassPermission = "prompt" | "granted" | "denied" | "unsupported";

export interface DeviceOrientationResult {
  heading: number | null; // 0–360, 0 = North, clockwise
  permission: CompassPermission;
  requestPermission: () => Promise<void>;
}

export function useDeviceOrientation(): DeviceOrientationResult {
  const [heading, setHeading] = useState<number | null>(null);
  const [permission, setPermission] = useState<CompassPermission>("prompt");
  const listeningRef = useRef(false);

  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    // iOS provides webkitCompassHeading: 0 = North, increases clockwise — most reliable
    const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof ios === "number" && !isNaN(ios)) {
      setHeading(ios);
      return;
    }
    // Android: alpha from absolute orientation event (CCW from North → convert to CW)
    if (e.alpha != null) {
      setHeading((360 - e.alpha) % 360);
    }
  }, []);

  const startListening = useCallback(() => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    // Prefer absolute orientation (Android Chrome)
    const evt = "ondeviceorientationabsolute" in window
      ? "deviceorientationabsolute"
      : "deviceorientation";
    window.addEventListener(evt, handleOrientation as EventListener);
    setPermission("granted");
  }, [handleOrientation]);

  const requestPermission = useCallback(async () => {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === "function") {
      try {
        const result = await DOE.requestPermission();
        if (result === "granted") {
          startListening();
        } else {
          setPermission("denied");
        }
      } catch {
        setPermission("denied");
      }
    } else {
      startListening();
    }
  }, [startListening]);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setPermission("unsupported");
      return;
    }

    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission !== "function") {
      // Android / desktop — no permission prompt needed
      startListening();
    }
    // iOS 13+: stay in "prompt" state until user taps the enable button

    return () => {
      listeningRef.current = false;
      window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener);
      window.removeEventListener("deviceorientation", handleOrientation as EventListener);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { heading, permission, requestPermission };
}
