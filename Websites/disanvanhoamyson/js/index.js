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

// Main - xử lý URL parameter
window.addEventListener('DOMContentLoaded', async function() {
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