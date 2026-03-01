import sharp from 'sharp'

export interface ImageVariants {
  thumb: Buffer   // 150px
  small: Buffer   // 400px
  medium: Buffer  // 800px
  large: Buffer   // 1200px
}

export interface QualityAssessment {
  score: number       // 0-1
  issues: string[]
}

const VARIANTS = [
  { name: 'thumb' as const, width: 150 },
  { name: 'small' as const, width: 400 },
  { name: 'medium' as const, width: 800 },
  { name: 'large' as const, width: 1200 },
] as const

export async function processVariants(buffer: Buffer): Promise<ImageVariants> {
  const results = await Promise.all(
    VARIANTS.map(async (v) => {
      const resized = await sharp(buffer)
        .resize(v.width, undefined, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      return [v.name, resized] as const
    }),
  )
  return Object.fromEntries(results) as unknown as ImageVariants
}

export async function assessQuality(buffer: Buffer): Promise<QualityAssessment> {
  const issues: string[] = []

  const metadata = await sharp(buffer).metadata()
  const { width, height } = metadata

  // Check minimum dimensions
  if (!width || !height || width < 300 || height < 300) {
    issues.push('Image trop petite (minimum 300x300 px)')
  }

  // Analyze sharpness via stats
  const stats = await sharp(buffer).greyscale().stats()
  const sharpness = stats.channels[0]?.stdev ?? 0

  if (sharpness < 20) {
    issues.push('Image floue — veuillez reprendre la photo')
  }

  // Check brightness
  const brightness = stats.channels[0]?.mean ?? 0
  if (brightness < 30) {
    issues.push('Image trop sombre — activez le flash ☀️')
  }
  if (brightness > 240) {
    issues.push('Image surexposée — évitez la lumière directe')
  }

  // Score: 1.0 = perfect, deduct for each issue
  const score = Math.max(0, 1 - issues.length * 0.3)

  return { score, issues }
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
