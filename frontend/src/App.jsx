import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  History, 
  Trash2, 
  Leaf, 
  AlertCircle, 
  Calendar, 
  Clock, 
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import './App.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing...');
  const [error, setError] = useState(null);
  const [activeHistoryId, setActiveHistoryId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const fileInputRef = useRef(null);

  // Fetch prediction history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  // Drag handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processAndPredict(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processAndPredict(e.target.files[0]);
    }
  };

  const processAndPredict = async (file) => {
    // Basic file type validation
    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image file (PNG, JPEG, WebP, etc.).');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setActiveHistoryId(null);
    
    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setPrediction(null);
    setLoading(true);

    // Dynamic loading texts to keep the user engaged
    const steps = [
      'Uploading image to engine...',
      'Preprocessing image (224x224, RGB)...',
      'Normalizing feature matrices...',
      'Running ResNet-18 neural network inference...',
      'Mapping class probabilities...'
    ];
    
    let stepIdx = 0;
    setLoadingText(steps[0]);
    const interval = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        stepIdx++;
        setLoadingText(steps[stepIdx]);
      }
    }, 400);

    // Call Predict API
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/predict`, {
        method: 'POST',
        body: formData,
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error(`Server returned error status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setPrediction({
          prediction: result.prediction,
          confidence: result.confidence,
          top_5: result.top_5,
          filename: result.filename
        });
        // Refresh history log
        fetchHistory();
      } else {
        throw new Error('Prediction failed.');
      }
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setError(`Classification failed: ${err.message || err}. Ensure the backend server is running.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setShowClearConfirm(true);
  };

  const confirmClearHistory = async () => {
    setShowClearConfirm(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/history/clear`, {
        method: 'POST',
      });
      if (response.ok) {
        setHistory([]);
        // Reset current display if showing a history item
        if (activeHistoryId) {
          resetClassifier();
        }
      }
    } catch (err) {
      console.error('Error clearing history:', err);
      setError('Could not clear history database.');
    }
  };

  const selectHistoryItem = (item) => {
    setActiveHistoryId(item.id);
    setError(null);
    setPrediction({
      prediction: item.prediction,
      confidence: item.confidence,
      top_5: item.top_5,
      filename: item.filename
    });
    setPreviewUrl(item.image_base64);
  };

  const resetClassifier = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setPrediction(null);
    setError(null);
    setActiveHistoryId(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to format date nicely
  const formatTimestamp = (tsStr) => {
    try {
      // SQLite format is typically "YYYY-MM-DD HH:MM:SS" (UTC or local depending on storage)
      // Let's parse it and format
      const date = new Date(tsStr.replace(' ', 'T'));
      if (isNaN(date.getTime())) return tsStr;
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const hours = Math.floor(diffMins / 60);
      if (hours < 24) return `${hours}h ago`;
      
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return tsStr;
    }
  };

  // Helper to trigger file browse click
  const triggerBrowse = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo-container">
          <Leaf className="logo-icon" size={32} />
          <div>
            <h1 className="logo-text">AgriVision</h1>
            <p className="tagline">Neural Crop & Fruit Intelligence</p>
          </div>
        </div>
        <div className="api-badge">
          ResNet-18 Model Engine Active
        </div>
      </header>

      <main className="main-grid">
        {/* Left Side: Classifier Card & Prediction Result */}
        <section className="glass-panel classifier-card">
          <div>
            <h2 className="section-title">
              <Sparkles size={20} className="logo-icon" />
              AI Inference Terminal
            </h2>
            <p className="section-subtitle">
              Upload or drop a fruit/crop image to compute model logits and classification probabilities
            </p>
          </div>

          {error && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Dropzone / Preview */}
          {!previewUrl ? (
            <div 
              className={`dropzone ${dragActive ? 'active' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerBrowse}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden-file-input"
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
              />
              <UploadCloud className="dropzone-icon" size={48} />
              <p className="dropzone-text">Drag & drop your fruit image here</p>
              <p className="dropzone-subtext">Supports PNG, JPG, JPEG, and WebP formats</p>
              <button type="button" className="browse-btn">
                Browse Files
              </button>
            </div>
          ) : (
            <div className="preview-container">
              {loading && (
                <div className="loading-overlay">
                  <div className="spinner-ring"></div>
                  <span className="loading-text">{loadingText}</span>
                </div>
              )}
              <img src={previewUrl} alt="Fruit upload" className="preview-image" />
              <div className="preview-overlay">
                <div className="image-info">
                  <span className="filename-text">{selectedFile ? selectedFile.name : 'Historical Record'}</span>
                </div>
                <button className="change-image-btn" onClick={resetClassifier} disabled={loading}>
                  <RotateCcw size={14} />
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Inference Results */}
          {prediction && !loading && (
            <div className="result-container">
              <div className="primary-result-card">
                <div className="result-labels">
                  <span className="result-tag">Predicted Category</span>
                  <span className="result-name">{prediction.prediction}</span>
                </div>
                
                {/* SVG Progress Circle for confidence */}
                <div className="confidence-badge-container" title={`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`}>
                  <svg width="72" height="72" className="confidence-circle">
                    {/* Background track circle */}
                    <circle 
                      cx="36" 
                      cy="36" 
                      r="30" 
                      fill="transparent" 
                      stroke="rgba(255, 255, 255, 0.05)" 
                      strokeWidth="5" 
                    />
                    {/* Animated value circle */}
                    <circle 
                      cx="36" 
                      cy="36" 
                      r="30" 
                      fill="transparent" 
                      stroke="var(--accent-primary)" 
                      strokeWidth="5" 
                      strokeDasharray={2 * Math.PI * 30}
                      strokeDashoffset={2 * Math.PI * 30 * (1 - prediction.confidence)}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                    />
                  </svg>
                  <span className="confidence-value-text">
                    {Math.round(prediction.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* Top 5 list */}
              <div>
                <h3 className="section-title" style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
                  Top 5 Classification Probabilities
                </h3>
                <div className="top-predictions-list">
                  {prediction.top_5.map((pred, index) => {
                    const pct = Math.round(pred.confidence * 100);
                    // Determine fill color and progress color based on score
                    const color = index === 0 
                      ? 'var(--accent-primary)' 
                      : pred.confidence > 0.15 
                        ? 'var(--accent-secondary)' 
                        : 'rgba(255, 255, 255, 0.3)';
                    
                    const glow = index === 0 ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' : 'none';
                    
                    return (
                      <div className="top-prediction-row" key={pred.class_name}>
                        <div className="prediction-row-header">
                          <span className="row-name">
                            {index + 1}. {pred.class_name}
                          </span>
                          <span 
                            className={`row-val ${index === 0 ? 'high' : pred.confidence > 0.15 ? 'med' : ''}`}
                          >
                            {pct}%
                          </span>
                        </div>
                        <div className="progress-track">
                          <div 
                            className="progress-fill" 
                            style={{ 
                              width: `${pct}%`, 
                              backgroundColor: color,
                              filter: glow
                            }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Prediction History Logs */}
        <section className="glass-panel history-card">
          <div className="history-header">
            <div>
              <h2 className="section-title">
                <History size={20} className="logo-icon" />
                Prediction Logs
              </h2>
              <p className="section-subtitle" style={{ marginBottom: 0 }}>
                Historical uploads and inference records stored locally
              </p>
            </div>
            {history.length > 0 && (
              <button className="clear-history-btn" onClick={handleClearHistory} title="Clear database logs">
                <Trash2 size={15} />
                Clear
              </button>
            )}
          </div>

          <div className="history-items-list">
            {history.length === 0 ? (
              <div className="no-history-state">
                <History className="no-history-icon" size={48} />
                <p className="no-history-text">No prediction history logged yet</p>
                <p className="dropzone-subtext">Classified images will appear here for audit review</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  className={`history-item-row ${activeHistoryId === item.id ? 'selected' : ''}`}
                  key={item.id}
                  onClick={() => selectHistoryItem(item)}
                >
                  <img src={item.image_base64} alt={item.prediction} className="history-thumb" />
                  <div className="history-details">
                    <span className="history-name">{item.prediction}</span>
                    <div className="history-meta">
                      <span className="history-score">
                        {Math.round(item.confidence * 100)}% Match
                      </span>
                      <span className="history-time" title={item.timestamp}>
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer>
        <p>
          AgriVision powered by HiNacho &copy; 2026. Built with <span className="heart-icon">&hearts;</span> for Agricultural Innovation.
        </p>
      </footer>

      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header-section">
              <div className="modal-icon-container">
                <Trash2 size={20} />
              </div>
              <span className="modal-title-text">Clear Prediction Logs?</span>
            </div>
            <p className="modal-body-text">
              This action will permanently delete all local prediction records and historical image scans from the database. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button 
                className="modal-btn modal-btn-cancel" 
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn modal-btn-danger" 
                onClick={confirmClearHistory}
              >
                Yes, Clear Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
