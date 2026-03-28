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

const APPROX_RADIUS_KM = 0.5;

function computeCentroid(bureau) {
  const coords = bureau.geometry.geometry.coordinates[0];
  const n = coords.length - 1; // exclude closing duplicate
  let lngSum = 0, latSum = 0;
  for (let i = 0; i < n; i++) {
    lngSum += coords[i][0];
    latSum += coords[i][1];
  }
  return [lngSum / n, latSum / n];
}

function haversineKm(a, b) {
  const toRad = (deg) => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * sinLng * sinLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function computeFromVal(neighbors, totalWeight, selectedPartis, mode, valueMode) {
  if (mode === "participation") {
    if (valueMode === "percentage") {
      return neighbors.reduce((s, n) => {
        const pct = n.bureau.inscrits > 0 ? getVotants(n.bureau) / n.bureau.inscrits : 0;
        return s + n.weight * pct;
      }, 0) / totalWeight;
    }
    return neighbors.reduce((s, n) => s + n.weight * getVotants(n.bureau), 0) / totalWeight;
  }
  if (valueMode === "percentage") {
    return neighbors.reduce((s, n) => {
      const sum = selectedPartis.reduce((acc, p) => acc + (n.bureau[p] || 0), 0);
      return s + n.weight * Math.min(sum / (n.bureau.exprimes || 1), 1);
    }, 0) / totalWeight;
  }
  return neighbors.reduce((s, n) => {
    const sum = selectedPartis.reduce((acc, p) => acc + (n.bureau[p] || 0), 0);
    return s + n.weight * sum;
  }, 0) / totalWeight;
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

    // Precompute centroids for geographic fallback
    const fromCentroids = fromData
      .filter((b) => b.geometry)
      .map((b) => ({ bureau: b, centroid: computeCentroid(b) }));

    // Pass 1: compute diffs (exact match + geographic fallback)
    const rawDiffs = toBureaus.map((toBureau) => {
      const id = getBureauId(toBureau);
      const fromBureau = fromIndex[id];

      let toVal, fromVal;

      if (fromBureau) {
        // Exact ID match
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
        return { toBureau, diff: toVal - fromVal, matched: true, approximated: false };
      }

      // Geographic fallback: find nearby "from" bureaus
      const toCentroid = computeCentroid(toBureau);
      const neighbors = [];
      for (const fc of fromCentroids) {
        const dist = haversineKm(toCentroid, fc.centroid);
        if (dist <= APPROX_RADIUS_KM) {
          neighbors.push({ bureau: fc.bureau, weight: 1 / Math.max(dist, 0.01) });
        }
      }

      if (neighbors.length === 0) {
        return { toBureau, diff: null, matched: false, approximated: false };
      }

      const totalWeight = neighbors.reduce((s, n) => s + n.weight, 0);

      if (mode === "participation") {
        toVal = valueMode === "percentage"
          ? (toBureau.inscrits > 0 ? getVotants(toBureau) / toBureau.inscrits : 0)
          : getVotants(toBureau);
      } else {
        const toSum = selectedPartis.reduce((acc, p) => acc + (toBureau[p] || 0), 0);
        toVal = valueMode === "percentage" ? Math.min(toSum / (toBureau.exprimes || 1), 1) : toSum;
      }
      fromVal = computeFromVal(neighbors, totalWeight, selectedPartis, mode, valueMode);

      return { toBureau, diff: toVal - fromVal, matched: true, approximated: true, neighborCount: neighbors.length };
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
    const features = rawDiffs.map(({ toBureau, diff, matched, approximated, neighborCount }) => {
      const ratio = matched ? diff / scaleMax : 0;

      return {
        ...toBureau.geometry,
        properties: {
          ...toBureau.geometry.properties,
          name: toBureau.bureau_de_vote,
          ratio: Math.max(-1, Math.min(1, ratio)),
          rawDiff: diff,
          matched,
          approximated: approximated || false,
          neighborCount: neighborCount || 0,
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
      weight: p.approximated ? 2 : 1,
      opacity: 0.7,
      color: p.approximated ? "#f90" : "#666",
      dashArray: p.approximated ? "4 4" : undefined,
      fillOpacity: p.approximated ? 0.7 : 0.85,
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
    const approxNote = p.approximated
      ? `<br/><em>\u2248 approx. (${p.neighborCount} bureaux voisins)</em>`
      : "";
    layer.bindTooltip(
      `<strong>${p.name}</strong><br/>${label}${approxNote}`,
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
