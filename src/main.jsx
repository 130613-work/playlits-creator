import React from 'react' // <--- ESTA LÍNEA ES LA QUE FALTABA
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Si te da error aquí después, quita esta línea, pero probemos así.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)