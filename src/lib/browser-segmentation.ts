import type { Category } from './constants';
type Mask = { data: Uint8Array; width: number; height: number; channels: number };
export async function segmentInBrowser(url: string, category: Category): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('原图读取失败');
  const bitmap = await createImageBitmap(await response.blob());
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 768 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const worker = new Worker(new URL('./segmentation.worker.ts', import.meta.url), { type: 'module' });
  const masks = await new Promise<Mask[]>((resolve, reject) => {
    const timer = setTimeout(() => { worker.terminate(); reject(new Error('分割超时，设备可能内存不足，请使用电脑或更小的照片')); }, 120_000);
    const finish = () => { clearTimeout(timer); worker.terminate(); };
    worker.onerror = () => { finish(); reject(new Error('分割模型加载失败，请刷新后重试')); };
    worker.onmessage = e => { finish(); if (e.data.error) reject(new Error(e.data.error)); else resolve(e.data.masks); };
    worker.postMessage({ pixels: pixels.data, width: canvas.width, height: canvas.height, category });
  });
  let count = 0;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    let alpha = 0;
    for (const m of masks) {
      const mx = Math.min(m.width - 1, Math.floor(x * m.width / canvas.width));
      const my = Math.min(m.height - 1, Math.floor(y * m.height / canvas.height));
      alpha = Math.max(alpha, m.data[(my * m.width + mx) * m.channels]);
    }
    const index = (y * canvas.width + x) * 4 + 3;
    pixels.data[index] = Math.round(pixels.data[index] * alpha / 255);
    if (pixels.data[index]) count++;
  }
  if (!count) throw new Error('分割结果为空，请更换清晰照片');
  ctx.putImageData(pixels, 0, 0);
  return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('分割图片生成失败')), 'image/png'));
}
