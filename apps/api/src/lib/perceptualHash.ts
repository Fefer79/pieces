import sharp from 'sharp'

/**
 * Hash perceptuel dHash (difference hash) 64 bits d'une image.
 * Résistant au recadrage léger, à la compression et au redimensionnement :
 * deux photos de la même image source produisent le même hash (ou un hash
 * très proche). Utilisé pour détecter la réutilisation de photos entre
 * comptes vendeurs ou les resoumissions répétées de la même pièce.
 */
export async function dHash(imageBuffer: Buffer): Promise<string> {
  const { data } = await sharp(imageBuffer)
    .grayscale()
    .resize(9, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })

  let hash = 0n
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col] ?? 0
      const right = data[row * 9 + col + 1] ?? 0
      hash = (hash << 1n) | (left > right ? 1n : 0n)
    }
  }
  return hash.toString(16).padStart(16, '0')
}

/** Distance de Hamming entre deux dHash hexadécimaux (0 = identiques, 64 = opposés). */
export function hammingDistance(hashA: string, hashB: string): number {
  let diff = BigInt(`0x${hashA}`) ^ BigInt(`0x${hashB}`)
  let count = 0
  while (diff > 0n) {
    count += Number(diff & 1n)
    diff >>= 1n
  }
  return count
}
