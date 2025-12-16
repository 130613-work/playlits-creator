import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import html2canvas from 'html2canvas'; 
import './App.css';

// --- COLORES BIAS ---
const MEMBER_COLORS = { "Jimin": "#FFD700", "Jung Kook": "#8A2BE2", "V": "#008000", "SUGA": "#000000", "Jin": "#FF69B4", "j-hope": "#FF0000", "RM": "#0000FF", "BTS": "#FFFFFF" };

// --- UTILIDAD: COMPRESOR DE IMAGENES ---
const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      }
    }
  });
};

// --- TOAST ---
const Toast = ({ message, type }) => {
  if (!message) return null;
  const styles = {
    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
    background: type === 'error' ? 'rgba(220, 38, 38, 0.95)' : 'rgba(21, 128, 61, 0.95)',
    color: 'white', padding: '12px 24px', borderRadius: '50px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.6)', zIndex: 11000, fontWeight: 'bold',
    display: 'flex', alignItems: 'center', gap: '10px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'
  };
  return <div style={styles}><span>{type === 'error' ? '⚠️' : '✅'}</span> {message}</div>;
};

// --- SHARE MODAL ---
const ShareModal = ({ show, data, onClose }) => {
  if (!show) return null;

  const webUrl = "https://zippy-sprinkles-8c1f3e.netlify.app"; 
  const playlistUrl = `https://open.spotify.com/playlist/${data.playlistId}`;
  const text = `¡Creé mi playlist "${data.name}"! 💜\n\nCréala tú aquí: ${webUrl}\n\nEscúchala aquí: ${playlistUrl}`;

  const handleDownloadCard = async () => {
    const element = document.getElementById('bts-photocard');
    if(element) {
      const canvas = await html2canvas(element, { backgroundColor: null, scale: 2 });
      const link = document.createElement('a');
      link.download = `BTS_Playlist_${data.name}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="modal-overlay-2" style={{zIndex: 10001, overflowY: 'auto'}}>
      <div className="share-content" style={{maxWidth:'500px', marginTop:'50px'}}>
        <h2 className="share-title">¡Misión Cumplida! 🎉</h2>
        <p className="share-text">Tu playlist ya está en Spotify.</p>

        {/* --- PHOTOCARD --- */}
        <div className="photocard-preview-container">
          <div id="bts-photocard" className="photocard-node">
            <span className="pc-header">OFFICIAL ARMY PLAYLIST</span>
            {data.image ? <img src={data.image} alt="" className="pc-image"/> : <div className="pc-image" style={{display:'flex',alignItems:'center',justifyContent:'center', fontSize:'4rem', background:'#111'}}>🎵</div>}
            <h3 className="pc-title">{data.name}</h3>
            <span className="pc-subtitle">Curated by ARMY</span>
            <div className="pc-stats">
              <span className="pc-stat-item"><span className="purple-txt">{data.count}</span> Canciones</span>
              <span className="pc-stat-item">|</span>
              <span className="pc-stat-item"><span className="purple-txt">100%</span> BTS</span>
            </div>
            <div className="pc-footer">CREATOR FOR ARMY • {new Date().getFullYear()}</div>
          </div>
        </div>

        <button onClick={handleDownloadCard} className="btn-download-card">📸 Descargar Photocard</button>

        <a href={playlistUrl} target="_blank" rel="noreferrer" style={{display:'block', margin:'20px 0', color:'#1DB954', fontWeight:'bold', textDecoration:'none'}}>Abrir en Spotify ➜</a>
        
        <div className="share-buttons">
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn-share share-x">X (Twitter)</a>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn-share share-wa">WhatsApp</a>
        </div>
        <button onClick={onClose} className="btn-close-text">Cerrar</button>
      </div>
    </div>
  );
};

// --- APP PRINCIPAL ---
function App() {
  const [token, setToken] = useState(null); 
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [shareModal, setShareModal] = useState({ show: false, name: '', count: 0 });
  const [playingPreview, setPlayingPreview] = useState(null);
  const audioRef = useRef(new Audio());

  // Builder
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftTracks, setDraftTracks] = useState(() => JSON.parse(localStorage.getItem("bts_draft_tracks")) || []);
  const [coverImage, setCoverImage] = useState(null);
  const [btsCounter, setBtsCounter] = useState(0);
  const [biasStats, setBiasStats] = useState({});
  
  // General
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  // Edit
  const [trackToAdd, setTrackToAdd] = useState(null);
  const [repetitionCount, setRepetitionCount] = useState(1);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    localStorage.setItem("bts_draft_tracks", JSON.stringify(draftTracks));
    updateStats(draftTracks);
  }, [draftTracks]);

  // --- AUTOMÁTICO: Obtener token al iniciar ---
  useEffect(() => {
    const getToken = async () => {
        try {
            // Pedimos token al servidor para poder buscar canciones
            const { data } = await axios.get('/.netlify/functions/get_token');
            setToken(data.access_token);
        } catch (error) {
            console.error("Error conectando con servidor", error);
        }
    };
    getToken();
  }, []);

  const handlePreview = (url) => {
    if (!url) { showToast("Sin vista previa 😢", 'error'); return; }
    if (playingPreview === url) { audioRef.current.pause(); setPlayingPreview(null); }
    else { audioRef.current.src = url; audioRef.current.volume = 0.5; audioRef.current.play(); setPlayingPreview(url); }
  };
  useEffect(() => { audioRef.current.onended = () => setPlayingPreview(null); return () => audioRef.current.pause(); }, []);

  const getMemberFromTrack = (track) => {
    let names = track.artist || (track.artists ? track.artists.map(a=>a.name).join(", ") : "") || "";
    if (names.includes("Jimin")) return "Jimin";
    if (names.match(/Jung\s?Kook/i)) return "Jung Kook";
    if (names.match(/V|Taehyung/)) return "V";
    if (names.match(/SUGA|Agust D/i)) return "SUGA";
    if (names.includes("Jin")) return "Jin";
    if (names.includes("j-hope")) return "j-hope";
    if (names.includes("RM")) return "RM";
    if (names.includes("BTS")) return "BTS";
    return "Otro";
  };

  const updateStats = (tracks) => {
    let count = 0; const stats = {};
    tracks.forEach(t => { const m = getMemberFromTrack(t); if(m!=="Otro"){ count++; stats[m] = (stats[m]||0)+1; } });
    setBtsCounter(count); setBiasStats(stats);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match(/image\/(jpeg|jpg|png)/)) { showToast("Solo imágenes (JPG/PNG)", "error"); return; }
      try {
        const compressedBase64 = await compressImage(file);
        setCoverImage(compressedBase64);
        showToast("Imagen lista y optimizada 📷", "success");
      } catch (err) { showToast("Error al procesar imagen", "error"); }
    }
  };

  const addToDraft = (track, count) => {
    const newTracks = [...draftTracks];
    const art = track.artists ? track.artists[0].name : "Artista";
    const img = track.album?.images[2]?.url || track.album?.images[0]?.url || "";
    for(let i=0; i<count; i++) {
      newTracks.push({ id: track.id, name: track.name, artist: art, uri: track.uri, image: img, preview_url: track.preview_url, uniqueId: Math.random().toString(36) });
    }
    setDraftTracks(newTracks); showToast(`Agregada: ${track.name}`, 'success');
  };

  const handleDraftDragEnd = (res) => {
    if(!res.destination) return;
    const items = [...draftTracks];
    const [reordered] = items.splice(res.source.index, 1);
    items.splice(res.destination.index, 0, reordered);
    setDraftTracks(items);
  };

  const shuffleDraft = () => {
    const s = [...draftTracks]; 
    for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];} 
    setDraftTracks(s); 
    showToast("¡Mezcla Inteligente Aplicada! 🔀", 'success');
  };

  // --- PUBLICAR SIN LOGIN ---
  const publishDraft = async () => {
    if (btsCounter < 30) { showToast(`Faltan canciones (${btsCounter}/30)`, 'error'); return; }
    if (!draftName) { showToast("Falta el nombre", 'error'); return; }
    
    setLoading(true);
    try {
      // Enviamos la petición a TU servidor para que él cree la playlist
      const payload = {
          name: draftName,
          description: draftDesc || "Created with Creator for ARMY 💜",
          uris: draftTracks.map(t => t.uri),
          imageBase64: coverImage ? coverImage.split(',')[1] : null
      };

      const { data } = await axios.post('/.netlify/functions/create_playlist', payload);

      setShareModal({ 
          show: true, 
          name: draftName, 
          count: draftTracks.length, 
          playlistId: data.id, 
          image: coverImage 
      });
      
      localStorage.removeItem("bts_draft_tracks"); 
      setDraftTracks([]); 
      setBtsCounter(0);
      setCoverImage(null);

    } catch (e) { 
      console.error(e);
      showToast("Error creando playlist. Intenta de nuevo.", 'error'); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  const searchSpotify = async (e) => {
    e.preventDefault(); 
    if (!searchQuery) return;
    if (!token) { showToast("Conectando con Spotify...", "warning"); return; }
    
    try {
      // Usamos el token que nos dio el servidor
      const { data } = await axios.get("https://api.spotify.com/v1/search", { 
          headers: { Authorization: `Bearer ${token}` }, 
          params: { q: searchQuery, type: "track", limit: 12 } 
      });
      setSearchResults(data.tracks.items);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="main-container">
      {toast.show && <Toast message={toast.message} type={toast.type} />}
      <ShareModal show={shareModal.show} data={shareModal} onClose={() => { setShareModal({show:false}); }} />

      <div className="builder-layout" style={{minHeight: '100vh'}}>
          <aside className="builder-sidebar">
            <h2 style={{color:'white', marginBottom: 20}}>💜 ARMY Creator</h2>

            <div className={`playlist-cover-gen ${draftTracks.length>0?'active':''}`} onClick={()=>document.getElementById('fu').click()}>
              {coverImage ? <img src={coverImage} alt="" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'16px'}} /> : (draftTracks.length>0 ? '🎵' : '+')}
              <input id="fu" type="file" accept="image/*" hidden onChange={handleImageUpload} />
            </div>
            <input className="input-title" placeholder="Título..." value={draftName} onChange={e => setDraftName(e.target.value)} />
            <textarea className="input-desc" placeholder="Descripción..." value={draftDesc} onChange={e => setDraftDesc(e.target.value)} maxLength={300} />
            
            {Object.keys(biasStats).length > 0 && btsCounter > 0 && (
              <div className="bias-box">
                <div className="bias-header"><span>Bias Analyzer</span><span>{btsCounter}/30</span></div>
                <div className="bias-bar">
                  {Object.entries(biasStats).map(([m, c]) => <div key={m} className="bias-seg" style={{width:`${(c/btsCounter)*100}%`, background:MEMBER_COLORS[m]||'#555'}} />)}
                </div>
                <div className="bias-legend">
                  {Object.entries(biasStats).map(([m, c]) => <div key={m}><span className="legend-dot" style={{background:MEMBER_COLORS[m]||'#555'}}></span>{m}</div>)}
                </div>
              </div>
            )}
            
            {draftTracks.length > 2 && (
              <button className="btn-shuffle-smart" onClick={shuffleDraft}>
                🔀 Mezcla Inteligente
              </button>
            )}

            <button className="btn-publish-big" onClick={publishDraft} disabled={btsCounter<30 || loading}>
              {loading ? "Creando..." : (btsCounter<30 ? `Faltan ${30-btsCounter}` : "PUBLICAR")}
            </button>
          </aside>

          <main className="builder-content">
            <form onSubmit={searchSpotify} className="search-bar-wrapper">
              <input className="search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar canciones de BTS..." />
              <button type="submit" className="btn-search-icon">🔍</button>
            </form>
            
            {searchResults.length > 0 && (
              <div className="results-grid">
                {searchResults.map(t => (
                  <div key={t.id} className="result-card" onClick={() => { setTrackToAdd(t); setRepetitionCount(1); }}>
                    {t.preview_url && <div className={`btn-add-mini ${playingPreview===t.preview_url?'pulsate':''}`} style={{left:5, right:'auto', background:playingPreview===t.preview_url?'#1db954':'#fff', color:playingPreview===t.preview_url?'#fff':'#000'}} onClick={(e)=>{e.stopPropagation(); handlePreview(t.preview_url)}}>▶</div>}
                    <div className="btn-add-mini">+</div>
                    <img src={t.album.images[1]?.url} alt="" />
                    <div className="result-info"><h5>{t.name}</h5><p>{t.artists[0].name}</p></div>
                  </div>
                ))}
              </div>
            )}

            <div className="track-list-container">
              <h4 style={{color:'#a1a1aa', marginBottom:15}}>Canciones ({draftTracks.length})</h4>
              
              {draftTracks.length === 0 ? (
                <div style={{textAlign:'center', color:'#555', marginTop:50}}>
                    <h1 style={{opacity:0.2}}>💜</h1>
                    <p>Agrega canciones para empezar.</p>
                </div>
              ) : (
                <DragDropContext onDragEnd={handleDraftDragEnd}>
                  <Droppable droppableId="draft-list">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps}>
                        {draftTracks.map((t, i) => (
                          <Draggable key={t.uniqueId} draggableId={t.uniqueId} index={i}>
                            {(provided, snapshot) => (
                              <div 
                                className={`list-row ${snapshot.isDragging ? 'is-dragging' : ''}`}
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                              >
                                <div className="drag-handle" {...provided.dragHandleProps} style={{fontSize:'1.2rem', cursor:'grab'}}>⠿</div>
                                <span style={{color:'#71717a', fontWeight:'bold', fontSize:'0.9rem'}}>{i+1}</span>
                                <img src={t.image} alt="" style={{width:48, height:48, borderRadius:6, objectFit:'cover'}}/>
                                <div className="row-info">
                                  <h6 style={{margin:0, color:'white', fontSize:'0.95rem'}}>{t.name}</h6>
                                  <span style={{fontSize:'0.8rem', color:'#a1a1aa'}}>{t.artist}</span>
                                </div>
                                {getMemberFromTrack(t)!=="Otro" && <span className="tag-bts">BTS</span>}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </div>
          </main>
      </div>

      {trackToAdd && (
        <div className="modal-overlay-2">
          <div className="modal-content-small">
            <h4>Agregar: {trackToAdd.name}</h4>
            <p>¿Cuántas veces?</p>
            <input type="number" min="1" max="50" className="input-number" value={repetitionCount} onChange={e => setRepetitionCount(e.target.value)} />
            <div className="modal-actions">
              <button onClick={() => setTrackToAdd(null)} className="btn-cancel">Cancelar</button>
              <button onClick={() => { addToDraft(trackToAdd, parseInt(repetitionCount)); setTrackToAdd(null); }} className="btn-confirm">Agregar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
