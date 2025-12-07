(function () {
  function createContactPopup() {
    // XÓA popup cũ nếu có (để tạo mới với ngôn ngữ hiện tại)
    const oldPopup = document.getElementById("contactPopup");
    const oldOverlay = document.getElementById("contactOverlay");
    if (oldPopup) oldPopup.remove();
    if (oldOverlay) oldOverlay.remove();

    // LẤY NGÔN NGỮ HIỆN TẠI mỗi lần tạo popup
    const currentLang = (typeof TourHelpers !== 'undefined' && TourHelpers.getCurrentLanguage) 
      ? TourHelpers.getCurrentLanguage() 
      : 'vi';
    
    const isEnglish = currentLang === 'en' || currentLang === 'en-US';

    // Định nghĩa các text theo ngôn ngữ
    const translations = {
      vi: {
        title: "LIÊN HỆ VỚI CHÚNG TÔI",
        description: "Vui lòng điền thông tin bên dưới để gửi liên hệ:",
        namePlaceholder: "Họ và tên",
        emailPlaceholder: "Email",
        phonePlaceholder: "Số điện thoại",
        messagePlaceholder: "Nội dung liên hệ",
        submitButton: "Gửi liên hệ",
        contactInfoTitle: "THÔNG TIN LIÊN HỆ",
        companyName: "DI SẢN VĂN HÓA THẾ GIỚI MỸ SƠN",
        address: "Địa chỉ: thôn Mỹ Sơn, xã Thu Bồn, thành phố Đà Nẵng",
        phone: "Điện thoại: 0963.412.068",
        recaptchaError: "Vui lòng xác minh reCAPTCHA.",
        successMessage: "Cảm ơn bạn đã liên hệ! (Demo - chưa gửi dữ liệu)"
      },
      en: {
        title: "CONTACT US",
        description: "Please fill in the information below to send us a message:",
        namePlaceholder: "Full Name",
        emailPlaceholder: "Email",
        phonePlaceholder: "Phone Number",
        messagePlaceholder: "Message",
        submitButton: "Send Message",
        contactInfoTitle: "CONTACT INFORMATION",
        companyName: "MY SON WORLD CULTURAL HERITAGE",
        address: "Address: My Son hamlet, Thu Bon commune, Da Nang city",
        phone: "Phone: 0963.412.068",
        recaptchaError: "Please verify reCAPTCHA.",
        successMessage: "Thank you for contacting us! (Demo - data not sent)"
      }
    };

    const t = isEnglish ? translations.en : translations.vi;

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
      background: rgba(0, 0, 0, 0.9);
      color: #ffffff;
      border: 0;
      border-radius: 0px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      z-index: 9999;
      font-family: "Arial", Arial, sans-serif;
      overflow: hidden;
      backdrop-filter: blur(1px);
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
          <h2>${t.title}</h2>
          <p>${t.description}</p>
          <form id="contactForm" style="display: grid; gap: 12px;">
            <input type="text" name="name" placeholder="${t.namePlaceholder}" required>
            <input type="email" name="email" placeholder="${t.emailPlaceholder}" required>
            <input type="text" name="phone" placeholder="${t.phonePlaceholder}">
            <textarea name="message" placeholder="${t.messagePlaceholder}" rows="5" required></textarea>

            <div class="g-recaptcha" data-sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"></div>

            <button type="submit">${t.submitButton}</button>
          </form>

          <div style="margin-top:30px;">
            <h3>${t.contactInfoTitle}</h3>
            <p><strong>${t.companyName}</strong></p>
            <p>${t.address}</p>
            <p>${t.phone}</p>
            <p>Email: mysonstr@gmail.com</p>
          </div>
        </div>

        <!-- Map -->
        <div class="map-container" style="flex: 1; padding: 10px 40px 40px 40px; border-left: 1px solid #444; overflow: hidden;">
          <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d21720.062196611318!2d108.10108091887567!3d15.77224269553354!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314200918e1ccec1%3A0x470ae6f59070c40!2zRGkgc-G6o24gVsSDbiBob8OhIHRo4bq_IGdp4bubaSBN4bu5IFPGoW4!5e0!3m2!1svi!2s!4v1765089845091!5m2!1svi!2s" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
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
    } else {
      // Reset reCAPTCHA nếu đã có
      if (typeof grecaptcha !== 'undefined') {
        setTimeout(() => {
          try {
            grecaptcha.render(document.querySelector('.g-recaptcha'));
          } catch(e) {
            // Ignore nếu đã render rồi
          }
        }, 100);
      }
    }

    document.getElementById("contactForm").addEventListener("submit", function (e) {
      e.preventDefault();

      const response = grecaptcha.getResponse();
      if (!response) {
        alert(t.recaptchaError);
        return;
      }

      alert(t.successMessage);
      hideContactPopup();
    });
  }

  window.showContactPopup = function () {
    // TẠO MỚI popup mỗi lần show (để cập nhật ngôn ngữ)
    createContactPopup();
    document.getElementById("contactPopup").style.display = "block";
  };

  window.hideContactPopup = function () {
    const popup = document.getElementById("contactPopup");
    const overlay = document.getElementById("contactOverlay");
    if (popup) popup.style.display = "none";
    if (overlay) overlay.remove();
    document.body.style.pointerEvents = 'auto';
  };
})();