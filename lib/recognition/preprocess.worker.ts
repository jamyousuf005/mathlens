/**
 * Web Worker for heavy image thresholding and deskewing
 */
import { preprocessCanvasPixels } from './preprocessor';

self.onmessage = (event: MessageEvent<{ imageData: ImageData; binarize?: boolean }>) => {
  try {
    const { imageData, binarize } = event.data;
    const result = preprocessCanvasPixels(imageData, binarize);
    self.postMessage({ success: true, processedImageData: result.data, skewAngle: result.skewAngle });
  } catch (error) {
    self.postMessage({ success: false, error: error instanceof Error ? error.message : 'Preprocessing failed' });
  }
};
