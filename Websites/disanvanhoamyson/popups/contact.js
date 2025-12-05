(function () {
  function createContactPopup() {
    if (document.getElementById("contactPopup")) return;

    const overlay = document.createElement("div");
    overlay.id = "contactOverlay";
    overlay.style = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 9998;
      pointer-events: all;
    `;
    document.body.appendChild(overlay);

    // Tạm chặn tương tác với các phần còn lại (menu, v.v.)
    document.body.style.pointerEvents = 'none';
    overlay.style.pointerEvents = 'auto';

    const popup = document.createElement("div");
    popup.id = "contactPopup";
    popup.style = `
      display: none;
      position: fixed;
      top: 0%;
      left: 0%;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9); /* Transparent 10% */
      color: #ffffff;
      border: 0;
      border-radius: 0px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      z-index: 9999;
      font-family: "Arial", Arial, sans-serif;
      overflow: hidden;
      backdrop-filter: blur(1px); /* Làm mờ nền phía sau */
    `;

    popup.innerHTML = `
      <style>
        body {
          overflow-x: hidden;
        }

        #contactPopup * {
          pointer-events: auto;
        }

        #contactPopup input,
        #contactPopup textarea {
          background: #222;
          color: #fff;
          border: 0;
          width: 90%;
          padding: 12px;
          font-size: 16px;
        }

        #contactPopup button[type="submit"] {
          background: rgba(66, 33, 24, 0.32);
          color: #fff;
          font-weight: bold;
          font-size: 16px;
          padding: 12px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 90%;
        }

        #contactPopup button[type="submit"]:hover {
          background: #EACB32;
          color: #000;
        }

        #contactPopup h2, #contactPopup h3 {
          margin-top: 0;
          color: #EACB32;
        }

        #contactPopup .map-container iframe {
          width: 100%;
          height: 100%;
          border: 0;
        }

        #contactPopup .close-btn {
          background:rgba(66, 33, 24, 0.32);
          color: #fff;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        #contactPopup .close-btn:hover {
          background-color: #EACB32;
          color: #fff;
          transform: scale(1.2);
        }

        .g-recaptcha {
          transform: scale(1.05);
          transform-origin: 0 0;
        }
      </style>

      <div style="text-align:right; padding:10px;">
        <button onclick="hideContactPopup()" class="close-btn">✖</button>
      </div>

      <div style="display: flex; height: calc(100% - 50px);">
        <!-- Form -->
        <div style="flex: 1; padding: 10px 0px 20px 80px; overflow-y: auto; overflow-x: hidden;">
          <h2>LIÊN HỆ VỚI CHÚNG TÔI</h2>
          <p>Vui lòng điền thông tin bên dưới để gửi liên hệ:</p>
          <form id="contactForm" style="display: grid; gap: 12px;">
            <input type="text" name="name" placeholder="Họ và tên" required>
            <input type="email" name="email" placeholder="Email" required>
            <input type="text" name="phone" placeholder="Số điện thoại">
            <textarea name="message" placeholder="Nội dung liên hệ" rows="5" required></textarea>

            <div class="g-recaptcha" data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"></div>

            <button type="submit">Gửi liên hệ</button>
          </form>

          <div style="margin-top:30px;">
            <h3>THÔNG TIN LIÊN HỆ</h3>
            <p><strong>DI SẢN VĂN HÓA THẾ GIỚI MỸ SƠN</strong></p>
            <p>Địa chỉ: thôn Mỹ Sơn, xã Thu Bồn, thành phố Đà Nẵng</p>
            <p>Điện thoại: 0963.412.068</p>
            <p>Email: mysonstr@gmail.com</p>
          </div>
        </div>

        <!-- Map -->
        <div class="map-container" style="flex: 1; padding: 10px 40px 40px 40px; border-left: 1px solid #444; overflow: hidden;">
          <iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d61435.45181688792!2d108.100787!3d15.76617!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314200815555551f%3A0x8baa2869b9f687b!2sMy%20Son!5e0!3m2!1sen!2sus!4v1750676910555!5m2!1sen!2sus" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    // Load reCAPTCHA nếu chưa có
    if (!document.getElementById('recaptcha-script')) {
      const recaptcha = document.createElement("script");
      recaptcha.src = "https://www.google.com/recaptcha/api.js";
      recaptcha.id = "recaptcha-script";
      document.body.appendChild(recaptcha);
    }

    document.getElementById("contactForm").addEventListener("submit", function (e) {
      e.preventDefault();

      const response = grecaptcha.getResponse();
      if (!response) {
        alert("Vui lòng xác minh reCAPTCHA.");
        return;
      }

      alert("Cảm ơn bạn đã liên hệ! (Demo - chưa gửi dữ liệu)");
      hideContactPopup();
    });
  }

  window.showContactPopup = function () {
    createContactPopup();
    document.getElementById("contactPopup").style.display = "block";
  };

  window.hideContactPopup = function () {
    const popup = document.getElementById("contactPopup");
    const overlay = document.getElementById("contactOverlay");
    if (popup) popup.style.display = "none";
    if (overlay) overlay.remove();
    // Khôi phục tương tác toàn trang
    document.body.style.pointerEvents = 'auto';
  };
})();
