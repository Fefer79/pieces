import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { AppError } from './appError.js'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
})

const BUCKET = process.env.R2_BUCKET_NAME ?? 'pieces-images'
const PUBLIC_URL = process.env.R2_PUBLIC_URL ?? ''

export async function uploadToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  )
  return getPublicUrl(key)
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const result = await r2Client.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  )
  if (!result.Body) throw new AppError('R2_EMPTY_BODY', 500, { message: 'R2 object body is empty' })
  const bytes = await result.Body.transformToByteArray()
  return Buffer.from(bytes)
}

export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`
}
