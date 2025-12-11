(function () {
    let currentLang = 'vi-VN';
    let newsSliderInterval;

    function getLanguage() {
        if (window.tour && typeof window.tour.getLocale === 'function') {
            const locale = window.tour.getLocale();
            return locale.startsWith('vi') ? 'vi-VN' : 'en';
        }
        return 'vi-VN';
    }

    function createNewsPopup() {
        if (document.getElementById("newsPopup")) return;

        const overlay = document.createElement("div");
        overlay.id = "newsOverlay";
        overlay.style = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 10000;
      backdrop-filter: blur(1px);
      display: none;
    `;
        const container = document.getElementById('viewer') || document.body;
        container.appendChild(overlay);

        const popup = document.createElement("div");
        popup.id = "newsPopup";
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
      z-index: 10001;
      font-family: "Arial", sans-serif;
      overflow: hidden;
      flex-direction: column;
    `;

        popup.innerHTML = `
      <style>
        #newsPopup * { pointer-events: auto; }
        #newsPopup .close-btn {
          background: rgba(66, 33, 24, 0.32);
          color: #fff;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 12px;
          transition: all 0.2s ease;
        }
        #newsPopup .close-btn:hover {
          background-color: #EACB32;
          color: #fff;
          transform: scale(1.2);
        }
        #newsPopup .content {
          padding: 20px 80px;
          height: calc(100% - 50px);
          overflow-y: auto;
          overflow-x: hidden;
        }
        #newsPopup .popup-title {
           font-size: 24px;
           font-weight: bold;
           color: #EACB32;
           text-align: center;
           margin-bottom: 10px;
           margin-top: 0;
        }
        #newsPopup .popup-date {
          font-size: 14px;
          color: #ddd;
          margin-bottom: 20px;
          text-align: center;
          font-style: italic;
        }
        #newsPopup .popup-content {
          line-height: 1.6;
          font-size: 16px;
          color: #fff !important;
          margin-bottom: 40px;
        }
        #newsPopup .popup-content * {
          color: #fff !important;
        }
        #newsPopup .popup-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 0 auto 15px;
          border-radius: 4px;
        }
        
        /* Slider Styles matching About Js */
        #newsPopup .slider-container {
          margin-top: 20px;
          margin-bottom: 60px;
          position: relative;
          overflow: hidden;
          background: transparent;
          border-top: 1px solid rgba(234, 203, 50, 0.3);
          padding: 20px 0;
          display: flex;
          align-items: center;
        }
        #newsPopup .slider-track {
          display: flex;
          gap: 20px;
          transition: transform 0.5s ease-in-out;
          will-change: transform;
        }
        #newsPopup .slide-item {
          flex: 0 0 auto;
          background: rgba(234, 203, 50, 0.8);
          color: #422118;
          padding: 10px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          width: 300px;
          gap: 10px;
          cursor: pointer;
        }
        #newsPopup .slide-item img {
          width: 100px;
          height: 100px;
          border-radius: 8px;
          object-fit: cover;
          margin: 0;
        }
        #newsPopup .slide-text {
          flex: 1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: center;
          text-align: left;
        }
        #newsPopup .slide-title {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 5px;
          color: #422118;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        #newsPopup .slide-date {
          font-size: 14px;
          color: #422118;
        }
        #newsPopup .slider-button {
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
        #newsPopup .slider-button.left { left: 0; }
        #newsPopup .slider-button.right { right: 0; }
      </style>
      
      <div style="text-align:right; padding:10px;">
        <button onclick="hideNewsPopup()" class="close-btn">✖</button>
      </div>

      <div class="content">
        <h3 class="popup-title" id="newsPopupTitle"></h3>
        <div class="popup-date" id="newsPopupDate"></div>
        <div class="popup-content" id="newsPopupContent"></div>
        
        <div class="slider-container">
            <button class="slider-button left" id="newsSliderLeft">❮</button>
            <div class="slider-track" id="newsSliderTrack"></div>
            <button class="slider-button right" id="newsSliderRight">❯</button>
        </div>
      </div>
    `;

        container.appendChild(popup);

        // Close on overlay click
        overlay.onclick = hideNewsPopup;
    }

    window.showNewsPopup = function (data) {
        if (window.hideAboutPopup) {
            window.hideAboutPopup();
        }

        if (!document.getElementById("newsPopup")) {
            createNewsPopup();
        }

        currentLang = getLanguage();
        const popup = document.getElementById("newsPopup");
        const overlay = document.getElementById("newsOverlay");
        const titleEl = document.getElementById("newsPopupTitle");
        const dateEl = document.getElementById("newsPopupDate");
        const contentEl = document.getElementById("newsPopupContent");

        if (popup && overlay) {
            // Determine content based on language
            const title = currentLang === 'vi-VN' ? data.title_vi : data.title_en;
            const content = currentLang === 'vi-VN' ? data.content_vi : data.content_en;

            titleEl.textContent = title;
            dateEl.textContent = data.date;
            contentEl.innerHTML = content; // Content is HTML

            popup.style.display = "flex";
            overlay.style.display = "block";

            // Scroll to top
            const contentWrapper = popup.querySelector('.content');
            if (contentWrapper) {
                contentWrapper.scrollTop = 0;
            }

            // Initialize slider with the same slides data from About popup
            if (window.currentAboutSlides) {
                setTimeout(() => initNewsSlider(window.currentAboutSlides), 100);
            }
        }
    };

    function initNewsSlider(slideData) {
        const track = document.getElementById('newsSliderTrack');
        const leftBtn = document.getElementById('newsSliderLeft');
        const rightBtn = document.getElementById('newsSliderRight');

        if (!track || !leftBtn || !rightBtn) return;

        if (newsSliderInterval) clearInterval(newsSliderInterval);

        // Duplicate data for infinite loop illusion
        const loopData = [...slideData, ...slideData, ...slideData];
        const itemWidth = 320; // Adjusted for 300px width + 20px gap

        const buildSlide = (item, originalIndex) => `
        <div class="slide-item" onclick="window.showNewsPopup(window.currentAboutSlides[${originalIndex}])">
          <img src="${item.img}">
          <div class="slide-text">
            <div class="slide-title">${currentLang === 'vi-VN' ? item.title_vi : item.title_en}</div>
            <div class="slide-date">${item.date}</div>
          </div>
        </div>
    `;

        track.innerHTML = loopData.map((slide, i) => {
            const originalIndex = i % slideData.length;
            return buildSlide(slide, originalIndex);
        }).join('');

        let index = slideData.length; // Start in middle set

        const updatePosition = (transition = true) => {
            track.style.transition = transition ? 'transform 0.5s ease-in-out' : 'none';
            track.style.transform = `translateX(-${index * itemWidth}px)`;
        };

        updatePosition(false);

        const moveSlide = (step) => {
            index += step;
            updatePosition();

            track.addEventListener('transitionend', () => {
                if (index >= 2 * slideData.length) {
                    index = slideData.length;
                    updatePosition(false);
                } else if (index < slideData.length) {
                    index = 2 * slideData.length - 1;
                    updatePosition(false);
                }
            }, { once: true });
        };

        // Attach button listeners (clear old ones by cloning or just re-assigning onclick? cloning is safer for removing listeners but onclick is simple)
        // Actually, since we re-create innerHTML of track, we don't need to replace track. BUT buttons are outside track.
        // Use onclick property to overwrite previous handlers
        leftBtn.onclick = () => {
            clearInterval(newsSliderInterval);
            moveSlide(-1);
        };

        rightBtn.onclick = () => {
            clearInterval(newsSliderInterval);
            moveSlide(1);
        };

        // Auto play
        // newsSliderInterval = setInterval(() => moveSlide(1), 5000);
        // Maybe no auto-play for this detailed view to avoid distraction?
        // User asked for "slides ở dưới cùng để người dùng có thể chọn".
        // I will enable auto-play for consistency but maybe slower?
        // Let's comment out auto-play for now or enable it?
        // I'll enable it.
        newsSliderInterval = setInterval(() => moveSlide(1), 6000);
    }

    window.hideNewsPopup = function () {
        const popup = document.getElementById("newsPopup");
        const overlay = document.getElementById("newsOverlay");
        if (popup) popup.style.display = "none";
        if (overlay) overlay.style.display = "none";
    };
})();
