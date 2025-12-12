// index.js

// Hàm đợi tour (trả về Promise)
function waitFor3DVistaTour(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      if (window.tour && typeof window.tour.setMediaByName === "function") {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error("Tour không load được"));
      }
    }, 100);
  });
}

// Hàm lấy pano hiện tại
function getCurrentPano() {
  return window.tour ? window.tour.getCurrentMediaName() : null;
}

// Hàm chuyển pano
async function goToPano(panoName) {
  try {
    await waitFor3DVistaTour();

    window.tour.setMediaByName(panoName);
    console.log("Đã chuyển đến pano:", panoName);

  } catch (error) {
    console.error("x", error.message);
    console.log("Không thể load tour. Vui lòng tải lại trang.");
  }
}

// API Config
const API_VISIT = "https://myson3d-preprod.api.dfm-engineering.com/api/users/visit";
const API_STATS = "https://myson3d-preprod.api.dfm-engineering.com/api/users/stats";

async function increaseVisitCount() {
  try {
    // Check if we already counted this session to avoid spam on refresh
    if (sessionStorage.getItem('hasVisited')) {
      console.log("Visit already counted for this session.");
      return;
    }

    await fetch(API_VISIT, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    console.log("Visit count incremented");
    sessionStorage.setItem('hasVisited', 'true');
  } catch (e) {
    console.error("Failed to increment visit count", e);
  }
}

async function getVisitStats() {
  const renderStats = (count) => {
    // Display count in ContainerCounter

    // Helper to get ContainerCounter
    const mountCounter = async () => {
      let container = null;
      let attempts = 0;

      while (!container && attempts < 20) {
        if (window.TourHelpers && typeof window.TourHelpers.getComponentByName === 'function') {
          container = window.TourHelpers.getComponentByName("ContainerCounter");
        }
        if (!container) await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (!container) {
        console.warn("ContainerCounter not found in tour");
        return;
      }

      let counterEl = document.getElementById("globalVisitCounter");
      if (!counterEl) {
        counterEl = document.createElement("div");
        counterEl.id = "globalVisitCounter";
        // inherit styles from parent or use minimal styles
        counterEl.style.cssText = `
                  position: absolute;
                  bottom: 0;
                  left: 20px;
                  background: white;
                  padding: 5px 10px;
                  display: flex;
                  align-items: center;
                  gap: 5px;
                  pointer-events: auto;
                  font-family: Arial, sans-serif;
                  font-size: 14px;
              `;
        // Append to container without clearing it
        if (!container.contains(counterEl)) {
          container.appendChild(counterEl);
        }
      }

      counterEl.innerHTML = `<span id="visitLabel" style="color: #000000ff; font-weight: bold; margin-left: 2px;">Số lượt truy cập:</span><span id="visitCountValue" style="color: #ff0000ff; font-weight: bold; margin-left: 2px;"></span>`;
    };

    mountCounter();

    // Logic to update text and keep it updated
    const updateLabel = () => {
      let lang = 'vi-VN';
      if (window.tour && typeof window.tour.getLocale === 'function') {
        const locale = window.tour.getLocale();
        if (locale && !locale.startsWith('vi')) lang = 'en';
      }

      const labelEl = document.getElementById("visitLabel");
      if (labelEl) {
        labelEl.textContent = lang === 'vi-VN' ? "Số lượt truy cập:" : "Number of visits:";
      }
    };

    // Initial update
    updateLabel();
    // Check for language changes periodically
    if (!window.visitLabelInterval) {
      window.visitLabelInterval = setInterval(updateLabel, 1000);
    }

    const valueEl = document.getElementById("visitCountValue");
    if (valueEl) {
      valueEl.textContent = count.toLocaleString();
    }
  };

  try {
    const res = await fetch(API_STATS, {
      method: "GET"
      // Auth token removed as backend handles it now
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const json = await res.json();
    console.log("Stats response:", json);

    let count = 0;
    if (json.success && json.data) {
      count = json.data.total_visits || json.data.totalVisits || json.data.count || json.data;
    } else {
      count = json.total_visits || json.count || 0;
    }

    // Validate count before saving
    if (count > 0) {
      localStorage.setItem('cachedVisitCount', count);
      renderStats(count);
    } else {
      // API returned 0 or invalid data, fallback to cache
      throw new Error("Invalid count from API");
    }

  } catch (e) {
    console.error("Failed to get stats, trying localStorage", e);
    // Fallback to localStorage
    const cached = localStorage.getItem('cachedVisitCount');
    if (cached) {
      console.log("Using cached visit count:", cached);
      renderStats(parseInt(cached, 10));
    } else {
      // If no cache, show random or handle error visually if desirable, but random is safe default
      renderStats(randomIntFromInterval(10001, 20000));
    }
  }
}

// Main - xử lý URL parameter
window.addEventListener('DOMContentLoaded', async function () {
  increaseVisitCount(); // Increment on load
  getVisitStats();      // Fetch and display stats

  const url = window.location.href;
  const parts = url.split("?");

  let productId = null;
  if (parts.length > 1 && parts[1].trim() !== "") {
    productId = parts[1].trim();
  }

  if (productId) {
    console.log("Product ID =", productId);
    const panoName = 'asset' + productId;
    await goToPano(panoName);
  } else {
    console.log("Không có product ID trên URL");
  }
});