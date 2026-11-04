import { pipeline, env, RawImage, type ImageSegmentationPipeline } from '@huggingface/transformers';
import { GARMENT_LABELS } from './garment-mask';
import type { Category } from './constants';
env.allowRemoteModels = false;
env.localModelPath = '/models/';
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = '/onnx/';
  env.backends.onnx.wasm.numThreads = 1;
}
let model: Promise<ImageSegmentationPipeline> | undefined;
self.onmessage = async (event: MessageEvent<{ pixels: Uint8ClampedArray; width: number; height: number; category: Category }>) => {
  try {
    const { pixels, width, height, category } = event.data;
    model ??= pipeline('image-segmentation', 'clothes-segformer', { dtype: 'q8', device: 'wasm', local_files_only: true });
    const pipe = await model;
    const results = await pipe(new RawImage(pixels, width, height, 4));
    const selected = results.filter(r => r.label && GARMENT_LABELS[category].includes(r.label));
    if (!selected.length) throw new Error('没有识别到所选类型的衣物，请核对分类或更换照片');
    const masks = selected.map(r => ({ data: r.mask.data, width: r.mask.width, height: r.mask.height, channels: r.mask.channels }));
    self.postMessage({ masks });
  } catch (error) {
    model = undefined;
    self.postMessage({ error: error instanceof Error ? error.message : '自动分割失败' });
  }
};
