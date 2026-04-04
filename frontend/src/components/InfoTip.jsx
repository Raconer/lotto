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
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', marginLeft: 6, verticalAlign: 'middle' }}>
      <Info
        size={14}
        color="var(--t4)"
        style={{ cursor: 'pointer', transition: 'color 0.15s' }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); setShow(s => !s) }}
      />
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: 8,
          padding: '10px 14px',
          background: '#1e1e26',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          fontSize: 11,
          lineHeight: 1.6,
          color: 'var(--t1)',
          width: 260,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 1000,
          pointerEvents: 'none',
          animation: 'fadeIn 0.15s ease',
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1e1e26',
          }} />
        </div>
      )}
    </span>
  )
}
