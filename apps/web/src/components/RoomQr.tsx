import { useMemo } from 'react';
import { encode } from 'uqr';

/** Il QR del link di invito: chi lo inquadra entra nella stanza. */
export function RoomQr({ link }: { link: string }) {
  const { size, path } = useMemo(() => {
    const qr = encode(link, { ecc: 'M', border: 4 });
    const modules = qr.data.flatMap((row, y) => row.map((on, x) => (on ? `M${x} ${y}h1v1h-1z` : '')));
    return { size: qr.size, path: modules.join('') };
  }, [link]);

  return (
    <figure className="room-qr">
      <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label="QR per entrare nella stanza" shapeRendering="crispEdges">
        <rect width={size} height={size} fill="#fff" />
        <path d={path} fill="#000" />
      </svg>
      <figcaption className="hint">Inquadra per entrare nella stanza</figcaption>
    </figure>
  );
}
