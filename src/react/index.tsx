import {useEffect, useRef, useState} from 'react';
import {PGQRCode, QROptions} from '..';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  options?: QROptions;
  logo?: string;
}

export const QRPreview = ({code, logo, options, ...rest}: Props) => {
  const [svgString, setSvgString] = useState<string>('');
  const PGQr = useRef<PGQRCode>(new PGQRCode());

  useEffect(() => {
    (async () => {
      try {
        const svg = await PGQr.current.renderSVG(code, options, logo);
        setSvgString(svg);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [code, options, logo]);

  return <div {...rest} dangerouslySetInnerHTML={{__html: svgString}} />;
};
