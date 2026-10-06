import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { formatLabel } from '../lib/format'
import { isBookBarcode } from '../lib/isbn'
import type { BookFormat } from '../types/book'

export type ScanOutcome =
  | { status: 'added'; title: string }
  | { status: 'duplicate'; title: string; formatSet?: BookFormat }
  | { status: 'notfound' }
  | { status: 'error'; message: string }

interface LogEntry {
  isbn: string
  outcome: ScanOutcome | null // null = still looking up
}

interface Props {
  // format is set when you've told the scanner what kind of books you're scanning
  onIsbn: (isbn: string, format?: BookFormat) => Promise<ScanOutcome>
  onClose: () => void
}

const SCAN_INTERVAL_MS = 200

// Full-screen camera that keeps scanning: every new book barcode it sees is handed to onIsbn,
// and the results stack up in a log so you can work through a whole shelf without tapping.
export function Scanner({ onIsbn, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const seenRef = useRef(new Set<string>())
  const [format, setFormat] = useState<BookFormat | 'auto'>('auto')
  // Always calls the latest onIsbn and format without restarting the camera
  const lookup = useEffectEvent((isbn: string) => onIsbn(isbn, format === 'auto' ? undefined : format))

  const [log, setLog] = useState<LogEntry[]>([])
  const [cameraError, setCameraError] = useState<string | null>(() =>
    'BarcodeDetector' in window ? null : 'This browser can’t read barcodes. Use Chrome on Android, or type the ISBN instead.',
  )
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    if (!('BarcodeDetector' in window)) return

    const detector = new BarcodeDetector({ formats: ['ean_13'] })
    let stream: MediaStream | null = null
    let timer: number | undefined
    let stopped = false

    function handleCode(raw: string) {
      if (!isBookBarcode(raw) || seenRef.current.has(raw)) return
      seenRef.current.add(raw)
      navigator.vibrate?.(60)
      setLog((prev) => [{ isbn: raw, outcome: null }, ...prev])

      lookup(raw).then((outcome) => {
        // Let errors be rescanned (e.g. a network blip)
        if (outcome.status === 'error') seenRef.current.delete(raw)
        setLog((prev) => prev.map((e) => (e.isbn === raw && !e.outcome ? { ...e, outcome } : e)))
      })
    }

    async function tick() {
      if (stopped) return
      const video = videoRef.current
      if (video && video.readyState >= video.HAVE_CURRENT_DATA) {
        try {
          const codes = await detector.detect(video)
          codes.forEach((c) => handleCode(c.rawValue))
        } catch {
          // detect() can fail on a frame mid-resize; just try the next one
        }
      }
      timer = window.setTimeout(tick, SCAN_INTERVAL_MS)
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      .then(async (s) => {
        if (stopped) return s.getTracks().forEach((t) => t.stop())
        stream = s
        const track = s.getVideoTracks()[0]
        trackRef.current = track
        setTorchAvailable(Boolean(track.getCapabilities?.().torch))
        if (videoRef.current) {
          videoRef.current.srcObject = s
          await videoRef.current.play()
        }
        tick()
      })
      .catch((err: Error) => {
        setCameraError(
          err.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow it in the browser’s site settings.'
            : `Couldn’t start the camera: ${err.message}`,
        )
      })

    return () => {
      stopped = true
      window.clearTimeout(timer)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  async function toggleTorch() {
    const next = !torchOn
    await trackRef.current?.applyConstraints({ advanced: [{ torch: next }] })
    setTorchOn(next)
  }

  const added = log.filter((e) => e.outcome?.status === 'added' || e.outcome?.status === 'notfound').length

  return (
    <div className="scanner">
      <div className="scanner-view">
        <video ref={videoRef} playsInline muted />
        <div className="scanner-guide" />
        <div className="scanner-top">
          <span className="scanner-count">{added} added this session</span>
          {torchAvailable && (
            <button type="button" className="ghost" onClick={toggleTorch}>
              {torchOn ? 'Light off' : 'Light on'}
            </button>
          )}
        </div>
        {cameraError && <p className="scanner-error">{cameraError}</p>}
      </div>

      <div className="format-picker" role="radiogroup" aria-label="Cover type for scanned books">
        {(['auto', 'hardcover', 'paperback'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={format === f}
            className={format === f ? 'active' : ''}
            onClick={() => setFormat(f)}
          >
            {f === 'auto' ? 'Auto' : formatLabel(f)}
          </button>
        ))}
      </div>

      <ul className="scan-log">
        {log.length === 0 && !cameraError && <li className="muted">Point the camera at a barcode on the back cover.</li>}
        {log.map((e) => (
          <li key={e.isbn} className={`scan-${e.outcome?.status ?? 'pending'}`}>
            <ScanLogText entry={e} />
          </li>
        ))}
      </ul>

      <button type="button" className="scanner-done" onClick={onClose}>
        Done
      </button>
    </div>
  )
}

function ScanLogText({ entry }: { entry: LogEntry }) {
  const { isbn, outcome } = entry
  if (!outcome) return <>Looking up {isbn}…</>
  switch (outcome.status) {
    case 'added':
      return <>✓ Added <strong>{outcome.title}</strong></>
    case 'duplicate':
      return (
        <>
          Already have <strong>{outcome.title}</strong>
          {outcome.formatSet && ` — marked ${formatLabel(outcome.formatSet).toLowerCase()}`}
        </>
      )
    case 'notfound':
      return <>? {isbn} not in any database — saved, fill in details later</>
    case 'error':
      return <>⚠ {isbn}: {outcome.message} (scan again to retry)</>
  }
}
