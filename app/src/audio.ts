import { TranslationError } from './i18n'

export function closeAudio(context: AudioContext | null) {
  if (context && context.state !== 'closed') {
    void context.close().catch((error) => console.warn('Could not close audio context', error))
  }
}

export async function prepareAudio(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Audio preparation cancelled', 'AbortError')
  if (!window.AudioContext) throw new TranslationError('audio.unsupported')
  const context = new AudioContext()
  const onAbort = () => closeAudio(context)
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    await context.resume()
    return context
  } catch (error) {
    closeAudio(context)
    throw error
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }
}

export function ring(context: AudioContext) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.connect(gain).connect(context.destination)
  oscillator.frequency.setValueAtTime(880, context.currentTime)
  gain.gain.setValueAtTime(0.2, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.65)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.65)
}
