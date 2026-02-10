import { toPng } from 'html-to-image'

/**
 * Capture the current Markmap SVG as a small base64 PNG thumbnail.
 * Temporarily sets a viewBox that centers on the actual content so
 * the thumbnail isn't off in one corner.
 * Returns null if the SVG isn't in the DOM or capture fails.
 */
export async function captureThumbnail(): Promise<string | null> {
  const svg = document.querySelector<SVGSVGElement>('svg[data-markmap]')
  if (!svg) return null

  // Save original attributes so we can restore them after capture
  const origViewBox = svg.getAttribute('viewBox')
  const origWidth = svg.getAttribute('width')
  const origHeight = svg.getAttribute('height')

  try {
    // Get bounding box of all rendered content inside the SVG
    const bbox = svg.getBBox()
    const pad = 20 // padding around content
    const vbX = bbox.x - pad
    const vbY = bbox.y - pad
    const vbW = bbox.width + pad * 2
    const vbH = bbox.height + pad * 2

    // Set viewBox to tightly frame the content, centered
    svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`)
    svg.setAttribute('width', '600')
    svg.setAttribute('height', '400')

    const dataUrl = await toPng(svg as unknown as HTMLElement, {
      width: 600,
      height: 400,
      backgroundColor: 'transparent',
      quality: 0.8,
      pixelRatio: 1,
    })

    return dataUrl
  } catch (err) {
    console.error('[ToT] Thumbnail capture failed:', err)
    return null
  } finally {
    // Always restore original SVG attributes
    if (origViewBox) svg.setAttribute('viewBox', origViewBox)
    else svg.removeAttribute('viewBox')
    if (origWidth) svg.setAttribute('width', origWidth)
    if (origHeight) svg.setAttribute('height', origHeight)
  }
}
