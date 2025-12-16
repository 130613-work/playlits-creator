import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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

// --- COMPONENTES UI ---
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

const ShareModal = ({ show, data, onClose }) => {
  if (!show) return null;
  const webUrl = "https://zippy-sprinkles-8c1f3e.netlify.app";
  const playlistUrl = `https://open.spotify.com/playlist/${data.playlistId}`;
  const text = `¡Creé mi playlist "${data.name}"! 💜\n\nCréala tú aquí: ${webUrl}\n\nEscúchala aquí: ${playlistUrl}`;

  return (
    <div className="modal-overlay-2" style={{zIndex: 10001}}>
      <div className="share-content">
        <div style={{fontSize:'3rem', marginBottom:'15px'}}>🎉</div>
        <h2 className="share-title">¡Playlist Creada!</h2>
        <p className="share-text">Ya está disponible en tu Spotify.</p>
        
        <a href={playlistUrl} target="_blank" rel="noreferrer" style={{display:'block', marginBottom:'20px', color:'#1DB954', fontWeight:'bold', textDecoration:'none'}}>
          Abrir en Spotify ➜
        </a>

        <div className="share-buttons">
          <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn-share share-x">
            X (Twitter)
          </a>
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn-share share-wa">
            WhatsApp
          </a>
        </div>
        <button onClick={onClose} className="btn-close-text">Cerrar</button>
      </div>
    </div>
  );
};

const ConfirmModal = ({ show, title, message, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <div className="modal-overlay-2" style={{zIndex: 10002}}>
      <div className="modal-confirm-content">
        <span className="confirm-icon">⚠️</span>
        <h3>{title}</h3><p>{message}</p>
        <div className="confirm-actions">
          <button onClick={onCancel} className="btn-cancel">Cancelar</button>
          <button onClick={onConfirm} className="btn-danger">Sí, eliminar</button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [token, setToken] = useState(null);
  const [profile, setProfile] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', playlistId: null, playlistName: null });
  const [shareModal, setShareModal] = useState({ show: false, name: '', count: 0 });
  const [playingPreview, setPlayingPreview] = useState(null);
  const audioRef = useRef(new Audio());

  // Builder
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
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
  const [targetList, setTargetList] = useState(null);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [playlistTracks, setPlaylistTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  useEffect(() => {
    localStorage.setItem("bts_draft_tracks", JSON.stringify(draftTracks));
    updateStats(draftTracks);
  }, [draftTracks]);

  useEffect(() => {
    const hash = window.location.hash;
    let tokenToUse = window.localStorage.getItem("token");
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const tokenParam = params.get('access_token');
      if (tokenParam) {
        tokenToUse = tokenParam;
        window.localStorage.setItem("token", tokenParam);
        window.history.pushState({}, null, '/');
      }
    }
    if (tokenToUse) { setToken(tokenToUse); fetchProfile(tokenToUse); }
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

  // API REQUESTS
  const fetchProfile = async (tkn) => {
    try {
      const { data } = await axios.get("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${tkn}` } });
      setProfile(data); getPlaylists(tkn, data.id);
    } catch { logout(); }
  };

  const getPlaylists = async (tkn, uid) => {
    if (!tkn || !uid) return;
    try {
      const { data } = await axios.get("https://api.spotify.com/v1/me/playlists", { headers: { Authorization: `Bearer ${tkn}` }, params: { limit: 50 } });
      setPlaylists(data.items.filter(item => item.owner.id === uid));
    } catch (e) { console.error(e); }
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

  const startBuilder = () => { setDraftName(""); setDraftDesc(""); setSearchQuery(""); setSearchResults([]); setIsBuilderOpen(true); setCoverImage(null); };

  const addToDraft = (track, count) => {
    const newTracks = [...draftTracks];
    const art = track.artists ? track.artists[0].name : "Artista";
    const img = track.album?.images[2]?.url || track.album?.images[0]?.url || "";
    for(let i=0; i<count; i++) {
      newTracks.push({ id: track.id, name: track.name, artist: art, uri: track.uri, image: img, preview_url: track.preview_url, uniqueId: Math.random().toString(36) });
    }
    setDraftTracks(newTracks); showToast(`Agregada: ${track.name}`, 'success');
  };

  // --- LÓGICA DE MEZCLA Y ARRASTRE PARA EL CONSTRUCTOR ---
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
  // -------------------------------------------------------

  const publishDraft = async () => {
    if (btsCounter < 30) { showToast(`Faltan canciones (${btsCounter}/30)`, 'error'); return; }
    if (!draftName) { showToast("Falta el nombre", 'error'); return; }
    setLoading(true);
    try {
      const { data: { id } } = await axios.post(`https://api.spotify.com/v1/users/${profile.id}/playlists`, 
        { name: draftName, description: draftDesc || "Created with Creator for ARMY 💜", public: false }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const uris = draftTracks.map(t => t.uri);
      for(let i=0; i<uris.length; i+=100) {
        await axios.post(`https://api.spotify.com/v1/playlists/${id}/tracks`, { uris: uris.slice(i, i+100) }, { headers: { Authorization: `Bearer ${token}` } });
      }
      if (coverImage) {
        try {
            await axios.put(`https://api.spotify.com/v1/playlists/${id}/images`, coverImage.split(',')[1], { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' } });
        } catch(e) { console.error("Imagen falló", e); showToast("Playlist creada, pero la imagen falló (Permisos)", 'warning'); }
      }
      setShareModal({ show: true, name: draftName, count: draftTracks.length, playlistId: id });
      
      localStorage.removeItem("bts_draft_tracks"); 
      setDraftTracks([]); 
      setBtsCounter(0);
      setCoverImage(null); // Limpiamos la imagen también
      getPlaylists(token, profile.id);

    } catch (e) { 
      console.error(e);
      showToast("Error al crear", 'error'); 
    } 
    finally { 
      setLoading(false); 
    }
  };

  const searchSpotify = async (e) => {
    e.preventDefault(); if (!searchQuery) return;
    try {
      const { data } = await axios.get("https://api.spotify.com/v1/search", { headers: { Authorization: `Bearer ${token}` }, params: { q: searchQuery, type: "track", limit: 12 } });
      setSearchResults(data.tracks.items);
    } catch (e) { console.error(e); }
  };

  const initiateDelete = (id, name) => setConfirmModal({ show: true, title: '¿Eliminar?', message: `Se borrará "${name}".`, playlistId: id, playlistName: name });
  
  const executeDelete = async () => {
    if (!confirmModal.playlistId) return;
    try {
      await axios.delete(`https://api.spotify.com/v1/playlists/${confirmModal.playlistId}/followers`, { headers: { Authorization: `Bearer ${token}` } });
      getPlaylists(token, profile.id); showToast("Eliminada", 'success');
    } catch { showToast("Error al eliminar", 'error'); } 
    finally { setConfirmModal({ show: false, title: '', message: '', playlistId: null, playlistName: null }); }
  };

  const openManageEditor = async (pl) => {
    setEditingPlaylist(pl); setLoadingTracks(true);
    try {
      let tracks = [], url = `https://api.spotify.com/v1/playlists/${pl.id}/tracks?limit=50`;
      while(url) {
        const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        tracks = [...tracks, ...data.items]; url = data.next;
      }
      setPlaylistTracks(tracks.map((i, idx) => ({
        id: i.track.id, name: i.track.name, artist: i.track.artists[0].name,
        uri: i.track.uri, image: i.track.album.images[2]?.url, preview_url: i.track.preview_url,
        uniqueId: `${i.track.id}-${idx}-${Math.random()}`
      })));
    } catch { } setLoadingTracks(false);
  };

  const handleOnDragEnd = (res) => {
    if(!res.destination) return;
    const items = [...playlistTracks];
    const [reordered] = items.splice(res.source.index, 1);
    items.splice(res.destination.index, 0, reordered);
    setPlaylistTracks(items);
  };

  const saveOrder = async () => {
    if(!editingPlaylist) return;
    try {
      const uris = playlistTracks.map(t => t.uri);
      await axios.put(`https://api.spotify.com/v1/playlists/${editingPlaylist.id}/tracks`, { uris: uris.slice(0, 100) }, { headers: { Authorization: `Bearer ${token}` } });
      if(uris.length > 100) {
         for(let i=100; i<uris.length; i+=100) await axios.post(`https://api.spotify.com/v1/playlists/${editingPlaylist.id}/tracks`, { uris: uris.slice(i, i+100) }, { headers: { Authorization: `Bearer ${token}` } });
      }
      showToast("¡Guardado!", 'success'); setEditingPlaylist(null);
    } catch { showToast("Error al guardar", 'error'); }
  };

  const logout = () => { setToken(null); window.localStorage.removeItem("token"); window.scrollTo(0,0); window.location.href = "/"; };

  return (
    <div className="main-container">
      {toast.show && <Toast message={toast.message} type={toast.type} />}
      <ConfirmModal show={confirmModal.show} title={confirmModal.title} message={confirmModal.message} onConfirm={executeDelete} onCancel={() => setConfirmModal({show: false, title:'', message:'', playlistId:null, playlistName:null})} />
      <ShareModal show={shareModal.show} data={shareModal} onClose={() => { setShareModal({show:false}); setIsBuilderOpen(false); }} />

      {!token ? (
        <div className="login-screen">
          <h1 className="title-animate">💜 Creator for ARMY</h1>
          <a href="/.netlify/functions/login" className="btn-spotify pulsate">Iniciar Sesión</a>
        </div>
      ) : (
        <div className="dashboard">
          {profile && (
            <header className="user-header">
              <div className="user-info">
                {profile.images?.[0]?.url && <img src={profile.images[0].url} alt="Av" className="avatar" />}
                <div className="texts"><h2>Hola, {profile.display_name} ✌️</h2><p className="subtitle">ARMY Member</p></div>
              </div>
              <button onClick={logout} className="btn-logout">Salir</button>
            </header>
          )}

          {!isBuilderOpen ? (
            <>
              <div className="create-section"><button onClick={startBuilder} className="btn-action pulsate">✨ Crear Playlist</button></div>
              <section className="playlists-section">
                <h3>📂 Mis Playlists ({playlists.length})</h3>
                <div className="grid">
                  {playlists.map(pl => (
                    <div key={pl.id} className="card">
                      <div className="card-img-wrapper">{pl.images?.[0]?.url ? <img src={pl.images[0].url} alt="" /> : <div className="no-img">🎵</div>}</div>
                      <div className="card-content">
                        <h4>{pl.name}</h4><p>{pl.tracks.total} canciones</p>
                        <div className="btn-group">
                           <button onClick={() => openManageEditor(pl)} className="btn-manage">🎛️ Gestionar</button>
                           <button onClick={() => initiateDelete(pl.id, pl.name)} className="btn-delete">🗑️ Eliminar</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="builder-layout">
              <aside className="builder-sidebar">
                <button onClick={() => setIsBuilderOpen(false)} style={{background:'transparent', border:'none', color:'#777', cursor:'pointer'}}>⬅ Volver</button>
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
                
                {/* BOTÓN NUEVO: MEZCLA INTELIGENTE EN EL BUILDER */}
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
                  <input className="search-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar..." />
                  <button type="submit" className="btn-search-icon">🔍</button>
                </form>
                
                {searchResults.length > 0 && (
                  <div className="results-grid">
                    {searchResults.map(t => (
                      <div key={t.id} className="result-card" onClick={() => { setTrackToAdd(t); setTargetList('draft'); setRepetitionCount(1); }}>
                        {t.preview_url && <div className={`btn-add-mini ${playingPreview===t.preview_url?'pulsate':''}`} style={{left:5, right:'auto', background:playingPreview===t.preview_url?'#1db954':'#fff', color:playingPreview===t.preview_url?'#fff':'#000'}} onClick={(e)=>{e.stopPropagation(); handlePreview(t.preview_url)}}>▶</div>}
                        <div className="btn-add-mini">+</div>
                        <img src={t.album.images[1]?.url} alt="" />
                        <div className="result-info"><h5>{t.name}</h5><p>{t.artists[0].name}</p></div>
                      </div>
                    ))}
                  </div>
                )}

                {/* LISTA ARRASTRABLE EN EL CONSTRUCTOR */}
                <div className="track-list-container">
                  <h4 style={{color:'#a1a1aa', marginBottom:15}}>Canciones ({draftTracks.length})</h4>
                  
                  {draftTracks.length === 0 ? (
                    <p style={{textAlign:'center', color:'#555', marginTop:30}}>Tu lista está vacía.</p>
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
          )}

          {trackToAdd && (
            <div className="modal-overlay-2">
              <div className="modal-content-small">
                <h4>Agregar: {trackToAdd.name}</h4>
                <p>¿Cuántas veces?</p>
                <input type="number" min="1" max="50" className="input-number" value={repetitionCount} onChange={e => setRepetitionCount(e.target.value)} />
                <div className="modal-actions">
                  <button onClick={() => setTrackToAdd(null)} className="btn-cancel">Cancelar</button>
                  <button onClick={() => { if(targetList==='draft') addToDraft(trackToAdd, parseInt(repetitionCount)); setTrackToAdd(null); }} className="btn-confirm">Agregar</button>
                </div>
              </div>
            </div>
          )}

          {editingPlaylist && (
            <div className="modal-overlay">
              <div className="modal-content-large">
                <div className="modal-header-editor"><h3>{editingPlaylist.name}</h3><button className="btn-close-round" onClick={()=>setEditingPlaylist(null)}>✕</button></div>
                <div className="editor-controls-bar">
                  <button onClick={() => {
                    const s = [...playlistTracks]; for(let i=s.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[s[i],s[j]]=[s[j],s[i]];} setPlaylistTracks(s); showToast("Mezclado", 'success');
                  }} className="btn-magic">Mezclar</button>
                  <button onClick={saveOrder} className="btn-save">Guardar</button>
                </div>
                <DragDropContext onDragEnd={handleOnDragEnd}>
                  <Droppable droppableId="list">
                    {(prov) => (
                      <div className="track-list-scroll" {...prov.droppableProps} ref={prov.innerRef}>
                        {loadingTracks ? (
                          <div className="loading-container">
                            <div className="heart-loader"></div>
                            <span className="loading-text">CARGANDO...</span>
                          </div>
                        ) : playlistTracks.map((t, i) => (
                          <Draggable key={t.uniqueId} draggableId={t.uniqueId} index={i}>
                            {(p, s) => (
                              <div className={`track-row-editor ${s.isDragging?'is-dragging':''}`} ref={p.innerRef} {...p.draggableProps}>
                                <div className="drag-handle" {...p.dragHandleProps}>⠿</div>
                                <span className="track-index-label">{i+1}</span>
                                <img src={t.image||'https://via.placeholder.com/40'} className="track-img-editor" alt="" />
                                <div className="track-info-editor"><span className="track-title-editor">{t.name}</span><span className="track-artist-editor">{t.artist}</span></div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
