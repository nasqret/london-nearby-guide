(function (root) {
  "use strict";

  var EARTH_RADIUS_KM = 6371.0088;

  function toRadians(value) {
    return (value * Math.PI) / 180;
  }

  function distanceKm(from, to) {
    var latDelta = toRadians(to.lat - from.lat);
    var lonDelta = toRadians(to.lon - from.lon);
    var fromLat = toRadians(from.lat);
    var toLat = toRadians(to.lat);
    var a =
      Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
      Math.cos(fromLat) *
        Math.cos(toLat) *
        Math.sin(lonDelta / 2) *
        Math.sin(lonDelta / 2);
    var angularDistance = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_KM * angularDistance;
  }

  function formatDistance(kilometres) {
    if (!Number.isFinite(kilometres) || kilometres < 0) {
      return "";
    }

    if (kilometres < 0.01) {
      return "< 10 m";
    }

    if (kilometres < 1) {
      return Math.round((kilometres * 1000) / 10) * 10 + " m";
    }

    if (kilometres < 10) {
      return kilometres.toFixed(1) + " km";
    }

    return Math.round(kilometres) + " km";
  }

  function coordinatePair(location) {
    return Number(location.lat).toFixed(6) + "," + Number(location.lon).toFixed(6);
  }

  function mapsDirectionsUrl(destination, origin) {
    var parameters = [
      "api=1",
      "destination=" + encodeURIComponent(coordinatePair(destination)),
      "travelmode=walking"
    ];

    if (origin) {
      parameters.splice(1, 0, "origin=" + encodeURIComponent(coordinatePair(origin)));
    }

    return "https://www.google.com/maps/dir/?" + parameters.join("&");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  var api = {
    clamp: clamp,
    distanceKm: distanceKm,
    formatDistance: formatDistance,
    mapsDirectionsUrl: mapsDirectionsUrl,
    titleCase: titleCase
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.LondonGuide = root.LondonGuide || {};
  root.LondonGuide.utils = api;
})(typeof window !== "undefined" ? window : global);
