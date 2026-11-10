import { isNative } from './platform'

/**
 * Turns an on-screen document (invoice, treatment plan…) into an A4 PDF.
 * It renders the element as a high-resolution image, so the PDF looks exactly like the screen
 * (₹ sign, fonts, letterhead), and splits it over pages when it is longer than one A4 page.
 */
export async function elementToPdf(el: HTMLElement): Promise<Blob> {
  const [{ toCanvas }, { jsPDF }] = await Promise.all([import('html-to-image'), import('jspdf')])
  await document.fonts?.ready
  const canvas = await toCanvas(el, { pixelRatio: 3, backgroundColor: '#ffffff', cacheBust: true })

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 12
  const w = pageW - margin * 2
  const pxPerMm = canvas.width / w
  const sliceH = Math.floor((pageH - margin * 2) * pxPerMm) // canvas pixels that fit on one page

  for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
    const h = Math.min(sliceH, canvas.height - y)
    const part = document.createElement('canvas')
    part.width = canvas.width
    part.height = h
    part.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    if (page > 0) pdf.addPage()
    pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, w, h / pxPerMm)
  }
  return pdf.output('blob')
}

const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Opens the share sheet with the PDF attached (pick WhatsApp, then the patient's chat).
 * The text goes along as the message caption. Falls back to downloading the file
 * where sharing files isn't supported (most desktop browsers).
 * Returns 'shared', 'downloaded' or 'cancelled'.
 */
export async function sharePdf(blob: Blob, fileName: string, opts: { title: string; text?: string }): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (isNative) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')])
    const { uri } = await Filesystem.writeFile({ path: fileName, data: await toBase64(blob), directory: Directory.Cache })
    try {
      await Share.share({ title: opts.title, text: opts.text, files: [uri], dialogTitle: opts.title })
      return 'shared'
    } catch (e) {
      if (/cancel/i.test(String((e as Error)?.message))) return 'cancelled'
      throw e
    }
  }
  const file = new File([blob], fileName, { type: 'application/pdf' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: opts.title, text: opts.text })
      return 'shared'
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled'
    }
  }
  download(blob, fileName)
  return 'downloaded'
}

/** Saves the PDF: download on the web, share sheet on the phone (where "Save to Files/Drive" lives). */
export async function savePdf(blob: Blob, fileName: string, title: string) {
  if (isNative) return sharePdf(blob, fileName, { title })
  download(blob, fileName)
  return 'downloaded' as const
}
