import QRCode from 'qrcode';
import {SVG} from '@svgdotjs/svg.js';

export type QRData = {bits: (0 | 1)[]; width: number; logoArea?: {w: number; h: number}};

export type QROptions = {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  maskPattern?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  logoScale?: number;
  logoAreaScale?: number;
  dotRadius?: number;
  dotScale?: number;
  dotColor?: string;
  outerEyeRadius?: number;
  outerEyeColor?: string;
  innerEyeRadius?: number;
  innerEyeColor?: string;
};

const getRoundedRectPath = (x: number, y: number, width: number, height: number, radius: number) => {
  return `
  M ${x + radius},${y}
  L ${x + width - radius},${y}
  A ${radius},${radius} 0 0 1 ${x + width},${y + radius}
  L ${x + width},${y + height - radius}
  A ${radius},${radius} 0 0 1 ${x + width - radius},${y + height}
  L ${x + radius},${y + height}
  A ${radius},${radius} 0 0 1 ${x},${y + height - radius}
  L ${x},${y + radius}
  A ${radius},${radius} 0 0 1 ${x + radius},${y}
  Z
`.replace(' ', '');
};

export class PGQRCode {
  private logoData?: {key: string; ratio: number; svg: string} = undefined;

  private async setLogo(logo?: string) {
    if (!logo) {
      this.logoData = undefined;
      return;
    }
    const img = new Image();
    img.src = logo;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    // Read the SVG data into a string
    const res = await fetch(logo);
    const svg = await res.text();

    this.logoData = {
      key: logo,
      ratio: img.width / img.height,
      svg,
    };
  }

  private getData(code: string, opts?: QROptions): QRData {
    const out: QRData = {bits: [], width: 0};

    const qrCode = QRCode.create(code, {
      errorCorrectionLevel: opts?.errorCorrectionLevel || 'H',
      maskPattern: opts?.maskPattern,
    });

    // Get the QR code data as a flat array of bits
    for (let i = 0; i < qrCode.modules.data.length; i++) {
      out.bits.push(qrCode.modules.data[i] ? 1 : 0);
    }
    out.width = Math.sqrt(out.bits.length);

    if (this.logoData) {
      // Define the maximum area the logo can take up
      let maxArea = Math.round(out.width * 0.16);
      if (out.width > 21) maxArea = Math.round(out.width * 0.18);
      if (out.width > 50) maxArea = Math.round(out.width * 0.2);
      maxArea = Math.round(maxArea * (opts?.logoAreaScale || 1));

      out.logoArea = {
        w: this.logoData.ratio > 1 ? maxArea : Math.round(maxArea * this.logoData.ratio),
        h: this.logoData.ratio < 1 ? maxArea : Math.round(maxArea / this.logoData.ratio),
      };

      // Clear the area where the logo will be placed
      const center = {x: Math.floor(out.width / 2), y: Math.floor(out.width / 2)};
      for (let y = center.y - out.logoArea.h; y <= center.y + out.logoArea.h; y++) {
        for (let x = center.x - out.logoArea.w; x <= center.x + out.logoArea.w; x++) {
          out.bits[y * out.width + x] = 0;
        }
      }
    }

    return out;
  }

  public async renderSVG(code: string, opts?: QROptions, logo?: string): Promise<string> {
    const outputSize = 1024;

    if (logo) {
      if (!logo.endsWith('.svg')) {
        throw new Error('Logo must be an SVG file');
      }

      if (logo !== this.logoData?.key) {
        await this.setLogo(logo);
      }
    } else {
      await this.setLogo();
    }

    const data = this.getData(code, opts);

    const outerEyeIndexes: number[] = [];
    for (let i = 0; i < 7; i++) {
      outerEyeIndexes.push(0 * data.width + i);
      outerEyeIndexes.push(i * data.width + 0);
      outerEyeIndexes.push(i * data.width + 6);
      outerEyeIndexes.push(6 * data.width + i);
      outerEyeIndexes.push(0 * data.width + (data.width - 1 - i));
      outerEyeIndexes.push(i * data.width + (data.width - 1));
      outerEyeIndexes.push(6 * data.width + (data.width - 1 - i));
      outerEyeIndexes.push(i * data.width + (data.width - 7));
      outerEyeIndexes.push((data.width - 1) * data.width + i);
      outerEyeIndexes.push((data.width - 7) * data.width + i);
      outerEyeIndexes.push((data.width - i) * data.width + 0);
      outerEyeIndexes.push((data.width - i) * data.width + 6);
    }

    const innerEyeIndexes: number[] = [];
    for (let i = 0; i < 3; i++) {
      innerEyeIndexes.push(2 * data.width + i + 2);
      innerEyeIndexes.push(3 * data.width + i + 2);
      innerEyeIndexes.push(4 * data.width + i + 2);
      innerEyeIndexes.push(2 * data.width + (data.width - 1 - i - 2));
      innerEyeIndexes.push(3 * data.width + (data.width - 1 - i - 2));
      innerEyeIndexes.push(4 * data.width + (data.width - 1 - i - 2));
      innerEyeIndexes.push((data.width - 3) * data.width + i + 2);
      innerEyeIndexes.push((data.width - 4) * data.width + i + 2);
      innerEyeIndexes.push((data.width - 5) * data.width + i + 2);
    }

    // Remove the outer eye bits
    for (const index of outerEyeIndexes) {
      data.bits[index] = 0;
    }

    // Remove the inner eye bits
    for (const index of innerEyeIndexes) {
      data.bits[index] = 0;
    }

    const bitSize = outputSize / data.width;
    const outerEyeSize = (outputSize / data.width) * 7;
    const innerEyeSize = (outputSize / data.width) * 3;

    const svg = SVG();
    svg.viewbox(0, 0, outputSize, outputSize);

    // Draw the Bits
    for (let i = 0; i < data.bits.length; i++) {
      if (!data.bits[i]) continue;
      const x = i % data.width;
      const y = Math.floor(i / data.width);
      const size = bitSize;
      svg
        .rect(size, size)
        .radius(size * 0.5 * (opts?.dotRadius || 0))
        .move(x * size, y * size)
        .scale(opts?.dotScale || 1)
        .fill(opts?.dotColor || 'black');
    }

    // Draw the outer eyes
    const outerEyeMaskSize = outerEyeSize - bitSize * 2;
    for (const {x, y} of [
      {x: 0, y: 0},
      {x: outputSize - outerEyeSize, y: 0},
      {x: 0, y: outputSize - outerEyeSize},
    ]) {
      svg
        .path(`
          ${getRoundedRectPath(x, y, outerEyeSize, outerEyeSize, outerEyeSize * (opts?.outerEyeRadius || 0) * 0.5)} 
          ${getRoundedRectPath(
            x + outerEyeSize / 2 - outerEyeMaskSize / 2,
            y + outerEyeSize / 2 - outerEyeMaskSize / 2,
            outerEyeMaskSize,
            outerEyeMaskSize,
            outerEyeMaskSize * (opts?.outerEyeRadius || 0) * 0.35,
          )}`)
        .fill({color: opts?.outerEyeColor || 'black', rule: 'evenodd'});
    }

    // Draw the inner eyes, no mask, just rounded rects
    const innerEyeOffset = outerEyeSize / 2 - innerEyeSize / 2;
    for (const {x, y} of [
      {x: innerEyeOffset, y: innerEyeOffset},
      {x: outputSize - outerEyeSize + innerEyeOffset, y: innerEyeOffset},
      {x: innerEyeOffset, y: outputSize - outerEyeSize + innerEyeOffset},
    ]) {
      svg
        .rect(innerEyeSize, innerEyeSize)
        .radius(innerEyeSize * 0.5 * (opts?.innerEyeRadius || 0))
        .move(x, y)
        .fill(opts?.innerEyeColor || 'black');
    }

    // Render the svg logo from this.logo.svg into the center of the QR code
    if (this.logoData && data.logoArea) {
      const safeWidth = (data.logoArea.w * 2 + 1) * bitSize;
      const safeHeight = (data.logoArea.h * 2 + 1) * bitSize;

      const logo = SVG(this.logoData.svg);
      const logoWidth = logo.width() as number;
      const logoHeight = logo.height() as number;
      const scaleContainer = svg.group();
      scaleContainer.add(logo);
      let logoScale = Math.min(safeWidth / logoWidth, safeHeight / logoHeight);
      logoScale *= opts?.logoScale || 1;
      scaleContainer.scale(logoScale, logoScale);

      const logoMoveContainer = svg.group();
      logoMoveContainer.add(scaleContainer);
      const logoX = outputSize / 2 - logoWidth * 0.5 * logoScale;
      const logoY = outputSize / 2 - logoHeight * 0.5 * logoScale;
      logoMoveContainer.move(logoX, logoY);
    }

    return svg.svg();
  }
}
