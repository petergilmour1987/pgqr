import {jsPDF} from 'jspdf';
import JSZip from 'jszip';
import 'svg2pdf.js';

export const svgToBlob = async (svg: string) => {
  const blob = new Blob([svg], {type: 'image/svg+xml'});
  return blob;
};

export const svgToImageBlob = async (svg: string, size: number, format: 'jpg' | 'png', quality = 0.6) => {
  const image = new Image();
  image.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  await new Promise((resolve) => {
    image.onload = resolve;
  });
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0, size, size);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(blob!);
      },
      format,
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
