import {SVG} from '@svgdotjs/svg.js';
import {jsPDF} from 'jspdf';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import 'svg2pdf.js';

export const svgToBlob = async (svg: string) => {
  const blob = new Blob([svg], {type: 'image/svg+xml'});
  return blob;
};

const renderLarge = async (svg: string, size: number, scale: number) => {
  const image = new Image();
  image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  await new Promise((resolve) => {
    image.onload = resolve;
  });
  const canvas = document.createElement('canvas');
  canvas.width = size * scale;
  canvas.height = size * scale;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0, size * scale, size * scale);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob!);
      },
      'image/png',
      1,
    );
  });
};

export const svgToImageBlob = async (svg: string, size: number, format: 'jpg' | 'png', quality = 1) => {
  const largeBlob = await renderLarge(svg, size, 4);
  const largeImage = new Image();
  largeImage.src = URL.createObjectURL(largeBlob);
  await new Promise((resolve) => {
    largeImage.onload = resolve;
  });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  context.drawImage(largeImage, 0, 0, size, size);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob!);
      },
      format === 'png' ? 'image/png' : 'image/jpeg',
      quality,
    );
  });
};

export const svgToPDFBlob = async (svg: string, size: number) => {
  const doc = new jsPDF({
    unit: 'px',
    format: [size, size],
  });
  const svgEl = document.createElement('svg');
  svgEl.innerHTML = svg;
  await doc.svg(svgEl, {x: 0, y: 0, width: size, height: size});
  const pdfBlob = doc.output('blob');
  return pdfBlob;
};

export const svgsToZipBlob = async (values: {svg: string; filename: string}[], size: number, formats: ('png' | 'jpg' | 'pdf' | 'svg')[]) => {
  if (!formats.length) {
    throw new Error('At least one format must be specified');
  }

  const zip = new JSZip();
  for (const v of values) {
    if (formats.includes('png')) {
      const png = await svgToImageBlob(v.svg, size, 'png');
      zip.file(`${v.filename}.png`, png);
    }
    if (formats.includes('jpg')) {
      const jpg = await svgToImageBlob(v.svg, size, 'jpg');
      zip.file(`${v.filename}.jpg`, jpg);
    }
    if (formats.includes('pdf')) {
      const pdf = await svgToPDFBlob(v.svg, size);
      zip.file(`${v.filename}.pdf`, pdf);
    }
    if (formats.includes('svg')) {
      const svg = await svgToBlob(v.svg);
      zip.file(`${v.filename}.svg`, svg);
    }
  }

  const blob = await zip.generateAsync({type: 'blob'});
  return blob;
};

export const getRoundedRectPath = (x: number, y: number, width: number, height: number, radius: number) => {
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
  backgroundColor?: string;
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
      let maxArea = Math.round(out.width * 0.15);
      if (out.width > 21) maxArea = Math.round(out.width * 0.16);
      if (out.width > 50) maxArea = Math.round(out.width * 0.18);
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
    if (logo) {
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

    const bitSize = 32;
    const outputSize = data.width * bitSize;
    const outerEyeSize = bitSize * 7;
    const innerEyeSize = bitSize * 3;

    const svg = SVG();
    svg.viewbox(0, 0, outputSize, outputSize);

    if (opts?.backgroundColor) {
      svg.rect(outputSize, outputSize).fill(opts.backgroundColor);
    }

    // Draw the Dots
    for (let i = 0; i < data.bits.length; i++) {
      if (!data.bits[i]) continue;
      const x = i % data.width;

      const y = Math.floor(i / data.width);

      if (!opts?.dotRadius || opts.dotRadius <= 0) {
        svg
          .rect(bitSize, bitSize)
          .move(x * bitSize, y * bitSize)
          .scale(opts?.dotScale || 1)
          .fill(opts?.dotColor || 'black');
      } else {
        if (opts.dotRadius >= 1) {
          svg
            .circle(bitSize)
            .move(x * bitSize, y * bitSize)
            .scale(opts?.dotScale || 1)
            .fill(opts?.dotColor || 'black');
        } else {
          svg
            .rect(bitSize, bitSize)
            .radius(bitSize * 0.5 * (opts?.dotRadius || 0))
            .move(x * bitSize, y * bitSize)
            .scale(opts?.dotScale || 1)
            .fill(opts?.dotColor || 'black');
        }
      }
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

  public toSvg = async (code: string, opts?: QROptions, logo?: string): Promise<Blob> => {
    const svg = await this.renderSVG(code, opts, logo);
    return svgToBlob(svg);
  };

  public toImage = async (code: string, opts?: QROptions, logo?: string, size = 1024, format: 'jpg' | 'png' = 'png', quality = 1): Promise<Blob> => {
    const svg = await this.renderSVG(code, opts, logo);
    return svgToImageBlob(svg, size, format, quality);
  };

  public toPDF = async (code: string, opts?: QROptions, logo?: string, size = 1024): Promise<Blob> => {
    const svg = await this.renderSVG(code, opts, logo);
    return svgToPDFBlob(svg, size);
  };

  public toBatch = async (
    values: {code: string; filename: string}[],
    opts?: QROptions,
    logo?: string,
    size = 1024,
    formats: ('png' | 'jpg' | 'pdf' | 'svg')[] = ['svg'],
  ): Promise<Blob> => {
    const svgs = await Promise.all(
      values.map(async (v) => {
        const svg = await this.renderSVG(v.code, opts, logo);
        return {svg, filename: v.filename};
      }),
    );
    return svgsToZipBlob(svgs, size, formats);
  };
}
