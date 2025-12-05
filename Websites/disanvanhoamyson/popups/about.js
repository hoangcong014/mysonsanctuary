(function () {
  function createAboutPopup() {
    if (document.getElementById("aboutPopup")) return;

    const overlay = document.createElement("div");
    overlay.id = "aboutOverlay";
    overlay.style = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 9998;
      backdrop-filter: blur(1px);
    `;
    document.body.appendChild(overlay);
    document.querySelectorAll("nav, header, footer, .menu, .navbar").forEach(el => el.style.pointerEvents = 'none');

    const popup = document.createElement("div");
    popup.id = "aboutPopup";
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
      font-family: "Arial Greek", Arial, sans-serif;
      overflow: hidden;
    `;

    popup.innerHTML = `
      <style>
        #aboutPopup * { pointer-events: auto; }
        #aboutPopup .close-btn {
          background: none; color: #fff; border: none;
          font-size: 20px; cursor: pointer;
          padding: 5px 10px; border-radius: 12px;
          transition: all 0.2s ease;
        }
        #aboutPopup h2, #aboutPopup h3 {
          margin-top: 0;
          color: #EACB32;
          text-align: center;
        }
        #aboutPopup ul {
          padding-left: 20px;
        }
        #aboutPopup ul li {
          margin-bottom: 8px;
        }
        #aboutPopup p {
          margin-bottom: 12px;
          line-height: 1.6;
        }
        #aboutPopup .close-btn {
          background:rgba(66, 33, 24, 0.32);
          color: #fff;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        #aboutPopup .close-btn:hover {
          background-color: #EACB32;
          color: #fff;
          transform: scale(1.2);
        }
        #aboutPopup .content {
          padding: 20px 80px;
          height: calc(100% - 50px);
          overflow-y: auto;
          overflow-x: hidden;
        }
        .title-divider {
          width: 130px;
          border: none;
          border-bottom: 2px solid #EACB32;
          margin: 10px auto 20px;
        }
        .slider-container {
          margin-top: 60px;
          margin-bottom: 60px;
          position: relative;
          overflow: hidden;
        }
        .slider-track {
          display: flex;
          gap: 20px;
          transition: transform 0.5s ease-in-out;
          will-change: transform;
        }
        .slide-item {
          flex: 0 0 auto;
          background:rgba(234, 203, 50, 0.8);
          color: #422118;
          padding: 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          width: 300px;
          gap: 10px;
        }
        .slide-item img {
          width: 100px;
          height: 100px;
          border-radius: 8px;
          object-fit: cover;
        }
        .slide-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: left;
        }
        .slide-title {
          font-weight: bold;
          margin-bottom: 48px;
        }
        .slide-date {
          font-size: 14px;
          color: #422118;
        }
        .slider-button {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background-color: rgba(255, 255, 255, 0.5);
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 5px 10px;
          z-index: 10;
        }
        .slider-button.left { left: 0; }
        .slider-button.right { right: 0; }
      </style>

      <div style="text-align:right; padding:10px;">
        <button onclick="hideAboutPopup()" class="close-btn">✖</button>
      </div>

      <div class="content">
        <h2>VỀ CHÚNG TÔI</h2>
        <hr class="title-divider">

        <p><strong>Di sản Văn hóa Thế giới Khu đền tháp Chăm Mỹ Sơn</strong> thuộc thôn Mỹ Sơn, xã Thu Bồn, thành phố Đà Nẵng có vị trí tọa độ địa lý:</p>
        <ul>
          <li>Vĩ độ Bắc: 15° 46′ 26.02″</li>
          <li>Kinh độ Đông: 108° 6′ 32.71″</li>
          <li>Quy hoạch bảo tồn và phát huy có tổng diện tích: 1.158 ha</li>
          <li>Mỹ Sơn cách Trà Kiệu (Kinh thành Simhapura): 20 km</li>
          <li>Cách Di sản Văn hóa Thế giới Đô thị cổ Hội An: 45 km</li>
          <li>Cách cố đô Huế – Di sản Văn hóa Thế giới: 145 km</li>
          <li>Cách thành phố Đà Nẵng: 68 km</li>
        </ul>

        <p>Thánh địa Mỹ Sơn tọa lạc trong một thung lũng kín có địa thế núi non hùng vĩ, thanh nghiêm. Nơi đây, với hơn 70 công trình kiến trúc đền tháp của nền văn minh Chămpa được kết tinh trong những di chứng vật chất trường tồn, chứa đựng những giá trị về lịch sử, văn hóa, kiến trúc, nghệ thuật được tạo lập trong một thời gian dài suốt 9 thế kỷ (từ thế kỷ IV đến thế kỷ XIII), được đánh giá ngang hàng với các di tích nổi tiếng trong khu vực Đông Nam Á như Angkor, Pagan, Borobudur.</p>

        <p>Kazik (Kazimierz – Kwiatkowski) – người kiến trúc sư tài ba nhiều năm gắn bó với Mỹ Sơn đã nói: bên cạnh các di tích "người Chămpa cổ đã gửi tâm linh vào đất đá" và đã biết đưa thiên nhiên để làm nên một Mỹ Sơn tráng lệ – thâm nghiêm – hùng vĩ. Đây là một bảo tàng kiến trúc điêu khắc nghệ thuật vô giá của nhân loại mà sẽ còn lâu chúng ta mới hiểu hết.</p>

        <p>Thời gian và chiến tranh đã tàn phá di tích nặng nề. Nhưng những gì còn lại ở Mỹ Sơn vẫn đóng một vai trò cực kỳ quan trọng trong di sản lịch sử văn hóa kiến trúc nghệ thuật thế giới.</p>

        <p>Trước những giá trị nổi bật toàn cầu của một khu di sản văn hóa cần phải được bảo vệ vì lợi ích của cả nhân loại, ngày 4 tháng 12 năm 1999, tại thành phố Marrakesh – Vương quốc Ma-rốc, khu di tích Mỹ Sơn được ghi danh vào danh sách di sản văn hóa thế giới của UNESCO.</p>

        <div class="slider-container">
          <button class="slider-button left">❮</button>
          <div class="slider-track" id="sliderTrack"></div>
          <button class="slider-button right">❯</button>
        </div>
      </div>
    `;

    document.body.appendChild(popup);
    setTimeout(() => {
      const leftBtn = document.querySelector('.slider-button.left');
      const rightBtn = document.querySelector('.slider-button.right');
      const track = document.getElementById('sliderTrack');

      const slideData = [
        {
          img: "https://disanvanhoamyson.vn/thumb/120x115x1x90/upload/news/b-1328.jpg",
          title: "Lịch Sử Văn Hóa",
          date: "📅 05 Tháng 6,2025"
        },
        {
          img: "https://disanvanhoamyson.vn/thumb/120x115x1x90/upload/news/22222222-3481.jpg",
          title: "Chức Năng Nhiệm Vụ",
          date: "📅 06 Tháng 6,2025"
        },
        {
          img: "https://disanvanhoamyson.vn/thumb/120x115x1x90/upload/news/c-2421.jpg",
          title: "Kiến Trúc Nghệ Thuật",
          date: "📅 10 Tháng 6,2025"
        },
        {
          img: "https://disanvanhoamyson.vn/thumb/120x115x1x90/upload/news/d-9330.jpg",
          title: "Cảnh Quan Không Gian",
          date: "📅 15 Tháng 6,2025"
        },
        {
          img: "https://disanvanhoamyson.vn/thumb/120x115x1x90/upload/news/ban-do-quy-hoach-tong-the-8362.jpg",
          title: "Bản Đồ",
          date: "📅 14 Tháng 6,2025"
        }
        
      ];

      const loopData = [...slideData, ...slideData, ...slideData];
      const itemWidth = 320;
      const total = loopData.length;

      const buildSlide = ({ img, title, date }) => `
        <div class="slide-item">
          <img src="${img}">
          <div class="slide-text">
            <div class="slide-title">${title}</div>
            <div class="slide-date">${date}</div>
          </div>
        </div>
      `;

      track.innerHTML = loopData.map(buildSlide).join('');
      let index = slideData.length;
      track.style.transition = 'none';
      track.style.transform = `translateX(-${itemWidth * index}px)`;

      function moveSlide(dir) {
        if (track.moving) return;
        track.moving = true;

        index += dir;
        track.style.transition = 'transform 0.5s ease-in-out';
        track.style.transform = `translateX(-${itemWidth * index}px)`;

        track.addEventListener('transitionend', () => {
          if (index <= slideData.length - 1) {
            index += slideData.length;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${itemWidth * index}px)`;
          }
          if (index >= loopData.length - slideData.length) {
            index -= slideData.length;
            track.style.transition = 'none';
            track.style.transform = `translateX(-${itemWidth * index}px)`;
          }
          track.moving = false;
        }, { once: true });
      }

      leftBtn?.addEventListener('click', () => moveSlide(-1));
      rightBtn?.addEventListener('click', () => moveSlide(1));
      setInterval(() => moveSlide(1), 6000);
    }, 100);
  }

  window.showAboutPopup = function () {
    createAboutPopup();
    document.getElementById("aboutPopup").style.display = "block";
  };

  window.hideAboutPopup = function () {
    const popup = document.getElementById("aboutPopup");
    const overlay = document.getElementById("aboutOverlay");
    if (popup) popup.style.display = "none";
    if (overlay) overlay.remove();
    document.querySelectorAll("nav, header, footer, .menu, .navbar").forEach(el => el.style.pointerEvents = 'auto');
  };
})();
