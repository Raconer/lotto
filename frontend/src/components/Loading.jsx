export default function Loading({ text = '로딩 중...' }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  )
}
