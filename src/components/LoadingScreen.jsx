import '../assets/LoadingScreen.css'
import logo from "../assets/mlogo.png"

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <img 
          alt='Site logo' 
          src={logo} 
          style={{ width: '65px', height: '65px', objectFit: 'contain' }}
          />
        <span className="loading-wordmark">MTopshiriq</span>
        <span className="loading-text">Ma'lumotlar yuklanmoqda…</span>
      </div>
    </div>
  )
}

export default LoadingScreen