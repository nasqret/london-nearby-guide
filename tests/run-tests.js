"use strict";

var assert = require("assert");
var utils = require("../js/utils.js");
var nearby = require("../js/nearby.js");
var tests = [];

function test(name, callback) {
  tests.push({ name: name, callback: callback });
}

test("distanceKm returns zero for the same point", function () {
  var point = { lat: 51.500729, lon: -0.124625 };
  assert.strictEqual(utils.distanceKm(point, point), 0);
});

test("distanceKm gives a sensible central London distance", function () {
  var bigBen = { lat: 51.500729, lon: -0.124625 };
  var londonEye = { lat: 51.503324, lon: -0.119543 };
  var distance = utils.distanceKm(bigBen, londonEye);

  assert(distance > 0.4 && distance < 0.6);
});

test("formatDistance switches between metres and kilometres", function () {
  assert.strictEqual(utils.formatDistance(0.42), "420 m");
  assert.strictEqual(utils.formatDistance(1.24), "1.2 km");
  assert.strictEqual(utils.formatDistance(12.2), "12 km");
});

test("Google Maps URL contains origin, destination, and walking mode", function () {
  var url = utils.mapsDirectionsUrl(
    { lat: 51.503324, lon: -0.119543 },
    { lat: 51.500729, lon: -0.124625 }
  );

  assert(url.indexOf("api=1") !== -1);
  assert(url.indexOf("origin=") !== -1);
  assert(url.indexOf("destination=") !== -1);
  assert(url.indexOf("travelmode=walking") !== -1);
});

test("Overpass query uses the selected category and bounded radius", function () {
  var query = nearby.buildNearbyQuery(
    "cafe",
    { lat: 51.5, lon: -0.12 },
    9000
  );

  assert(query.indexOf('["amenity"="cafe"]') !== -1);
  assert(query.indexOf("around:2000,51.500000,-0.120000") !== -1);
});

test("nearby parser sorts, labels, and removes duplicate places", function () {
  var elements = [
    {
      type: "node",
      id: 1,
      lat: 51.501,
      lon: -0.12,
      tags: {
        name: "Close Coffee",
        amenity: "cafe",
        "addr:housenumber": "10",
        "addr:street": "Sample Street"
      }
    },
    {
      type: "way",
      id: 2,
      center: { lat: 51.50101, lon: -0.12001 },
      tags: { name: "Close Coffee", amenity: "cafe" }
    },
    {
      type: "node",
      id: 3,
      lat: 51.508,
      lon: -0.12,
      tags: { name: "Far Coffee", amenity: "cafe" }
    },
    {
      type: "node",
      id: 4,
      lat: 51.502,
      lon: -0.12,
      tags: { amenity: "cafe" }
    }
  ];
  var places = nearby.parseNearbyElements(
    elements,
    { lat: 51.5, lon: -0.12 },
    "cafe"
  );

  assert.strictEqual(places.length, 2);
  assert.strictEqual(places[0].name, "Close Coffee");
  assert.strictEqual(places[0].address, "10 Sample Street");
  assert(places[0].distance < places[1].distance);
});

var failures = 0;

tests.forEach(function (item) {
  try {
    item.callback();
    console.log("PASS " + item.name);
  } catch (error) {
    failures += 1;
    console.error("FAIL " + item.name);
    console.error(error.stack || error.message);
  }
});

console.log("");
console.log(
  tests.length - failures + "/" + tests.length + " tests passed"
);

if (failures) {
  process.exit(1);
}
