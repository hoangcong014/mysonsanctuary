// Lấy URL hiện tại
const url = window.location.href;

// Tách lấy ID sau dấu $
const parts = url.split("?");

// Kiểm tra xem có ID không
let productId = null;
if (parts.length > 1 && parts[1].trim() !== "") {
    productId = parts[1].trim();
}

// Hiển thị ID (test)
if (productId) {
    console.log("Product ID =", productId);
    // Bạn có thể xử lý tiếp tại đây
} else {
    console.log("Không tìm thấy product ID trên URL");
}
