const SELECTED_DEVICE_PREFIX = "mobile-canvas-selected-device:";

export function readStoredDeviceId(storage, instanceId) {
  const value = storage.getItem(storageKey(instanceId));
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function storeDeviceId(storage, instanceId, deviceId) {
  if (typeof deviceId !== "string" || deviceId.length === 0) {
    throw new TypeError("A selected device ID is required.");
  }
  storage.setItem(storageKey(instanceId), deviceId);
}

export function clearStoredDeviceId(storage, instanceId) {
  storage.removeItem(storageKey(instanceId));
}

export async function resumeAuthenticatedPanel({
  authenticate,
  isActive,
  refresh = async () => {},
  resume,
}) {
  await authenticate();
  if (!isActive()) return false;
  await refresh();
  if (!isActive()) return false;
  resume();
  return true;
}

export function initialPanelVisible(hostOwnsVisibility, documentHidden = false) {
  return hostOwnsVisibility ? true : !documentHidden;
}

export function shouldShowConnectingStatus(hasVisibleFrame) {
  return hasVisibleFrame !== true;
}

export function canResumeLiveView(device, hasDisplay) {
  return device?.state === "booted" && hasDisplay === true;
}

export function isCurrentDevice(current, nextId) {
  return Boolean(current?.id) && current.id === nextId;
}

export const SCREENSHOT_PREVIEW_MS = 8_000;

export function screenshotFileName(deviceName, now = Date.now()) {
  const slug = String(deviceName || "device")
    .replaceAll(/\W+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .toLowerCase() || "device";
  return `${slug}-${now}.png`;
}

export function shouldHoldScreenshotPreview({ hovering = false, dragging = false } = {}) {
  return hovering === true || dragging === true;
}

export function screenSourceRotation({
  displayWidth,
  displayHeight,
  sourceWidth,
  sourceHeight,
  orientation,
} = {}) {
  if (!(displayWidth > 0) || !(displayHeight > 0) || !(sourceWidth > 0) || !(sourceHeight > 0)) {
    return 0;
  }
  const displayLandscape = displayWidth > displayHeight;
  const sourceLandscape = sourceWidth > sourceHeight;
  if (displayLandscape === sourceLandscape) return 0;
  return orientation === "landscape-right" ? 90 : -90;
}

export function prepareScreenshotDrag(dataTransfer, { file, fileUri, filePath } = {}) {
  if (!dataTransfer || !file) return false;
  dataTransfer.effectAllowed = "copy";
  const name = file.name || "screenshot.png";
  const type = file.type || "image/png";
  const hasPath = typeof filePath === "string" && filePath.length > 0;
  const hasUri = typeof fileUri === "string" && fileUri.length > 0;
  try {
    if (hasPath) {
      dataTransfer.setData("CodeFiles", JSON.stringify([filePath]));
    }
    if (hasUri) {
      dataTransfer.setData("ResourceURLs", JSON.stringify([fileUri]));
      dataTransfer.setData("application/vnd.code.uri-list", fileUri);
      dataTransfer.setData("text/uri-list", fileUri);
      dataTransfer.setData("DownloadURL", `${type}:${name}:${fileUri}`);
    }
  } catch {
    // Dragstart can lock MIME types in Chromium.
  }
  // VS Code chat reads file.path from disk. A Blob File only has a name, so chat
  // attaches a filename chip instead of the PNG. Skip it when a real path exists.
  if (!hasPath) {
    try {
      dataTransfer.items?.add?.(file);
    } catch {
      // Some hosts reject File items on the drag payload.
    }
  }
  return true;
}

export function emptySelectionPresentation() {
  return {
    tone: "accent",
    icon: "#icon-device",
    title: "Select a device",
    detail: "Choose an existing target, or create one from an installed runtime.",
    action: { id: "create", label: "New device", icon: "#icon-plus" },
  };
}

export function startupLiveViewPresentation() {
  return {
    tone: "accent",
    icon: "#icon-device",
    eyebrow: "Live view",
    title: "Opening live view",
    detail: "Connecting to a running simulator or emulator.",
    busy: true,
  };
}

export function organizeDiagnostics(diagnostics) {
  const failures = (diagnostics ?? [])
    .flatMap((entry) => entry?.checks ?? [])
    .filter((check) => check?.status !== "ok");
  const notices = [];
  const popover = [];

  for (const check of failures) {
    const actions = (check.actions ?? []).filter(
      (action) =>
        action?.type === "open-system-settings" &&
        typeof action.target === "string" &&
        action.target.length > 0 &&
        typeof action.label === "string" &&
        action.label.length > 0,
    );
    if (actions.length > 0) notices.push({ ...check, actions });
    else popover.push(check);
  }

  return { notices, popover };
}

export function shouldDrainIdleDecoder(source) {
  return source === "idb" || source === "emulator-grpc";
}

export function canBootDeviceState(deviceState) {
  const normalized = String(deviceState || "unknown").toLowerCase();
  return normalized !== "booted"
    && normalized !== "booting"
    && normalized !== "shutting-down";
}

const DEVICE_STATE_LABELS = {
  booted: "Running",
  shutdown: "Powered off",
  booting: "Starting",
  "shutting-down": "Powering off",
  unknown: "Unavailable",
};

export function formatDeviceState(deviceState) {
  const normalized = String(deviceState || "unknown").toLowerCase();
  return DEVICE_STATE_LABELS[normalized] ||
    normalized.replaceAll("-", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function deviceStatusPresentation(kind, { deviceName, platform, detail } = {}) {
  const noun = platform === "android" ? "emulator" : platform === "ios" ? "simulator" : "device";
  const name = String(deviceName || "").trim();
  const subject = name || `the ${noun}`;

  switch (kind) {
    case "offline":
      return {
        tone: "accent",
        icon: "#icon-power",
        eyebrow: "Device offline",
        title: `${capitalize(noun)} is powered off`,
        detail: detail || `Start ${subject} to open a live, interactive screen.`,
        action: { id: "boot", label: `Start ${noun}`, icon: "#icon-play" },
      };
    case "booting":
      return {
        tone: "accent",
        icon: "#icon-power",
        eyebrow: "Powering on",
        title: `Starting ${subject}`,
        detail: detail || "This can take a moment. Live view will connect automatically.",
        busy: true,
      };
    case "connecting":
      return {
        tone: "accent",
        icon: "#icon-device",
        eyebrow: "Live view",
        title: `Connecting to ${subject}`,
        detail: detail || "Connecting to a running simulator or emulator.",
        busy: true,
      };
    case "restarting":
      return {
        tone: "accent",
        icon: "#icon-restart",
        eyebrow: "Restarting",
        title: `Restarting ${subject}`,
        detail: detail || "Live view will reconnect as soon as the device is ready.",
        busy: true,
      };
    case "shutting-down":
      return {
        tone: "neutral",
        icon: "#icon-power",
        eyebrow: "Powering off",
        title: `Stopping ${subject}`,
        detail: detail || "The device frame will remain here when shutdown completes.",
        busy: true,
      };
    case "disconnected":
      return {
        tone: "warning",
        icon: "#icon-link-off",
        eyebrow: "Connection interrupted",
        title: "Live view disconnected",
        detail: detail || `The ${noun} may still be running. Try reconnecting to the stream.`,
        action: { id: "retry-stream", label: "Try again", icon: "#icon-refresh" },
      };
    case "error":
      return {
        tone: "danger",
        icon: "#icon-alert",
        eyebrow: "Something went wrong",
        title: "Couldn't show the live view",
        detail: detail || "An unexpected error interrupted the device connection.",
        action: { id: "retry-stream", label: "Try again", icon: "#icon-refresh" },
      };
    case "unavailable":
    default:
      return {
        tone: "warning",
        icon: "#icon-alert",
        eyebrow: "Device unavailable",
        title: `${capitalize(noun)} isn't available`,
        detail: detail || "Refresh the device list to check its current state.",
        action: { id: "refresh", label: "Refresh devices", icon: "#icon-refresh" },
      };
  }
}

function storageKey(instanceId) {
  if (typeof instanceId !== "string" || instanceId.length === 0) {
    throw new TypeError("A canvas instance ID is required.");
  }
  return `${SELECTED_DEVICE_PREFIX}${instanceId}`;
}

function capitalize(value) {
  return value[0].toUpperCase() + value.slice(1);
}
