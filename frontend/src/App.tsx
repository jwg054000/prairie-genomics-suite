import React from 'react';

function App() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '600px', padding: '40px' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
          🧬 Prairie Genomics Suite
        </h1>
        <p style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '30px' }}>
          Making genomics analysis accessible to every researcher
        </p>
        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '10px', 
          padding: '20px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ marginBottom: '15px' }}>✅ Frontend is Running!</h2>
          <p>The Prairie Genomics Suite frontend application has started successfully.</p>
          <p style={{ marginTop: '15px', fontSize: '0.9rem' }}>
            This is a genomics analysis platform designed to help researchers analyze RNA-seq data, 
            create visualizations, and collaborate on projects.
          </p>
        </div>
        <div style={{ marginTop: '30px', fontSize: '0.9rem', opacity: 0.8 }}>
          <p>🌐 Frontend: Running on http://localhost:3000</p>
          <p>🔧 Backend: Will be available on http://localhost:4000 when started</p>
        </div>
      </div>
    </div>
  );
}

export default App;