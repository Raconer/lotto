function getBallClass(num) {
  if (num <= 10) return 'r1'
  if (num <= 20) return 'r2'
  if (num <= 30) return 'r3'
  if (num <= 40) return 'r4'
  return 'r5'
}

export default function LottoBall({ number, size = 44 }) {
  return (
    <span
      className={`lotto-ball ${getBallClass(number)}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {number}
    </span>
  )
}

export function BallGroup({ numbers, size = 44 }) {
  return (
    <div className="ball-group">
      {numbers.map((n, i) => (
        <LottoBall key={i} number={n} size={size} />
      ))}
    </div>
  )
}
