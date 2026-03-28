import { useState, useEffect } from "react";
import ElectionMap from "./ElectionMap";
import ComparisonMap from "./ComparisonMap";
import "./App.css";

const PARTI_COLORS = {
  LR: "#0000FF", PS: "#FF69B4", EELV: "#00FF00", LFI: "#FF0000",
  RN: "#000000", LREM_MODEM: "#FFFF00", PCF: "#8B0000", DVG: "#FF69B4",
  DVEXG: "#A52A2A", DVD: "#ADD8E6", DVC: "#FF8C00", LO: "#4A0000",
  NPA: "#4A0000", OTHER: "#C0C0C0",
};

const YEARS = [2014, 2020, 2026];
const META_KEYS = new Set([
  "bureau_de_vote", "idbureau", "inscrits", "procurations",
  "votants", "nuls", "blancs", "exprimes", "geometry",
  "lieu_nom", "lieu_site",
]);

export default function App() {
  const [round, setRound] = useState(1);
  const [allPartis, setAllPartis] = useState([]);
  const [selectedPartis, setSelectedPartis] = useState([]);
  const [mode, setMode] = useState("partis");
  const [valueMode, setValueMode] = useState("percentage");
  const [scaleMode, setScaleMode] = useState("compared");
  const [view, setView] = useState("all");
  const [fromYear, setFromYear] = useState(2014);
  const [toYear, setToYear] = useState(2026);

  useEffect(() => {
    async function loadPartis() {
      const partisSet = new Set();
      for (const year of YEARS) {
        const res = await fetch(`${import.meta.env.BASE_URL}data/nantes_${year}_${round}_mapped.json`);
        const data = await res.json();
        if (data.length > 0) {
          Object.keys(data[0]).forEach((k) => {
            if (!META_KEYS.has(k)) partisSet.add(k);
          });
        }
      }
      const sorted = [...partisSet].sort();
      setAllPartis(sorted);
      setSelectedPartis((prev) =>
        prev.length > 0 ? prev.filter((p) => sorted.includes(p)) : []
      );
    }
    loadPartis();
  }, [round]);

  const toggleParti = (p) => {
    setSelectedPartis((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  return (
    <div className="app">
      <header>
        <h1>Nantes - Analyse des votes</h1>
        <div className="controls">
          <div className="control-group">
            <label>Vue :</label>
            <button
              className={view === "all" ? "active" : ""}
              onClick={() => setView("all")}
            >
              Toutes
            </button>
            <button
              className={view === "comparison" ? "active" : ""}
              onClick={() => setView("comparison")}
            >
              Comparaison
            </button>
          </div>

          {view === "comparison" && (
            <div className="control-group">
              <label>De :</label>
              <select value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <label>A :</label>
              <select value={toYear} onChange={(e) => setToYear(Number(e.target.value))}>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          <div className="control-group">
            <label>Tour :</label>
            <button
              className={round === 1 ? "active" : ""}
              onClick={() => setRound(1)}
            >
              1er tour
            </button>
            <button
              className={round === 2 ? "active" : ""}
              onClick={() => setRound(2)}
            >
              2e tour
            </button>
          </div>

          <div className="control-group">
            <label>Affichage :</label>
            <button
              className={mode === "participation" ? "active" : ""}
              onClick={() => setMode("participation")}
            >
              Participation
            </button>
            <button
              className={mode === "partis" ? "active" : ""}
              onClick={() => setMode("partis")}
            >
              Partis
            </button>
          </div>

          <div className="control-group">
            <label>Valeur :</label>
            <button
              className={valueMode === "percentage" ? "active" : ""}
              onClick={() => setValueMode("percentage")}
            >
              Pourcentage
            </button>
            <button
              className={valueMode === "absolute" ? "active" : ""}
              onClick={() => setValueMode("absolute")}
            >
              Absolu
            </button>
          </div>

          <div className="control-group">
            <label>Echelle :</label>
            <button
              className={scaleMode === "compared" ? "active" : ""}
              onClick={() => setScaleMode("compared")}
            >
              Comparee
            </button>
            <button
              className={scaleMode === "relative" ? "active" : ""}
              onClick={() => setScaleMode("relative")}
            >
              Relative
            </button>
          </div>

          {mode === "partis" && (
            <div className="control-group partis-selector">
              <label>Partis :</label>
              <div className="partis-chips">
                {allPartis.map((p) => (
                  <button
                    key={p}
                    className={selectedPartis.includes(p) ? "chip active" : "chip"}
                    style={selectedPartis.includes(p) ? {
                      background: PARTI_COLORS[p] || "#333",
                      borderColor: PARTI_COLORS[p] || "#333",
                      color: ["LREM_MODEM", "EELV", "DVD", "OTHER"].includes(p) ? "#333" : "#fff",
                    } : undefined}
                    onClick={() => toggleParti(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {view === "all" ? (
        <div className="maps-container">
          {YEARS.map((year) => (
            <ElectionMap
              key={year}
              year={year}
              round={round}
              selectedPartis={mode === "partis" ? selectedPartis : []}
              mode={mode}
              valueMode={valueMode}
              scaleMode={scaleMode}
            />
          ))}
        </div>
      ) : (
        <div className="maps-container single">
          <ComparisonMap
            fromYear={fromYear}
            toYear={toYear}
            round={round}
            selectedPartis={mode === "partis" ? selectedPartis : []}
            mode={mode}
            valueMode={valueMode}
            scaleMode={scaleMode}
          />
        </div>
      )}

      {view === "comparison" ? (
        <div className="legend">
          <span className="legend-label-neg">{valueMode === "absolute" ? "- voix" : "- pp"}</span>
          <div
            className="legend-bar"
            style={{ background: "linear-gradient(to right, rgb(220,40,40), white, rgb(0,180,0))" }}
          />
          <span className="legend-label-pos">{valueMode === "absolute" ? "+ voix" : "+ pp"}</span>
        </div>
      ) : (
        <div className="legend">
          <span>{valueMode === "absolute" ? "0" : "0%"}</span>
          <div
            className="legend-bar"
            style={{
              background: mode === "participation" || selectedPartis.length === 0
                ? "linear-gradient(to right, white, black)"
                : selectedPartis.length === 1
                  ? `linear-gradient(to right, white, ${PARTI_COLORS[selectedPartis[0]] || "#000"})`
                  : `linear-gradient(to right, white, ${selectedPartis.map((p) => PARTI_COLORS[p] || "#000").join(", ")})`,
            }}
          />
          <span>
            {scaleMode === "relative"
              ? "meilleur bureau"
              : valueMode === "absolute"
                ? "max voix"
                : "100%"}
          </span>
        </div>
      )}
    </div>
  );
}
