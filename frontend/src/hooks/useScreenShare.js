/**
 * useScreenShare — owns getDisplayMedia, the <video> element wiring, and
 * frame capture for the Live Tutor surface.
 *
 * Why this is a hook: the previous bug (commit cd2f351) lived in this code
 * because the stream-attach and the <video>-mount happened in different
 * effects scattered through a 1090-line component. Pulling it into one
 * hook with one stream-attach effect makes the contract clear.
 *
 * Usage:
 *   const share = useScreenShare();
 *   <video ref={share.videoRef} ... />
 *   <canvas ref={share.canvasRef} hidden />
 *   share.startSharing(); share.stopSharing();
 *   const frame = share.captureFrame();  // {dataUrl, base64} or null
 */

import { useEffect, useRef, useState } from "react";

export function useScreenShare() {
  const [sharing, setSharing] = useState(false);
  const [streamRef, setStreamRef] = useState(null);
  const [shareError, setShareError] = useState(null);
  const [lastSnapshot, setLastSnapshot] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Stop tracks when the hook unmounts or the active stream changes.
  useEffect(() => {
    return () => { if (streamRef) streamRef.getTracks().forEach((t) => t.stop()); };
  }, [streamRef]);

  // Attach the stream to <video> once BOTH exist. The <video> only mounts
  // when sharing===true (caller controls this), so a direct assignment
  // inside startSharing would hit a null ref. This effect runs after the
  // element mounts and wires the stream up.
  useEffect(() => {
    const video = videoRef.current;
    if (!sharing || !streamRef || !video) return;
    if (video.srcObject === streamRef) return;
    video.srcObject = streamRef;
    video.play().catch(() => { /* autoplay rejection is harmless */ });
  }, [sharing, streamRef]);

  async function startSharing() {
    setShareError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
      });
      setStreamRef(stream);
      setSharing(true);
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setSharing(false);
        setStreamRef(null);
      });
    } catch (e) {
      // User-cancel is not an error — just don't surface anything.
      if (e.name !== "NotAllowedError") {
        setShareError(e.message || "Couldn't access screen share.");
      }
    }
  }

  function stopSharing() {
    if (streamRef) streamRef.getTracks().forEach((t) => t.stop());
    setStreamRef(null);
    setSharing(false);
    setLastSnapshot(null);
  }

  /** Capture the current video frame as a JPEG. Returns null if the stream
   *  hasn't produced dimensions yet (e.g., user shared but window is hidden). */
  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    if (!video.videoWidth) return null;

    const MAX = 1280;
    const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setLastSnapshot(dataUrl);
    return { dataUrl, base64: dataUrl.split(",")[1] };
  }

  return {
    sharing,
    streamRef,
    shareError,
    setShareError,
    lastSnapshot,
    videoRef,
    canvasRef,
    startSharing,
    stopSharing,
    captureFrame,
  };
}
