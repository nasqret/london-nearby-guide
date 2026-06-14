(function (root) {
  "use strict";

  var utils =
    root.LondonGuide && root.LondonGuide.utils
      ? root.LondonGuide.utils
      : typeof require === "function"
        ? require("./utils.js")
        : null;

  var CATEGORY_CONFIG = {
    cafe: {
      selector: '["amenity"="cafe"]["name"]',
      fallbackLabel: "Cafe"
    },
    restaurant: {
      selector: '["amenity"~"^(restaurant|fast_food|food_court)$"]["name"]',
      fallbackLabel: "Restaurant"
    },
    shop: {
      selector: '["shop"]["name"]',
      fallbackLabel: "Shop"
    }
  };

  var OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];

  function buildNearbyQuery(category, location, radius) {
    var config = CATEGORY_CONFIG[category];
    var safeRadius = utils.clamp(Math.round(Number(radius) || 1000), 100, 2000);

    if (!config) {
      throw new Error("Unsupported nearby category.");
    }

    if (
      !location ||
      !Number.isFinite(Number(location.lat)) ||
      !Number.isFinite(Number(location.lon))
    ) {
      throw new Error("A valid location is required.");
    }

    return [
      "[out:json][timeout:25];",
      "(",
      "nwr(around:",
      safeRadius,
      ",",
      Number(location.lat).toFixed(6),
      ",",
      Number(location.lon).toFixed(6),
      ")",
      config.selector,
      ";",
      ");",
      "out center tags qt;"
    ].join("");
  }

  function getCoordinates(element) {
    if (
      typeof element.lat === "number" &&
      typeof element.lon === "number"
    ) {
      return { lat: element.lat, lon: element.lon };
    }

    if (
      element.center &&
      typeof element.center.lat === "number" &&
      typeof element.center.lon === "number"
    ) {
      return { lat: element.center.lat, lon: element.center.lon };
    }

    return null;
  }

  function formatAddress(tags) {
    var street = [tags["addr:housenumber"], tags["addr:street"]]
      .filter(Boolean)
      .join(" ");
    var parts = [
      tags["addr:full"],
      street,
      tags["addr:place"],
      tags["addr:suburb"]
    ].filter(Boolean);
    var uniqueParts = parts.filter(function (part, index) {
      return parts.indexOf(part) === index;
    });

    return uniqueParts.join(", ") || "Address available in Google Maps";
  }

  function formatType(tags, category) {
    if (category === "shop") {
      return utils.titleCase(tags.shop || "Shop");
    }

    if (category === "restaurant" && tags.cuisine) {
      return tags.cuisine
        .split(";")
        .slice(0, 2)
        .map(utils.titleCase)
        .join(" / ");
    }

    if (tags.amenity === "fast_food") {
      return "Quick bite";
    }

    if (tags.amenity === "food_court") {
      return "Food court";
    }

    return CATEGORY_CONFIG[category].fallbackLabel;
  }

  function parseNearbyElements(elements, origin, category) {
    var seen = {};

    return (elements || [])
      .map(function (element) {
        var tags = element.tags || {};
        var coordinates = getCoordinates(element);
        var name = String(tags.name || tags.brand || "").trim();

        if (!coordinates || !name) {
          return null;
        }

        return {
          id: element.type + "-" + element.id,
          name: name,
          type: formatType(tags, category),
          address: formatAddress(tags),
          openingHours: String(tags.opening_hours || "").trim(),
          lat: coordinates.lat,
          lon: coordinates.lon,
          distance: utils.distanceKm(origin, coordinates)
        };
      })
      .filter(Boolean)
      .sort(function (left, right) {
        return left.distance - right.distance;
      })
      .filter(function (place) {
        var key =
          place.name.toLowerCase() +
          "|" +
          place.lat.toFixed(4) +
          "|" +
          place.lon.toFixed(4);

        if (seen[key]) {
          return false;
        }

        seen[key] = true;
        return true;
      })
      .slice(0, 30);
  }

  function requestEndpoint(endpoint, query, signal) {
    return fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: "data=" + encodeURIComponent(query),
      signal: signal
    }).then(function (response) {
      if (!response.ok) {
        throw new Error("Nearby service returned " + response.status + ".");
      }

      return response.json();
    });
  }

  function fetchNearby(category, location, radius, signal) {
    var query = buildNearbyQuery(category, location, radius);

    function tryEndpoint(index, previousError) {
      if (index >= OVERPASS_ENDPOINTS.length) {
        throw previousError || new Error("Nearby places are unavailable.");
      }

      return requestEndpoint(OVERPASS_ENDPOINTS[index], query, signal)
        .then(function (payload) {
          return parseNearbyElements(payload.elements, location, category);
        })
        .catch(function (error) {
          if (error && error.name === "AbortError") {
            throw error;
          }

          return tryEndpoint(index + 1, error);
        });
    }

    return tryEndpoint(0);
  }

  var api = {
    buildNearbyQuery: buildNearbyQuery,
    fetchNearby: fetchNearby,
    parseNearbyElements: parseNearbyElements
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.LondonGuide = root.LondonGuide || {};
  root.LondonGuide.nearby = api;
})(typeof window !== "undefined" ? window : global);
