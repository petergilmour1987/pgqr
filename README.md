# PGQR

A QR Code generator with full logo + svg support

<img src='preview.png' style='width: 250px'>

### Usage

```
npm install pgqr
```

```
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

const svg = await PGQr.current.renderSVG('https://example.com', options, '/logo.svg');
```

```
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