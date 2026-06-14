(function () {
  "use strict";

  var guide = window.LondonGuide;
  var sights = guide.sights;
  var utils = guide.utils;
  var nearbyApi = guide.nearby;

  var state = {
    location: null,
    category: "cafe",
    radius: 1000,
    nearbyController: null,
    requestId: 0,
    installPrompt: null,
    toastTimer: null
  };

  var elements = {};

  var ICONS = {
    cafe:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z"></path><path d="M16 10h2a2 2 0 0 1 0 4h-2M4 21h14M8 3v2M12 3v2"></path></svg>',
    restaurant:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c3 2 4 5 4 8h-4"></path></svg>',
    shop:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v10h16V10M3 10l2-6h14l2 6"></path><path d="M3 10a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6"></path></svg>',
    route:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18-6-6 6-6"></path><path d="M3 12h11a7 7 0 0 1 7 7v2"></path></svg>',
    distance:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z"></path><circle cx="12" cy="9" r="2.5"></circle></svg>'
  };

  function cacheElements() {
    elements.sightsGrid = document.querySelector(".sights-grid");
    elements.sightsSearch = document.querySelector(".sights-search");
    elements.sightsCount = document.querySelector(".sights-count");
    elements.locationCopy = document.querySelector(".location-copy");
    elements.locateButtons = Array.prototype.slice.call(
      document.querySelectorAll(".locate-button")
    );
    elements.categoryTabs = Array.prototype.slice.call(
      document.querySelectorAll(".category-tab")
    );
    elements.radiusSelect = document.querySelector(".radius-select");
    elements.nearbyState = document.querySelector(".nearby-state");
    elements.nearbyGrid = document.querySelector(".nearby-grid");
    elements.nearbyCount = document.querySelector(".nearby-count");
    elements.nearbyResultsHeader = document.querySelector(
      ".nearby-results-header"
    );
    elements.refreshNearby = document.querySelector(".refresh-nearby");
    elements.installButton = document.querySelector(".install-button");
    elements.toast = document.querySelector(".toast");
  }

  function createElement(tagName, className, text) {
    var element = document.createElement(tagName);

    if (className) {
      element.className = className;
    }

    if (typeof text === "string") {
      element.textContent = text;
    }

    return element;
  }

  function createRouteLink(destination, label) {
    var link = createElement("a", "route-link");
    link.href = utils.mapsDirectionsUrl(destination, state.location);
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", label + " in Google Maps");
    link.innerHTML = ICONS.route + "<span>Directions</span>";
    return link;
  }

  function distanceLabel(distance) {
    var label = createElement("span", "distance-label");
    label.innerHTML = ICONS.distance;
    label.appendChild(
      document.createTextNode(
        typeof distance === "number"
          ? utils.formatDistance(distance) + " away"
          : "Open route"
      )
    );
    return label;
  }

  function renderSights() {
    var searchValue = elements.sightsSearch.value.trim().toLowerCase();
    var visibleSights = sights
      .map(function (sight) {
        var item = Object.assign({}, sight);
        item.distance = state.location
          ? utils.distanceKm(state.location, sight)
          : null;
        return item;
      })
      .filter(function (sight) {
        if (!searchValue) {
          return true;
        }

        return [sight.name, sight.area, sight.category, sight.description]
          .join(" ")
          .toLowerCase()
          .indexOf(searchValue) !== -1;
      });

    if (state.location) {
      visibleSights.sort(function (left, right) {
        return left.distance - right.distance;
      });
    }

    elements.sightsGrid.textContent = "";
    elements.sightsCount.textContent =
      visibleSights.length +
      (visibleSights.length === 1 ? " place" : " places") +
      (state.location && visibleSights.length ? " - nearest first" : "");

    if (!visibleSights.length) {
      elements.sightsGrid.appendChild(
        createElement(
          "p",
          "no-results",
          "No London sights match that search. Try another area or landmark."
        )
      );
      return;
    }

    visibleSights.forEach(function (sight, index) {
      var card = createElement("article", "sight-card");
      var topLine = createElement("div", "card-topline");
      var number = createElement(
        "span",
        "sight-index",
        String(index + 1).padStart(2, "0")
      );
      var tag = createElement("span", "card-tag", sight.category);
      var title = createElement("h3", "", sight.name);
      var area = createElement("p", "card-area", sight.area);
      var copy = createElement("p", "card-copy", sight.description);
      var footer = createElement("div", "card-footer");

      card.style.setProperty("--card-accent", sight.accent);
      topLine.appendChild(number);
      topLine.appendChild(tag);
      footer.appendChild(distanceLabel(sight.distance));
      footer.appendChild(
        createRouteLink(
          sight,
          "Get walking directions to " + sight.name
        )
      );

      card.appendChild(topLine);
      card.appendChild(title);
      card.appendChild(area);
      card.appendChild(copy);
      card.appendChild(footer);
      elements.sightsGrid.appendChild(card);
    });
  }

  function setLocateButtonsBusy(isBusy) {
    elements.locateButtons.forEach(function (button) {
      button.disabled = isBusy;
      button.setAttribute("aria-busy", isBusy ? "true" : "false");
    });
  }

  function setLocationMessage(message) {
    elements.locationCopy.textContent = message;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    state.toastTimer = window.setTimeout(function () {
      elements.toast.hidden = true;
    }, 4300);
  }

  function geolocationErrorMessage(error) {
    if (!error) {
      return "Your location could not be read.";
    }

    if (error.code === 1) {
      return "Location access was denied. Enable it in your browser settings and try again.";
    }

    if (error.code === 2) {
      return "Your position is currently unavailable. Check your connection and location settings.";
    }

    if (error.code === 3) {
      return "Finding your position took too long. Move near a window and try again.";
    }

    return "Your location could not be read.";
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support location access.");
      showToast("Location is not supported by this browser.");
      return;
    }

    if (!window.isSecureContext) {
      setLocationMessage("Location needs a secure HTTPS connection.");
      showToast("Open this app over HTTPS to use your position.");
      return;
    }

    setLocateButtonsBusy(true);
    setLocationMessage("Finding your position...");

    navigator.geolocation.getCurrentPosition(
      function (position) {
        state.location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };

        setLocateButtonsBusy(false);
        setLocationMessage(
          "Position ready - accurate to about " +
            Math.round(position.coords.accuracy) +
            " m."
        );
        renderSights();
        loadNearby();

        window.setTimeout(function () {
          document
            .getElementById("nearby")
            .scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      },
      function (error) {
        var message = geolocationErrorMessage(error);
        setLocateButtonsBusy(false);
        setLocationMessage(message);
        renderNearbyPrompt(message);
        showToast(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  }

  function setNearbyLoading() {
    elements.nearbyGrid.textContent = "";
    elements.nearbyResultsHeader.hidden = true;
    elements.nearbyState.hidden = false;
    elements.nearbyState.innerHTML =
      '<div class="loading-state">' +
      '<div><div class="loading-spinner" aria-hidden="true"></div>' +
      "<p>Finding nearby " +
      (state.category === "shop" ? "shops" : state.category + "s") +
      "...</p></div></div>";
  }

  function renderNearbyPrompt(message) {
    var wrapper = createElement("div", "empty-state");
    var number = createElement("span", "empty-state-number", "01");
    var content = createElement("div");
    var title = createElement("h3", "", "Share your position");
    var copy = createElement(
      "p",
      "",
      message ||
        "Coordinates are sent for the live OpenStreetMap search and are not " +
          "stored by this app."
    );
    var button = createElement("button", "button button-accent", "Find places near me");

    button.type = "button";
    button.addEventListener("click", requestLocation);
    content.appendChild(title);
    content.appendChild(copy);
    content.appendChild(button);
    wrapper.appendChild(number);
    wrapper.appendChild(content);

    elements.nearbyState.textContent = "";
    elements.nearbyState.hidden = false;
    elements.nearbyState.appendChild(wrapper);
    elements.nearbyGrid.textContent = "";
    elements.nearbyResultsHeader.hidden = true;
  }

  function renderNearbyError(message) {
    var wrapper = createElement("div", "empty-state");
    var number = createElement("span", "empty-state-number", "!");
    var content = createElement("div");
    var title = createElement("h3", "", "Nearby places did not load");
    var copy = createElement(
      "p",
      "",
      message ||
        "The live place service may be busy. Your location is still ready, so you can try again."
    );
    var button = createElement("button", "button button-accent", "Try again");

    button.type = "button";
    button.addEventListener("click", loadNearby);
    content.appendChild(title);
    content.appendChild(copy);
    content.appendChild(button);
    wrapper.appendChild(number);
    wrapper.appendChild(content);

    elements.nearbyState.textContent = "";
    elements.nearbyState.hidden = false;
    elements.nearbyState.appendChild(wrapper);
    elements.nearbyGrid.textContent = "";
    elements.nearbyResultsHeader.hidden = true;
  }

  function renderNearbyPlaces(places) {
    elements.nearbyState.hidden = true;
    elements.nearbyGrid.textContent = "";
    elements.nearbyResultsHeader.hidden = false;
    elements.nearbyCount.textContent =
      places.length +
      (places.length === 1 ? " place" : " places") +
      " within " +
      (state.radius >= 1000
        ? state.radius / 1000 + " km"
        : state.radius + " m");

    if (!places.length) {
      elements.nearbyGrid.appendChild(
        createElement(
          "p",
          "no-results",
          "No named places were found in this radius. Try a wider distance or another category."
        )
      );
      return;
    }

    places.forEach(function (place) {
      var card = createElement("article", "place-card");
      var topLine = createElement("div", "card-topline");
      var icon = createElement("span", "place-icon");
      var tag = createElement("span", "card-tag", place.type);
      var title = createElement("h3", "", place.name);
      var address = createElement("p", "place-address", place.address);
      var meta = createElement("div", "place-meta");
      var footer = createElement("div", "card-footer");

      icon.innerHTML = ICONS[state.category];
      topLine.appendChild(icon);
      topLine.appendChild(tag);

      if (place.openingHours && place.openingHours.length <= 90) {
        meta.appendChild(
          createElement("span", "", "Hours: " + place.openingHours)
        );
      }

      footer.appendChild(distanceLabel(place.distance));
      footer.appendChild(
        createRouteLink(
          place,
          "Get walking directions to " + place.name
        )
      );

      card.appendChild(topLine);
      card.appendChild(title);
      card.appendChild(address);

      if (meta.childNodes.length) {
        card.appendChild(meta);
      }

      card.appendChild(footer);
      elements.nearbyGrid.appendChild(card);
    });
  }

  function loadNearby() {
    var controller;
    var currentRequestId;
    var timeoutId;

    if (!state.location) {
      renderNearbyPrompt();
      return;
    }

    if (state.nearbyController) {
      state.nearbyController.abort();
    }

    controller = new AbortController();
    state.nearbyController = controller;
    state.requestId += 1;
    currentRequestId = state.requestId;
    setNearbyLoading();

    timeoutId = window.setTimeout(function () {
      controller.abort();
    }, 35000);

    nearbyApi
      .fetchNearby(
        state.category,
        state.location,
        state.radius,
        controller.signal
      )
      .then(function (places) {
        window.clearTimeout(timeoutId);

        if (currentRequestId !== state.requestId) {
          return;
        }

        renderNearbyPlaces(places);
      })
      .catch(function (error) {
        window.clearTimeout(timeoutId);

        if (currentRequestId !== state.requestId) {
          return;
        }

        if (error && error.name === "AbortError") {
          renderNearbyError("The nearby search timed out. Please try again.");
          return;
        }

        renderNearbyError(
          navigator.onLine
            ? "The live OpenStreetMap search is busy or unavailable. Please try again."
            : "You appear to be offline. Reconnect to load live nearby places."
        );
      });
  }

  function selectCategory(button) {
    state.category = button.getAttribute("data-category");
    elements.categoryTabs.forEach(function (tab) {
      var isActive = tab === button;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    if (state.location) {
      loadNearby();
    }
  }

  function setupInstallPrompt() {
    window.addEventListener("beforeinstallprompt", function (event) {
      event.preventDefault();
      state.installPrompt = event;
      elements.installButton.hidden = false;
    });

    elements.installButton.addEventListener("click", function () {
      if (!state.installPrompt) {
        return;
      }

      state.installPrompt.prompt();
      state.installPrompt.userChoice.then(function () {
        state.installPrompt = null;
        elements.installButton.hidden = true;
      });
    });

    window.addEventListener("appinstalled", function () {
      state.installPrompt = null;
      elements.installButton.hidden = true;
      showToast("London Near is installed.");
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").catch(function () {
          // The app remains fully usable without offline installation support.
        });
      });
    }
  }

  function bindEvents() {
    elements.locateButtons.forEach(function (button) {
      button.addEventListener("click", requestLocation);
    });

    document
      .querySelector(".browse-sights-button")
      .addEventListener("click", function () {
        document
          .getElementById("sights")
          .scrollIntoView({ behavior: "smooth", block: "start" });
      });

    elements.sightsSearch.addEventListener("input", renderSights);

    elements.categoryTabs.forEach(function (button) {
      button.setAttribute(
        "aria-pressed",
        button.classList.contains("is-active") ? "true" : "false"
      );
      button.addEventListener("click", function () {
        selectCategory(button);
      });
    });

    elements.radiusSelect.addEventListener("change", function () {
      state.radius = Number(elements.radiusSelect.value);
      if (state.location) {
        loadNearby();
      }
    });

    elements.refreshNearby.addEventListener("click", loadNearby);

    window.addEventListener("offline", function () {
      showToast("You are offline. Saved sights still work; live nearby search needs a connection.");
    });

    window.addEventListener("online", function () {
      showToast("Back online.");
    });
  }

  function init() {
    cacheElements();
    bindEvents();
    renderSights();
    setupInstallPrompt();
    registerServiceWorker();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
