import { FUENTE } from '../lib/diseño'

/** El 18+: un octagono de borde doble con una estrella arriba, en gris, como
 *  en los mockups. Es una advertencia, no un adorno: discreta a proposito. */
export default function Insignia18() {
  const gris = '#8F8A94'
  return (
    <svg role="img" aria-label="Solo para mayores de 18 años" width="116" height="66" viewBox="0 0 116 66">
      <polygon points="16,6 100,6 112,18 112,50 100,62 16,62 4,50 4,18"
        fill="rgba(8,8,10,.55)" stroke={gris} strokeWidth="1.6" />
      <polygon points="19,10 97,10 107,20 107,48 97,58 19,58 9,48 9,20"
        fill="none" stroke={gris} strokeWidth="1" opacity=".55" />
      <path d="M58 0 l2.2 4.4 4.4 2.2-4.4 2.2L58 13.2l-2.2-4.4-4.4-2.2 4.4-2.2Z" fill={gris} />
      <text x="58" y="49" textAnchor="middle" fill={gris}
        style={{ font: `400 38px/1 ${FUENTE.display}`, letterSpacing: 1 }}>18+</text>
    </svg>
  )
}
