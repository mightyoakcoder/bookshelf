// BarcodeDetector ships in Chrome (incl. Android) but isn't in TypeScript's DOM lib yet.
// https://developer.mozilla.org/docs/Web/API/BarcodeDetector

interface DetectedBarcode {
  rawValue: string
  format: string
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] })
  static getSupportedFormats(): Promise<string[]>
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>
}

// Torch (flashlight) is a camera track capability Chrome on Android supports
interface MediaTrackCapabilities {
  torch?: boolean
}
interface MediaTrackConstraintSet {
  torch?: boolean
}
