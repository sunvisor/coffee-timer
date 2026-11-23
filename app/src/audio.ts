export async function prepareAudio() {
  if (!window.AudioContext) throw new Error('このブラウザーは通知音に対応していません。')
  const context = new AudioContext()
  try {
    await context.resume()
    return context
  } catch (error) {
    await context.close()
    throw error
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
