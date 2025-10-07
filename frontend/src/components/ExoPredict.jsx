import React, { useState, useEffect } from 'react';

export default function ExoPredict() {
  const [kepid, setKepid] = useState('');
  const [features, setFeatures] = useState({});
  const [availableFeatures, setAvailableFeatures] = useState([]);
  const [prob, setProb] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('kepid'); // 'kepid', 'custom', or 'csv'
  const [csvFile, setCsvFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  // Fetch available features from backend
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await fetch("http://localhost:8000/features");
        const data = await res.json();
        setAvailableFeatures(data.features);
        
        // Initialize features state with empty values
        const initialFeatures = {};
        data.features.forEach(feature => {
          initialFeatures[feature] = '';
        });
        setFeatures(initialFeatures);
      } catch (err) {
        console.error('Failed to fetch features:', err);
      }
    };
    fetchFeatures();
  }, []);

  const handleFeatureChange = (featureName, value) => {
    setFeatures(prev => ({
      ...prev,
      [featureName]: value
    }));
  };

  const predictByKepid = async () => {
    if (!kepid) {
      setError('Please enter a KepID');
      return;
    }

    setLoading(true);
    setError(null);
    setProb(null);

    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kepid: parseInt(kepid) })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Prediction failed');
      }

      const data = await res.json();
      setProb(data.probability_of_planet);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const predictByCustomFeatures = async () => {
    setLoading(true);
    setError(null);
    setProb(null);

    try {
      // Convert feature values to numbers and filter out empty values
      const featureData = {};
      let hasAllFeatures = true;
      
      for (const [key, value] of Object.entries(features)) {
        if (value === '' || value === null || value === undefined) {
          hasAllFeatures = false;
          break;
        }
        featureData[key] = parseFloat(value);
      }

      if (!hasAllFeatures) {
        throw new Error('Please fill in all feature values');
      }

      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ features: featureData })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Prediction failed');
      }

      const data = await res.json();
      setProb(data.probability_of_planet);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillSampleData = () => {
    // Realistic sample data based on typical exoplanet values
    const sampleData = {
      koi_period: 10.5,
      koi_time0bk: 134.1,
      koi_impact: 0.5,
      koi_duration: 2.5,
      koi_depth: 100,
      koi_prad: 2.0,
      koi_teq: 500,
      koi_insol: 1.0,
      koi_model_snr: 10,
      koi_steff: 5500,
      koi_slogg: 4.5,
      koi_srad: 1.0,
      // Add more common features with reasonable defaults
      koi_tce_plnt_num: 1,
      koi_tce_delivname: 1,
      koi_score: 0.9,
      ra: 290.0,
      dec: 45.0
    };

    // Fill features with sample data or reasonable defaults
    const updatedFeatures = {};
    availableFeatures.forEach(feature => {
      if (sampleData[feature] !== undefined) {
        updatedFeatures[feature] = sampleData[feature];
      } else {
        // Provide reasonable defaults based on feature name patterns
        if (feature.includes('period')) updatedFeatures[feature] = 10.0;
        else if (feature.includes('temp') || feature.includes('teq')) updatedFeatures[feature] = 500;
        else if (feature.includes('radius') || feature.includes('rad')) updatedFeatures[feature] = 1.0;
        else if (feature.includes('mass')) updatedFeatures[feature] = 1.0;
        else if (feature.includes('impact')) updatedFeatures[feature] = 0.5;
        else if (feature.includes('duration')) updatedFeatures[feature] = 2.5;
        else if (feature.includes('depth')) updatedFeatures[feature] = 100;
        else if (feature.includes('snr')) updatedFeatures[feature] = 10;
        else if (feature.includes('steff')) updatedFeatures[feature] = 5500;
        else if (feature.includes('logg') || feature.includes('slogg')) updatedFeatures[feature] = 4.5;
        else if (feature.includes('insol')) updatedFeatures[feature] = 1.0;
        else if (feature.includes('time')) updatedFeatures[feature] = 134.1;
        else if (feature.includes('score')) updatedFeatures[feature] = 0.9;
        else if (feature.includes('ra')) updatedFeatures[feature] = 290.0;
        else if (feature.includes('dec')) updatedFeatures[feature] = 45.0;
        else updatedFeatures[feature] = 1.0; // Default fallback
      }
    });
    setFeatures(updatedFeatures);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        setCsvFile(null);
        return;
      }
      setCsvFile(file);
      setError(null);
      setUploadStatus(`Selected: ${file.name}`);
    }
  };

  const predictFromCSV = async () => {
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadStatus('Uploading and processing...');

    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await fetch("http://localhost:8000/predict-csv", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'CSV prediction failed');
      }

      // Download the result CSV
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `predictions_${csvFile.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setUploadStatus('✅ Success! Predictions downloaded.');
      setCsvFile(null);
    } catch (err) {
      setError(err.message);
      setUploadStatus('');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    // Create a sample CSV with the required features
    const headers = availableFeatures.join(',');
    const sampleRow = availableFeatures.map(() => '0').join(',');
    const csv = `${headers}\n${sampleRow}\n${sampleRow}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_exoplanet_data.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-3xl mx-auto my-8 p-8 bg-gradient-to-br from-purple-primary to-purple-secondary rounded-2xl shadow-2xl text-white">
      <h2 className="text-center text-3xl mb-8 drop-shadow-lg">🪐 Exoplanet Detection</h2>
      
      <div className="flex gap-4 mb-8">
        <button 
          className={`flex-1 px-4 py-3 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 ${
            activeTab === 'kepid' 
              ? 'bg-white text-purple-primary border-2 border-white' 
              : 'bg-white/20 border-2 border-white/30 hover:bg-white/30'
          }`}
          onClick={() => setActiveTab('kepid')}
        >
          Search by KepID
        </button>
        <button 
          className={`flex-1 px-4 py-3 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 ${
            activeTab === 'custom' 
              ? 'bg-white text-purple-primary border-2 border-white' 
              : 'bg-white/20 border-2 border-white/30 hover:bg-white/30'
          }`}
          onClick={() => setActiveTab('custom')}
        >
          Custom Features
        </button>
        <button 
          className={`flex-1 px-4 py-3 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 ${
            activeTab === 'csv' 
              ? 'bg-white text-purple-primary border-2 border-white' 
              : 'bg-white/20 border-2 border-white/30 hover:bg-white/30'
          }`}
          onClick={() => setActiveTab('csv')}
        >
          Upload CSV
        </button>
      </div>

      {activeTab === 'kepid' && (
        <div className="bg-white/10 p-6 rounded-xl mb-4 backdrop-blur-lg">
          <h3 className="mt-0 mb-2 text-xl">Predict by KepID</h3>
          <p className="mb-6 opacity-90 text-sm">Look up an exoplanet candidate from the database</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Enter KepID (e.g., 10854555)"
              value={kepid}
              onChange={(e) => setKepid(e.target.value)}
              disabled={loading}
              className="flex-1 px-3 py-2 border-2 border-white/30 rounded-lg text-base bg-white/90 text-gray-800 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 disabled:opacity-60"
            />
            <button 
              onClick={predictByKepid} 
              disabled={loading}
              className="px-6 py-2 bg-white text-purple-primary border-none rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 hover:enabled:-translate-y-0.5 hover:enabled:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Predicting...' : 'Predict'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'custom' && (
        <div className="bg-white/10 p-6 rounded-xl mb-4 backdrop-blur-lg">
          <h3 className="mt-0 mb-2 text-xl">Enter Custom Feature Values</h3>
          <p className="mb-6 opacity-90 text-sm">Provide values for external dataset prediction</p>
          
          <div className="mb-4">
            <button 
              onClick={fillSampleData} 
              disabled={loading}
              className="px-6 py-2 bg-white/30 text-white border-2 border-white/50 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 hover:enabled:bg-white/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Fill Sample Data
            </button>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 mb-6 max-h-96 overflow-y-auto p-4 bg-black/10 rounded-lg custom-scrollbar">
            {availableFeatures.map((feature) => (
              <div key={feature} className="flex flex-col gap-1">
                <label htmlFor={feature} className="text-sm font-medium opacity-90">{feature}</label>
                <input
                  id={feature}
                  type="number"
                  step="any"
                  placeholder="Enter value"
                  value={features[feature] || ''}
                  onChange={(e) => handleFeatureChange(feature, e.target.value)}
                  disabled={loading}
                  className="px-2 py-1.5 border-2 border-white/30 rounded-md text-sm bg-white/90 text-gray-800 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/20 disabled:opacity-60"
                />
              </div>
            ))}
          </div>

          <button 
            onClick={predictByCustomFeatures} 
            disabled={loading}
            className="w-full px-6 py-4 bg-white text-purple-primary border-none rounded-lg text-lg font-semibold cursor-pointer transition-all duration-300 hover:enabled:-translate-y-0.5 hover:enabled:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Predicting...' : 'Predict with Custom Features'}
          </button>
        </div>
      )}

      {activeTab === 'csv' && (
        <div className="bg-white/10 p-6 rounded-xl mb-4 backdrop-blur-lg">
          <h3 className="mt-0 mb-2 text-xl">Upload CSV File for Batch Predictions</h3>
          <p className="mb-6 opacity-90 text-sm">Upload a CSV file with multiple rows to get predictions for all entries</p>
          
          <div className="flex flex-col gap-6">
            <div className="flex justify-center">
              <input
                type="file"
                id="csv-file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
              />
              <label 
                htmlFor="csv-file" 
                className="px-8 py-4 bg-white/30 text-white border-2 border-dashed border-white/50 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 text-center hover:bg-white/40 hover:border-white hover:-translate-y-0.5"
              >
                {csvFile ? '📄 Change File' : '📁 Choose CSV File'}
              </label>
            </div>

            {uploadStatus && (
              <div className={`text-center px-3 py-2 rounded-lg font-medium ${
                uploadStatus.includes('✅') 
                  ? 'bg-green-500/30 border-2 border-green-500' 
                  : 'bg-white/20'
              }`}>
                {uploadStatus}
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button 
                onClick={predictFromCSV} 
                disabled={loading || !csvFile}
                className="w-full px-6 py-4 bg-white text-purple-primary border-none rounded-lg text-lg font-semibold cursor-pointer transition-all duration-300 hover:enabled:-translate-y-0.5 hover:enabled:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Upload & Get Predictions'}
              </button>
              
              <button 
                onClick={downloadSampleCSV} 
                disabled={loading || availableFeatures.length === 0}
                className="px-6 py-2 bg-white/30 text-white border-2 border-white/50 rounded-lg text-base font-semibold cursor-pointer transition-all duration-300 hover:enabled:bg-white/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                📥 Download Sample CSV Template
              </button>
            </div>

            <div className="bg-black/20 p-6 rounded-lg text-sm">
              <h4 className="mt-0 mb-4">ℹ️ How it works:</h4>
              <ol className="my-4 pl-6">
                <li className="my-2">Download the sample CSV template to see required columns</li>
                <li className="my-2">Fill your CSV with data (must include all {availableFeatures.length} features)</li>
                <li className="my-2">Upload your CSV file</li>
                <li className="my-2">Get a new CSV with predictions added automatically</li>
              </ol>
              <p className="mt-4 pt-4 border-t border-white/20">
                <strong>Note:</strong> The downloaded file will include columns for:
                <code className="bg-black/40 px-1.5 py-0.5 rounded text-xs mx-1">probability_of_planet</code>, 
                <code className="bg-black/40 px-1.5 py-0.5 rounded text-xs mx-1">prediction</code> (0/1), and 
                <code className="bg-black/40 px-1.5 py-0.5 rounded text-xs mx-1">verdict</code> (PLANET/NOT_PLANET)
              </p>
            </div>
          </div>
        </div>
      )}

      {error && activeTab !== 'csv' && (
        <div className="mt-6 p-6 rounded-xl slide-in bg-red-500/20 border-2 border-red-500">
          <strong>Error:</strong> {error}
        </div>
      )}

      {prob !== null && (
        <div className="mt-6 p-6 rounded-xl slide-in bg-white/15 border-2 border-white/30">
          <h3 className="mt-0 mb-4">Prediction Result</h3>
          <div className="flex justify-between items-center mb-4 text-lg">
            <span>Probability of Planet:</span>
            <span className="text-4xl font-bold drop-shadow-lg">{(prob * 100).toFixed(2)}%</span>
          </div>
          <div className={`text-center px-4 py-3 rounded-lg text-xl font-semibold ${
            prob > 0.5 
              ? 'bg-green-500/30 border-2 border-green-500' 
              : 'bg-orange-500/30 border-2 border-orange-500'
          }`}>
            {prob > 0.5 ? '✅ Likely a Planet!' : '❌ Likely Not a Planet'}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-black/20 rounded-lg text-sm">
        <p className="my-2">💡 <strong>Tip:</strong> Make sure the FastAPI backend is running on port 8000</p>
        <p className="my-2">Backend: <code className="bg-black/30 px-2 py-1 rounded font-mono text-xs break-all">python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload</code></p>
      </div>
    </div>
  );
}
