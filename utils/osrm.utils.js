const axios = require('axios');

const OSRM_BASE_URL = process.env.OPEN_SOURCE_API_URL;
const ROUTE_CHUNK_SIZE = 50;
const MATCH_CHUNK_SIZE = 100;

/**
 * Get Valid Coordinates
 */
function getValidCoordinates(points = []) {
  return points.filter(
    (x) =>
      x?.Lattitude &&
      x?.Longitude &&
      x.Lattitude !== 'not found' &&
      x.Longitude !== 'not found',
  );
}

/**
 * Convert Coordinates To OSRM Format
 */
function getCoordinateString(points = []) {
  return points.map((x) => `${x.Longitude},${x.Lattitude}`).join(';');
}

/**
 * Create timestamps string for OSRM Match API
 */
function getTimestampString(points = []) {
  return points
    .map((point) => {
      const date = point.Track_datetime;

      return Math.floor(new Date(date).getTime() / 1000);
    })
    .join(';');
}
/**
 * OSRM Match API
 * Returns snapped route + distance
 */
async function getOSRMTrackingPoints_Match_API(
  trackingPoints = [],
  chunkSize = 30,
) {
  try {
    let validCoordinates = getValidCoordinates(trackingPoints);

    if (validCoordinates.length < 2) {
      return {
        trackingPoints: [],
        distanceKM: 0,
      };
    }

    // Sort by time
    validCoordinates.sort(
      (a, b) =>
        new Date(a.Track_datetime || a.time) -
        new Date(b.Track_datetime || b.time),
    );

    // Remove consecutive duplicate coordinates
    validCoordinates = validCoordinates.filter((point, index, arr) => {
      if (index === 0) return true;

      return !(
        point.Lattitude == arr[index - 1].Lattitude &&
        point.Longitude == arr[index - 1].Longitude
      );
    });

    const finalRoutePoints = [];
    let totalDistanceKM = 0;

    for (let i = 0; i < validCoordinates.length - 1; i += chunkSize - 1) {
      const chunk = validCoordinates.slice(i, i + chunkSize);

      if (chunk.length < 2) continue;

      try {
        const coordinates = getCoordinateString(chunk);
        console.log('First Point:', chunk[0]);
        console.log('Last Point:', chunk[chunk.length - 1]);
        console.log('Coordinates:', coordinates);
        const timestamps = getTimestampString(chunk);
        console.log('Timestamps:', timestamps);
        const response = await axios.get(
          `${OSRM_BASE_URL}match/v1/driving/${coordinates}`,
          {
            params: {
              overview: 'full',
              geometries: 'geojson',
              timestamps,
              gaps: 'ignore',
              tidy: true,
              radiuses: chunk.map(() => 30).join(';'),
            },
            timeout: 30000,
          },
        );

        const matchings = response?.data?.matchings || [];

        if (!matchings.length) {
          console.log(
            `OSRM Match: No matching found for chunk ${i}-${i + chunkSize}`,
          );
          continue;
        }

        for (const matching of matchings) {
          totalDistanceKM += (matching.distance || 0) / 1000;

          const routePoints =
            matching.geometry?.coordinates?.map(([lng, lat]) => ({
              Longitude: lng,
              Lattitude: lat,
            })) || [];

          if (finalRoutePoints.length && routePoints.length) {
            routePoints.shift();
          }

          finalRoutePoints.push(...routePoints);
        }
      } catch (error) {
        console.log(
          `OSRM Match Chunk Error (${i}-${i + chunkSize}) =>`,
          error?.response?.data || error.message,
        );

        continue;
      }
    }

    return {
      trackingPoints: finalRoutePoints,
      distanceKM: Number(totalDistanceKM.toFixed(2)),
    };
  } catch (error) {
    console.log('OSRM Match Error =>', error.message);

    return {
      trackingPoints: [],
      distanceKM: 0,
    };
  }
}
/**
 * OSRM Route API
 * Returns Distance + Route Geometry
 */
async function getOSRMTrackingPoints_Route_API(
  trackingPoints = [],
  chunkSize = ROUTE_CHUNK_SIZE,
) {
  try {
    const validCoordinates = getValidCoordinates(trackingPoints);

    if (validCoordinates.length < 2) {
      return {
        trackingPoints: [],
        distanceKM: 0,
      };
    }

    const finalRoutePoints = [];
    let totalDistanceKM = 0;

    for (let i = 0; i < validCoordinates.length - 1; i += chunkSize - 1) {
      const chunk = validCoordinates.slice(i, i + chunkSize);

      if (chunk.length < 2) continue;

      try {
        const coordinates = getCoordinateString(chunk);

        const response = await axios.get(
          `${OSRM_BASE_URL}route/v1/driving/${coordinates}?overview=full&geometries=geojson`,
          {
            timeout: 30000,
          },
        );

        const route = response?.data?.routes?.[0];

        totalDistanceKM += (route?.distance || 0) / 1000;

        const routePoints =
          route?.geometry?.coordinates?.map(([lng, lat]) => ({
            Longitude: lng,
            Lattitude: lat,
          })) || [];

        if (finalRoutePoints.length && routePoints.length) {
          routePoints.shift();
        }

        finalRoutePoints.push(...routePoints);
      } catch (error) {
        console.log(
          `OSRM Route Chunk Error (${i}-${i + chunkSize}) =>`,
          error.message,
        );
      }
    }

    return {
      trackingPoints: finalRoutePoints,
      distanceKM: Number(totalDistanceKM.toFixed(2)),
    };
  } catch (error) {
    console.log('OSRM Route Error =>', error.message);

    return {
      trackingPoints: [],
      distanceKM: 0,
    };
  }
}

/**
 * OSRM Route API
 * Distance Only
 */
async function calculateOSRMDistance(
  trackingPoints = [],
  chunkSize = ROUTE_CHUNK_SIZE,
) {
  try {
    const validCoordinates = getValidCoordinates(trackingPoints);

    if (validCoordinates.length < 2) {
      return 0;
    }

    let totalDistanceKM = 0;

    for (let i = 0; i < validCoordinates.length - 1; i += chunkSize - 1) {
      const chunk = validCoordinates.slice(i, i + chunkSize);

      if (chunk.length < 2) continue;

      const coordinates = getCoordinateString(chunk);

      const response = await axios.get(
        `${OSRM_BASE_URL}route/v1/driving/${coordinates}`,
        {
          params: {
            overview: false,
          },
          timeout: 30000,
        },
      );

      totalDistanceKM += (response?.data?.routes?.[0]?.distance || 0) / 1000;
    }

    return Number(totalDistanceKM.toFixed(2));
  } catch (error) {
    console.log('OSRM Distance Error =>', error.message);
    return 0;
  }
}

/**
 * OSRM Table API
 * Distance Matrix Calculation
 */
async function getDistanceByTableAPI(
  trackingPoints = [],
  chunkSize = ROUTE_CHUNK_SIZE,
) {
  try {
    const validCoordinates = getValidCoordinates(trackingPoints);

    if (validCoordinates.length < 2) {
      return 0;
    }

    let totalDistanceMeters = 0;

    for (let i = 0; i < validCoordinates.length - 1; i += chunkSize - 1) {
      const chunk = validCoordinates.slice(i, i + chunkSize);

      if (chunk.length < 2) continue;

      const coordinates = getCoordinateString(chunk);

      const response = await axios.get(
        `${OSRM_BASE_URL}table/v1/driving/${coordinates}`,
        {
          params: {
            annotations: 'distance',
          },
          timeout: 30000,
        },
      );

      const distances = response?.data?.distances || [];

      for (let j = 0; j < distances.length - 1; j++) {
        totalDistanceMeters += distances[j]?.[j + 1] || 0;
      }
    }

    return Number((totalDistanceMeters / 1000).toFixed(2));
  } catch (error) {
    console.log('OSRM Table Error =>', error.message);
    return 0;
  }
}

/**
 * OSRM Match API
 * Best For Employee GPS Tracking
 */
async function getDistanceByMatchAPI(
  trackingPoints = [],
  chunkSize = MATCH_CHUNK_SIZE,
) {
  try {
    const validCoordinates = getValidCoordinates(trackingPoints);

    console.log('====================================');
    console.log('OSRM MATCH START');
    console.log('Total Valid Points:', validCoordinates.length);
    console.log('====================================');

    if (validCoordinates.length < 2) {
      console.log('Not enough valid points');
      return 0;
    }

    let totalDistanceKM = 0;

    for (let i = 0; i < validCoordinates.length - 1; i += chunkSize - 1) {
      const chunk = validCoordinates.slice(i, i + chunkSize);

      if (chunk.length < 2) continue;

      try {
        const coordinates = getCoordinateString(chunk);
        const timestamps = getTimestampString(chunk);
        console.log('\n------------------------------------');
        console.log(`Processing Chunk: ${i} -> ${i + chunk.length - 1}`);
        console.log('Chunk Points:', chunk.length);
        console.log('Coordinates Length:', chunk.length);
        console.log('Coordinates String Length:', coordinates.length);
        console.log('Timestamps:', timestamps);
        console.log('Timestamp Count:', timestamps.split(';').length);
        const response = await axios.get(
          `${OSRM_BASE_URL}match/v1/driving/${coordinates}`,
          {
            params: {
              overview: false,
              gaps: 'ignore',
              tidy: true,
              radiuses: chunk.map(() => 30).join(';'),
              timestamps,
            },
            timeout: 30000,
          },
        );

        const data = response?.data || {};
        const matchings = data?.matchings || [];
        const tracepoints = data?.tracepoints || [];

        const matchedPoints = tracepoints.filter(Boolean).length;

        console.log('OSRM Code:', data.code);
        console.log(`Matched Points: ${matchedPoints}/${tracepoints.length}`);
        console.log('Total Matchings:', matchings.length);

        let chunkDistanceKM = 0;

        matchings.forEach((matching, index) => {
          const distanceKM = (matching.distance || 0) / 1000;

          console.log(
            `Matching #${index + 1} Distance: ${distanceKM.toFixed(2)} KM`,
          );

          chunkDistanceKM += distanceKM;
        });

        console.log(`Chunk Distance: ${chunkDistanceKM.toFixed(2)} KM`);

        totalDistanceKM += chunkDistanceKM;

        // Debug unmatched points
        if (matchedPoints < tracepoints.length) {
          console.log(
            `WARNING: ${
              tracepoints.length - matchedPoints
            } points could not be matched`,
          );

          tracepoints.forEach((tp, idx) => {
            if (!tp) {
              console.log(`Unmatched Point #${idx}`, validCoordinates[i + idx]);
            }
          });
        }

        console.log('------------------------------------');
      } catch (error) {
        console.log('\n====================================');
        console.log(`OSRM Match Chunk Error (${i}-${i + chunk.length - 1})`);

        if (error?.response?.data) {
          console.log(
            'OSRM Response Error:',
            JSON.stringify(error.response.data, null, 2),
          );
        } else {
          console.log('Error:', error.message);
        }

        console.log('====================================');
      }
    }

    console.log('\n====================================');
    console.log('FINAL MATCH DISTANCE:', totalDistanceKM.toFixed(2), 'KM');
    console.log('====================================\n');

    return Number(totalDistanceKM.toFixed(2));
  } catch (error) {
    console.log('OSRM Match Error =>', error.message);
    return 0;
  }
}

module.exports = {
  getOSRMTrackingPoints_Match_API,
  getOSRMTrackingPoints_Route_API,
  calculateOSRMDistance,
  getDistanceByTableAPI,
  getDistanceByMatchAPI,
};
