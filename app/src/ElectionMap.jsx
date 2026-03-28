import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useEffect, useState, useMemo } from "react";

const NANTES_CENTER = [47.2184, -1.5536];

const PARTI_COLORS = {
  LR: [0, 0, 255],
  PS: [255, 105, 180],
  EELV: [0, 255, 0],
  LFI: [255, 0, 0],
  RN: [0, 0, 0],
  LREM_MODEM: [255, 255, 0],
  PCF: [139, 0, 0],
  DVG: [255, 105, 180],
  DVEXG: [165, 42, 42],
  DVD: [173, 216, 230],
  DVC: [255, 140, 0],
  LO: [74, 0, 0],
  NPA: [74, 0, 0],
  OTHER: [192, 192, 192],
};

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function getColor(ratio, baseRgb) {
  const r = lerp(255, baseRgb[0], ratio);
  const g = lerp(255, baseRgb[1], ratio);
  const b = lerp(255, baseRgb[2], ratio);
  return `rgb(${r},${g},${b})`;
}

function blendPartiColors(bureau, selectedPartis) {
  if (selectedPartis.length === 0) return [0, 0, 0];
  if (selectedPartis.length === 1) return PARTI_COLORS[selectedPartis[0]] || [0, 0, 0];

  let totalVotes = 0;
  let r = 0, g = 0, b = 0;
  for (const p of selectedPartis) {
    const votes = bureau[p] || 0;
    const color = PARTI_COLORS[p] || [128, 128, 128];
    r += color[0] * votes;
    g += color[1] * votes;
    b += color[2] * votes;
    totalVotes += votes;
  }
  if (totalVotes === 0) return [128, 128, 128];
  return [Math.round(r / totalVotes), Math.round(g / totalVotes), Math.round(b / totalVotes)];
}

export default function ElectionMap({ year, round, selectedPartis, mode, valueMode, scaleMode }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/nantes_${year}_${round}_mapped.json`)
      .then((r) => r.json())
      .then(setData);
  }, [year, round]);

  const geojsonData = useMemo(() => {
    if (!data) return null;

    const bureaus = data.filter((b) => b.geometry);

    // Pass 1: compute raw values and find maximums
    const rawValues = bureaus.map((bureau) => {
      let rawPct, rawAbs;

      if (mode === "participation") {
        const votants = bureau.votants ??
          (bureau.exprimes + (bureau.nuls ?? 0) + (bureau.blancs ?? 0));
        rawPct = bureau.inscrits > 0 ? votants / bureau.inscrits : 0;
        rawAbs = votants;
      } else {
        const exprimes = bureau.exprimes || 1;
        const sum = selectedPartis.reduce((acc, p) => acc + (bureau[p] || 0), 0);
        rawPct = Math.min(sum / exprimes, 1);
        rawAbs = sum;
      }

      const baseColor = mode === "participation"
        ? [0, 0, 0]
        : blendPartiColors(bureau, selectedPartis);

      return { bureau, rawPct, rawAbs, baseColor };
    });

    const maxRawPct = Math.max(...rawValues.map((v) => v.rawPct), 0.001);
    const maxRawAbs = Math.max(...rawValues.map((v) => v.rawAbs), 1);
    const absScaleMax = mode === "participation"
      ? Math.max(...bureaus.map((b) => b.inscrits), 1)
      : Math.max(...bureaus.map((b) => b.exprimes || 0), 1);

    // Pass 2: compute final ratio
    const features = rawValues.map(({ bureau, rawPct, rawAbs, baseColor }) => {
      let ratio;

      if (valueMode === "percentage") {
        ratio = scaleMode === "compared" ? rawPct : rawPct / maxRawPct;
      } else {
        ratio = scaleMode === "compared" ? rawAbs / absScaleMax : rawAbs / maxRawAbs;
      }

      ratio = Math.min(ratio, 1);

      return {
        ...bureau.geometry,
        properties: {
          ...bureau.geometry.properties,
          name: bureau.bureau_de_vote,
          ratio,
          baseColor,
          rawValue: valueMode === "percentage" ? rawPct : rawAbs,
          valueMode,
        },
      };
    });

    return { type: "FeatureCollection", features };
  }, [data, selectedPartis, mode, valueMode, scaleMode]);

  const style = (feature) => ({
    fillColor: getColor(feature.properties.ratio, feature.properties.baseColor),
    weight: 1,
    opacity: 0.7,
    color: "#666",
    fillOpacity: 0.85,
  });

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    const label = p.valueMode === "absolute"
      ? `${Math.round(p.rawValue)} voix`
      : `${(p.rawValue * 100).toFixed(1)}%`;
    layer.bindTooltip(
      `<strong>${p.name}</strong><br/>${label}`,
      { sticky: true }
    );
  };

  return (
    <div className="map-wrapper">
      <h3>{year} - Tour {round}</h3>
      <MapContainer
        center={NANTES_CENTER}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geojsonData && (
          <GeoJSON
            key={`${year}-${round}-${selectedPartis.join(",")}-${mode}-${valueMode}-${scaleMode}`}
            data={geojsonData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
