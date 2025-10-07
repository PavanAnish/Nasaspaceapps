import { memo } from 'react';
import ExoPredict from './components/ExoPredict';

const App = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <header className="text-center py-8 px-4 text-white">
        <h1 className="text-4xl m-0 bg-gradient-to-r from-white to-[#a8b5ff] bg-clip-text text-transparent">
          🌌 NASA Exoplanet Prediction System
        </h1>
        <p className="text-lg text-[#b8c5ff] mt-2">
          Powered by XGBoost & Kepler Mission Data
        </p>
      </header>
      <main className="p-4">
        <ExoPredict />
      </main>
    </div>
  );
};

export default memo(App);