# PGQR

A QR Code generator with full logo + svg support

<img src='qr.png' style='width: 250px'>

### Usage

```
npm install pgqr
```

```javascript
import {PGQRCode} from 'pgqr';

const options = {
    errorCorrectionLevel: 'H',
    maskPattern: undefined,
    logoScale: 0.9,
    logoAreaScale: 1,
    dotRadius: 0.5,
    dotScale: 0.95,
    dotColor: 'black',
    outerEyeRadius: 0.5,
    outerEyeColor: 'black',
    innerEyeRadius: 0.5,
    innerEyeColor: 'black',
}

const qr = new PGQRCode();

const svgString = await qr.renderSVG('https://example.com', options, '/logo.svg');

const pngBlob = await qr.toImage('https://example.com', options, '/logo.svg', 1024, 'png');

const jpgBlob = await qr.toImage('https://example.com', options, '/logo.svg', 1024, 'jpg');

const svgBlob = await qr.toSvg('https://example.com', options, '/logo.svg');

const pdfBlob = await qr.toPDF('https://example.com', options, '/logo.svg');

const zipBlob = await qr.toBatch(
  [
    {code: 'https://example.com', filename: 'qr1'},
    {code: 'https://example.com', filename: 'qr2'},
    {code: 'https://example.com', filename: 'qr3'},
  ],
  options,
  '/logo.svg',
  1024,
  formats: ['png', 'jpg', 'svg', 'pdf']
);
```

```javascript
import {QRPreview} from 'pgqr/react';

function App() {
  return (
      <QRPreview
        code="https://example.com"
        options={{
          errorCorrectionLevel: 'H',
          maskPattern: undefined,
          logoScale: 0.9,
          logoAreaScale: 1,
          dotRadius: 0.5,
          dotScale: 0.95,
          dotColor: 'black',
          outerEyeRadius: 0.5,
          outerEyeColor: 'black',
          innerEyeRadius: 0.5,
          innerEyeColor: 'black',
        }}
        logo="/logo.svg"
        style={{width: '50%', height: '50%'}}
      />
  );
}
```

### Road Map
- More dot styles
  - Triangle, Diamond, Circle, Hexagon etc
  - Import custom SVG