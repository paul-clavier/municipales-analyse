import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import { useEffect, useState, useMemo } from "react";

const NANTES_CENTER = [47.2184, -1.5536];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function getBureauId(bureau) {
  return bureau.bureau_de_vote.split(" ")[0].replace(/^0+/, "");
}

function getVotants(bureau) {
  return bureau.votants ??
    (bureau.exprimes + (bureau.nuls ?? 0) + (bureau.blancs ?? 0));
}

function getDiffColor(ratio) {
  // ratio: -1 to +1. Negative = red, Positive = green, 0 = white
  if (ratio >= 0) {
    const t = Math.min(ratio, 1);
    return `rgb(${lerp(255, 0, t)},${lerp(255, 180, t)},${lerp(255, 0, t)})`;
  } else {
    const t = Math.min(-ratio, 1);
    return `rgb(${lerp(255, 220, t)},${lerp(255, 40, t)},${lerp(255, 40, t)})`;
  }
}

export default function ComparisonMap({ fromYear, toYear, round, selectedPartis, mode, valueMode, scaleMode }) {
  const [fromData, setFromData] = useState(null);
  const [toData, setToData] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/nantes_${fromYear}_${round}_mapped.json`)
      .then((r) => r.json())
      .then(setFromData);
  }, [fromYear, round]);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/nantes_${toYear}_${round}_mapped.json`)
      .then((r) => r.json())
      .then(setToData);
  }, [toYear, round]);

  const geojsonData = useMemo(() => {
    if (!fromData || !toData) return null;

    // Index "from" data by bureau ID
    const fromIndex = {};
    for (const bureau of fromData) {
      fromIndex[getBureauId(bureau)] = bureau;
    }

    const toBureaus = toData.filter((b) => b.geometry);

    // Pass 1: compute diffs
    const rawDiffs = toBureaus.map((toBureau) => {
      const id = getBureauId(toBureau);
      const fromBureau = fromIndex[id];

      if (!fromBureau) {
        return { toBureau, diff: null, matched: false };
      }

      let toVal, fromVal;

      if (mode === "participation") {
        if (valueMode === "percentage") {
          toVal = toBureau.inscrits > 0 ? getVotants(toBureau) / toBureau.inscrits : 0;
          fromVal = fromBureau.inscrits > 0 ? getVotants(fromBureau) / fromBureau.inscrits : 0;
        } else {
          toVal = getVotants(toBureau);
          fromVal = getVotants(fromBureau);
        }
      } else {
        const toSum = selectedPartis.reduce((acc, p) => acc + (toBureau[p] || 0), 0);
        const fromSum = selectedPartis.reduce((acc, p) => acc + (fromBureau[p] || 0), 0);

        if (valueMode === "percentage") {
          toVal = Math.min(toSum / (toBureau.exprimes || 1), 1);
          fromVal = Math.min(fromSum / (fromBureau.exprimes || 1), 1);
        } else {
          toVal = toSum;
          fromVal = fromSum;
        }
      }

      return { toBureau, diff: toVal - fromVal, matched: true };
    });

    // Compute scale
    const matchedDiffs = rawDiffs.filter((d) => d.matched).map((d) => d.diff);
    const maxAbsDiff = Math.max(...matchedDiffs.map((d) => Math.abs(d)), 0.001);

    let scaleMax;
    if (scaleMode === "relative") {
      scaleMax = maxAbsDiff;
    } else {
      // "compared": use a fixed theoretical max
      if (valueMode === "percentage") {
        scaleMax = 1; // diff can be at most 100pp
      } else {
        scaleMax = mode === "participation"
          ? Math.max(...toBureaus.map((b) => b.inscrits), 1)
          : Math.max(...toBureaus.map((b) => b.exprimes || 0), 1);
      }
    }

    // Pass 2: build features
    const features = rawDiffs.map(({ toBureau, diff, matched }) => {
      const ratio = matched ? diff / scaleMax : 0;

      return {
        ...toBureau.geometry,
        properties: {
          ...toBureau.geometry.properties,
          name: toBureau.bureau_de_vote,
          ratio: Math.max(-1, Math.min(1, ratio)),
          rawDiff: diff,
          matched,
          valueMode,
        },
      };
    });

    return { type: "FeatureCollection", features };
  }, [fromData, toData, selectedPartis, mode, valueMode, scaleMode]);

  const style = (feature) => {
    const p = feature.properties;
    if (!p.matched) {
      return { fillColor: "#ccc", weight: 1, opacity: 0.7, color: "#999", fillOpacity: 0.6 };
    }
    return {
      fillColor: getDiffColor(p.ratio),
      weight: 1,
      opacity: 0.7,
      color: "#666",
      fillOpacity: 0.85,
    };
  };

  const onEachFeature = (feature, layer) => {
    const p = feature.properties;
    if (!p.matched) {
      layer.bindTooltip(`<strong>${p.name}</strong><br/>Pas de correspondance`, { sticky: true });
      return;
    }
    const sign = p.rawDiff >= 0 ? "+" : "";
    const label = p.valueMode === "absolute"
      ? `${sign}${Math.round(p.rawDiff)} voix`
      : `${sign}${(p.rawDiff * 100).toFixed(1)}pp`;
    layer.bindTooltip(
      `<strong>${p.name}</strong><br/>${label}`,
      { sticky: true }
    );
  };

  return (
    <div className="map-wrapper comparison-map">
      <h3>Comparaison {fromYear} → {toYear} - Tour {round}</h3>
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
            key={`cmp-${fromYear}-${toYear}-${round}-${selectedPartis.join(",")}-${mode}-${valueMode}-${scaleMode}`}
            data={geojsonData}
            style={style}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
