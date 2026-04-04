import { useState, useRef, useEffect } from 'react'
import { Info } from 'lucide-react'

export default function InfoTip({ text }) {
  const [show, setShow] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!show) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShow(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [show])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', marginLeft: 4, verticalAlign: 'middle' }}>
      <Info size={13} color="var(--t4)" style={{ cursor: 'pointer' }}
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); setShow(s => !s) }} />
      {show && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 8, padding: '8px 12px',
          background: 'var(--tooltip-bg)', border: '1px solid var(--tooltip-border)',
          borderRadius: 8, fontSize: 11, lineHeight: 1.6, color: 'var(--t1)', width: 240,
          boxShadow: '0 6px 20px rgba(0,0,0,0.12)', zIndex: 1000, pointerEvents: 'none',
          animation: 'fadeIn 0.12s ease',
        }}>
          {text}
        </div>
      )}
    </span>
  )
}
