import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Launch from './screens/Launch'
import AgeGate from './screens/AgeGate'
import ClipDetail from './screens/ClipDetail'
import Wallet from './screens/Wallet'
import CreatorProfile from './screens/CreatorProfile'
import Upload from './screens/Upload'
import Earnings from './screens/Earnings'
import Library from './screens/Library'
import Chat from './screens/Chat'

export const SCREENS = [
  { path: '/',          n: '00', title: 'Launch',         el: <Launch /> },
  { path: '/age',       n: '01', title: 'Age gate',       el: <AgeGate /> },
  { path: '/clip',      n: '02', title: 'Clip + paywall', el: <ClipDetail /> },
  { path: '/wallet',    n: '03', title: 'Wallet',         el: <Wallet /> },
  { path: '/creator',   n: '04', title: 'Creator',        el: <CreatorProfile /> },
  { path: '/upload',    n: '05', title: 'Upload',         el: <Upload /> },
  { path: '/earnings',  n: '06', title: 'Earnings',       el: <Earnings /> },
  { path: '/library',   n: '07', title: 'Library',        el: <Library /> },
  { path: '/chat',      n: '08', title: 'Chat',           el: <Chat /> },
]

/* Indice de pantallas: andamio de prototipo, no parte del producto.
   Permite saltar a cualquier pantalla al enseñarlo, sin recorrer el flujo. */
function ScreenIndex() {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const here = useLocation().pathname

  const go = (p: string) => { nav(p); setOpen(false) }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Indice de pantallas"
        style={{
          position: 'fixed', right: 14, bottom: 14, zIndex: 9999,
          width: 44, height: 44, borderRadius: '50%', border: 'none',
          background: open ? '#C8FF3D' : 'rgba(255,43,209,.92)',
          color: open ? '#08080A' : '#fff', cursor: 'pointer',
          font: "700 15px/1 'Space Grotesk', system-ui, sans-serif",
          boxShadow: '0 4px 22px rgba(0,0,0,.5)',
        }}>
        {open ? '×' : '☰'}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9998,
            background: 'rgba(8,8,10,.93)', backdropFilter: 'blur(6px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            padding: '24px 18px 78px', boxSizing: 'border-box',
          }}>
          <div style={{
            font: "700 10px/1 'Space Grotesk', system-ui, sans-serif",
            letterSpacing: 2.4, textTransform: 'uppercase',
            color: '#6E6A72', marginBottom: 14,
          }}>
            RAWstudio · 9 pantallas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SCREENS.map(s => {
              const active = s.path === here
              return (
                <div
                  key={s.path}
                  onClick={e => { e.stopPropagation(); go(s.path) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '13px 12px', cursor: 'pointer',
                    background: active ? 'rgba(255,43,209,.14)' : 'transparent',
                    borderLeft: `2px solid ${active ? '#FF2BD1' : 'transparent'}`,
                  }}>
                  <span style={{
                    font: "700 10px/1 'Space Mono', monospace",
                    color: '#08080A', background: active ? '#FF2BD1' : '#C8FF3D',
                    padding: '5px 6px',
                  }}>{s.n}</span>
                  <span style={{
                    font: "500 15px/1 'Space Grotesk', system-ui, sans-serif",
                    color: active ? '#fff' : '#9C979F',
                  }}>{s.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        {SCREENS.map(s => <Route key={s.path} path={s.path} element={s.el} />)}
        <Route path="*" element={<Launch />} />
      </Routes>
      <ScreenIndex />
    </>
  )
}
