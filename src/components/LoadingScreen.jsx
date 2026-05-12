import '../assets/LoadingScreen.css'

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-bars">
          <div className="bar bar-1"></div>
          <div className="bar bar-2"></div>
          <div className="bar bar-3"></div>
          <div className="bar bar-4"></div>
        </div>
        <span className="loading-wordmark">MetroTask</span>
        <span className="loading-text">Loading your workspace…</span>
      </div>
    </div>
  )
}

export default LoadingScreen