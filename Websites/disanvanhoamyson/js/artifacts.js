/**
 * artifacts.js
 * Module quản lý hiển thị artifacts - Simple & Compact Layout
 * Chỉ hiển thị: Ảnh thumb + Tên
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    jsonPath: './jsons/assets.json',
    containerName: 'Container Artifacts',
    autoInit: true,
    showAnimation: true,
    itemsPerPage: 20, // Tăng lên vì card nhỏ hơn
    maxPageButtons: 5,
    debug: true
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const state = {
    artifacts: [],
    filteredArtifacts: [],
    container: null,
    isLoaded: false,
    currentFilter: null,
    currentLanguage: 'vi', // Track ngôn ngữ hiện tại
    languageCheckInterval: null, // Interval để check ngôn ngữ
    
    pagination: {
      currentPage: 1,
      totalPages: 1,
      itemsPerPage: CONFIG.itemsPerPage,
      totalItems: 0
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  function log(message, ...args) {
    if (CONFIG.debug) {
      console.log('[Artifacts]', message, ...args);
    }
  }

  function logError(message, error) {
    console.error('[Artifacts Error]', message, error);
  }

  // Lấy ngôn ngữ hiện tại
  function getCurrentLanguage() {
    try {
      if (typeof TourHelpers !== 'undefined' && TourHelpers.getCurrentLanguage) {
        return TourHelpers.getCurrentLanguage();
      }
    } catch (e) {
      log('Không lấy được ngôn ngữ tour, dùng mặc định: vi');
    }
    return 'vi'; // Mặc định
  }

  // ============================================
  // LANGUAGE CHANGE DETECTION
  // ============================================
  
  function startLanguageMonitoring() {
    // Lưu ngôn ngữ ban đầu
    state.currentLanguage = getCurrentLanguage();
    log('Bắt đầu theo dõi thay đổi ngôn ngữ. Ngôn ngữ hiện tại:', state.currentLanguage);
    
    // Check ngôn ngữ mỗi 500ms
    state.languageCheckInterval = setInterval(() => {
      const newLanguage = getCurrentLanguage();
      
      if (newLanguage !== state.currentLanguage) {
        log(`Phát hiện đổi ngôn ngữ: ${state.currentLanguage} → ${newLanguage}`);
        state.currentLanguage = newLanguage;
        
        // Re-render artifacts với ngôn ngữ mới
        onLanguageChange();
      }
    }, 500);
  }

  function stopLanguageMonitoring() {
    if (state.languageCheckInterval) {
      clearInterval(state.languageCheckInterval);
      state.languageCheckInterval = null;
      log('Đã dừng theo dõi thay đổi ngôn ngữ');
    }
  }

  function onLanguageChange() {
    log('Đang cập nhật artifacts theo ngôn ngữ mới...');
    
    // Re-render với dữ liệu hiện tại
    renderArtifacts(state.filteredArtifacts);
    
    log('✓ Đã cập nhật artifacts theo ngôn ngữ:', state.currentLanguage);
  }

  // ============================================
  // PAGINATION HELPERS
  // ============================================
  
  function updatePaginationState(artifacts) {
    state.pagination.totalItems = artifacts.length;
    state.pagination.totalPages = Math.ceil(artifacts.length / state.pagination.itemsPerPage);
    
    if (state.pagination.currentPage > state.pagination.totalPages) {
      state.pagination.currentPage = state.pagination.totalPages || 1;
    }
    
    log('Pagination updated:', state.pagination);
  }

  function getCurrentPageItems(artifacts) {
    const start = (state.pagination.currentPage - 1) * state.pagination.itemsPerPage;
    const end = start + state.pagination.itemsPerPage;
    return artifacts.slice(start, end);
  }

  function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > state.pagination.totalPages) {
      return;
    }
    
    state.pagination.currentPage = pageNumber;
    log('Go to page:', pageNumber);
    
    renderArtifacts(state.filteredArtifacts);
    scrollToTop();
  }

  function nextPage() {
    if (state.pagination.currentPage < state.pagination.totalPages) {
      goToPage(state.pagination.currentPage + 1);
    }
  }

  function prevPage() {
    if (state.pagination.currentPage > 1) {
      goToPage(state.pagination.currentPage - 1);
    }
  }

  function scrollToTop() {
    if (state.container) {
      state.container.scrollTop = 0;
      state.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ============================================
  // LOAD DATA
  // ============================================
  
  async function loadArtifactsData() {
    try {
      log('Đang load dữ liệu từ', CONFIG.jsonPath);
      
      const response = await fetch(CONFIG.jsonPath);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.json();
      
      if (!jsonData.success || !jsonData.data) {
        throw new Error('Dữ liệu JSON không hợp lệ');
      }
      
      state.artifacts = jsonData.data;
      state.filteredArtifacts = jsonData.data;
      state.isLoaded = true;
      
      updatePaginationState(state.filteredArtifacts);
      
      log(`Đã load thành công ${state.artifacts.length} artifacts`);
      
      return state.artifacts;
      
    } catch (error) {
      logError('Lỗi khi load dữ liệu artifacts', error);
      throw error;
    }
  }

  // ============================================
  // GET CONTAINER
  // ============================================
  
  function getContainer() {
    try {
      if (typeof TourHelpers === 'undefined') {
        throw new Error('TourHelpers chưa được load');
      }
      
      const container = TourHelpers.getComponentByName(CONFIG.containerName);
      
      if (!container) {
        throw new Error(`Không tìm thấy container: "${CONFIG.containerName}"`);
      }
      
      state.container = container;
      log('Đã tìm thấy container:', CONFIG.containerName);
      
      return container;
      
    } catch (error) {
      logError('Lỗi khi lấy container', error);
      throw error;
    }
  }

  // ============================================
  // CREATE SIMPLE ARTIFACT CARD
  // ============================================
  
  function createArtifactCard(artifact, index) {
    const card = document.createElement('div');
    card.className = 'artifact-item';
    card.dataset.id = artifact.id;
    card.dataset.artifactId = artifact.id;
    card.dataset.index = index;
    
    if (CONFIG.showAnimation) {
      card.style.animationDelay = `${index * 0.03}s`;
    }
    
    // Lấy ảnh thumb đầu tiên
    const thumbImage = artifact.photo && artifact.photo.length > 0 
      ? artifact.photo[0].thumb || artifact.photo[0].original
      : 'images/no-image.png';
    
    // Hiển thị tên theo ngôn ngữ hiện tại
    const currentLang = state.currentLanguage;
    let displayName = artifact.name; // Mặc định tiếng Việt
    
    if (currentLang === 'en' || currentLang === 'en-US') {
      displayName = artifact.name_en || artifact.name; // Fallback về tiếng Việt nếu không có
    }
    
    card.innerHTML = `
      <div class="artifact-card" data-artifact-id="${artifact.id}">
        <div class="artifact-thumb">
          <img src="${thumbImage}" 
               alt="${displayName}" 
               loading="lazy"
               onerror="this.src='images/no-image.png'">
        </div>
        <div class="artifact-name">
          <h4>${displayName}</h4>
        </div>
      </div>
    `;
    
    return card;
  }

  // ============================================
  // CREATE PAGINATION UI
  // ============================================
  
  function createPaginationUI() {
    const pagination = state.pagination;
    
    if (pagination.totalPages <= 1) {
      return null;
    }
    
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-container';
    
    paginationDiv.innerHTML = `
      <div class="pagination-controls">
        <button class="pagination-btn btn-prev" ${pagination.currentPage === 1 ? 'disabled' : ''}>
          ←
        </button>
        
        <div class="pagination-pages">
          ${generatePageButtons()}
        </div>
        
        <button class="pagination-btn btn-next" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}>
          →
        </button>
      </div>
    `;
    
    return paginationDiv;
  }

  function generatePageButtons() {
    const pagination = state.pagination;
    const current = pagination.currentPage;
    const total = pagination.totalPages;
    const maxButtons = CONFIG.maxPageButtons;
    
    let buttons = '';
    let startPage, endPage;
    
    if (total <= maxButtons) {
      startPage = 1;
      endPage = total;
    } else {
      const halfButtons = Math.floor(maxButtons / 2);
      
      if (current <= halfButtons + 1) {
        startPage = 1;
        endPage = maxButtons - 1;
      } else if (current >= total - halfButtons) {
        startPage = total - maxButtons + 2;
        endPage = total;
      } else {
        startPage = current - halfButtons;
        endPage = current + halfButtons;
      }
    }
    
    if (startPage > 1) {
      buttons += `<button class="page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        buttons += `<span class="page-dots">...</span>`;
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === current ? 'active' : '';
      buttons += `<button class="page-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }
    
    if (endPage < total) {
      if (endPage < total - 1) {
        buttons += `<span class="page-dots">...</span>`;
      }
      buttons += `<button class="page-btn" data-page="${total}">${total}</button>`;
    }
    
    return buttons;
  }

  // ============================================
  // RENDER ARTIFACTS
  // ============================================
  
  function renderArtifacts(artifacts = state.filteredArtifacts) {
    if (!state.container) {
      logError('Container chưa được khởi tạo');
      return;
    }
    
    state.filteredArtifacts = artifacts;
    updatePaginationState(artifacts);
    state.container.innerHTML = '';
    
    if (!artifacts || artifacts.length === 0) {
      state.container.innerHTML = `
        <div class="no-data">
          <p>Không có hiện vật</p>
        </div>
      `;
      return;
    }
    
    const pageItems = getCurrentPageItems(artifacts);
    log(`Rendering page ${state.pagination.currentPage}/${state.pagination.totalPages} (${pageItems.length} items)`);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'artifacts-wrapper';
    
    // Pagination ở trên
    const paginationTop = createPaginationUI();
    if (paginationTop) {
      paginationTop.classList.add('pagination-top');
      wrapper.appendChild(paginationTop);
    }
    
    // Grid
    const grid = document.createElement('div');
    grid.className = 'artifacts-grid';
    
    pageItems.forEach((artifact, index) => {
      const card = createArtifactCard(artifact, index);
      grid.appendChild(card);
    });
    
    wrapper.appendChild(grid);
    state.container.appendChild(wrapper);
    
    attachEventListeners();
    attachPaginationListeners();
    
    log('Render hoàn tất!');
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================
  
  function attachEventListeners() {
    // Click vào card để mở asset trong tour
    const cards = state.container.querySelectorAll('.artifact-card');
    cards.forEach(card => {
      card.addEventListener('click', handleCardClick);
    });
  }

  function attachPaginationListeners() {
    // Previous button
    const btnPrev = state.container.querySelector('.btn-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', prevPage);
    }
    
    // Next button
    const btnNext = state.container.querySelector('.btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', nextPage);
    }
    
    // Page buttons
    const pageButtons = state.container.querySelectorAll('.page-btn');
    pageButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const page = parseInt(this.dataset.page);
        goToPage(page);
      });
    });
  }

  function handleCardClick(event) {
    const artifactId = event.currentTarget.dataset.artifactId;
    
    if (!artifactId) {
      logError('Không tìm thấy artifact ID');
      return;
    }
    
    // Tạo tên media theo format: asset + id
    const mediaName = 'asset' + artifactId;
    
    log('Opening asset:', mediaName);
    
    // Gọi tour để mở media
    if (typeof window.tour !== 'undefined' && window.tour.setMediaByName) {
      try {
        window.tour.setMediaByName(mediaName);
        
        // Đóng container
        closeContainer();
        
        log('✓ Đã mở asset:', mediaName);
      } catch (error) {
        logError('Lỗi khi mở asset:', error);
      }
    } else {
      logError('window.tour.setMediaByName không tồn tại');
    }
  }

  // ============================================
  // CLOSE CONTAINER
  // ============================================
  
  function closeContainer() {
    if (state.container) {
      // Ẩn container
      state.container.style.display = 'none';
      
      // Hoặc có thể làm mờ dần
      // state.container.style.opacity = '0';
      // setTimeout(() => {
      //   state.container.style.display = 'none';
      // }, 300);
      
      log('Container đã đóng');
    }
  }

  function openContainer() {
    if (state.container) {
      state.container.style.display = 'block';
      state.container.style.opacity = '1';
      log('Container đã mở');
    } else {
      logError('Container chưa được khởi tạo. Gọi init() trước.');
    }
  }

  // ============================================
  // SHOW DETAIL
  // ============================================
  
  function showArtifactDetail(artifact) {
    // TODO: Implement modal/popup
    console.log('Artifact Detail:', artifact);
    
    // Tạm thời show alert với thông tin đầy đủ
    const info = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${artifact.name}
${artifact.name_en || ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Mã: ${artifact.code || 'N/A'}
📅 Thời kỳ: ${artifact.era || 'N/A'}
💎 Chất liệu: ${artifact.material || 'N/A'}
📏 Kích thước: ${artifact.area || 'N/A'}
🏛️ Danh mục: ${artifact.category_name || 'N/A'}

Mô tả:
${artifact.description || 'Chưa có mô tả'}

${artifact.link_3d ? '🔗 Có link xem 3D' : ''}
${artifact.photo ? `📸 ${artifact.photo.length} ảnh` : ''}
    `.trim();
    
    alert(info);
    
    // Mở 3D nếu có
    if (artifact.link_3d) {
      const open3D = confirm('Bạn có muốn xem 3D không?');
      if (open3D) {
        window.open(artifact.link_3d, '_blank', 'noopener,noreferrer');
      }
    }
  }

  // ============================================
  // INJECT STYLES
  // ============================================
  
  function injectStyles() {
    const styleId = 'artifacts-styles';
    
    if (document.getElementById(styleId)) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* ============================================ */
      /* CONTAINER Z-INDEX - Nằm trên các element khác */
      /* ============================================ */
      
      /* Tìm container bằng data attribute hoặc class */
      [data-name="Container Artifacts"],
      .artifacts-container-wrapper {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 999 !important;
        background: white !important; /* Background trắng */
        overflow: hidden !important;
      }
      
      /* ============================================ */
      /* SIMPLE COMPACT LAYOUT */
      /* ============================================ */
      
      .artifacts-wrapper {
        padding: 15px;
        height: 100%;
        width: 100%;
        overflow-y: auto;
        background: white; /* Background trắng */
      }
      
      /* Grid - Nhiều cột hơn */
      .artifacts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 15px;
        margin-bottom: 20px;
      }
      
      /* Artifact Item */
      .artifact-item {
        opacity: 0;
        animation: fadeInUp 0.4s ease forwards;
      }
      
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Card - Simple & Clean */
      .artifact-card {
        background: rgba(66, 33, 24, 0.5);
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      }
      
      .artifact-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      }
      
      /* Thumbnail */
      .artifact-thumb {
        position: relative;
        width: 100%;
        padding-top: 100%; /* Square ratio */
        background: #f5f5f5;
        overflow: hidden;
      }
      
      .artifact-thumb img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      
      .artifact-card:hover .artifact-thumb img {
        transform: scale(1.1);
      }
      
      /* 3D Badge */
      .badge-3d {
        position: absolute;
        top: 8px;
        right: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 10px;
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      /* Name */
      .artifact-name {
        padding: 12px;
      }
      
      .artifact-name h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #FFFFFF; /* Màu text tối */
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        min-height: 38px; /* Giữ chiều cao ổn định */
      }
      
      .artifact-card:hover .artifact-name h4 {
        color: #EACB32; /* Vàng khi hover */
      }
      
      /* ============================================ */
      /* PAGINATION STYLES */
      /* ============================================ */
      
      .pagination-container {
        background: rgba(255, 255, 255, 0.95);
        border-radius: 10px;
        padding: 12px 15px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin-bottom: 15px;
        backdrop-filter: blur(10px);
      }
      
      .pagination-top {
        position: sticky;
        top: 0;
        z-index: 100;
        margin-bottom: 15px;
        border-bottom: 2px solid rgba(66, 33, 24, 0.32);
      }
      
      .pagination-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      
      .pagination-btn {
        width: 40px;
        height: 40px;
        border: 2px solid rgba(234, 203, 50, 0.8);
        background: white;
        color: #422118;
        border-radius: 8px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .pagination-btn:hover:not(:disabled) {
        background: rgba(234, 203, 50, 1);
        color: #422118;
        transform: translateY(-2px);
      }
      
      .pagination-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        border-color: #ccc;
        color: #ccc;
      }
      
      .pagination-pages {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        justify-content: center;
      }
      
      .page-btn {
        width: 40px;
        height: 40px;
        border: 2px solid rgba(66, 33, 24, 0.3);
        background: white;
        color: #422118;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
      }
      
      .page-btn:hover {
        border-color: rgba(234, 203, 50, 1);
        background: rgba(234, 203, 50, 0.2);
        color: #422118;
        transform: scale(1.1);
      }
      
      .page-btn.active {
        background: rgba(234, 203, 50, 1);
        color: #422118;
        border-color: rgba(234, 203, 50, 1);
        font-weight: bold;
      }
      
      .page-dots {
        display: flex;
        align-items: center;
        padding: 0 5px;
        color: #999;
        font-weight: bold;
      }
      
      /* No Data */
      .no-data {
        text-align: center;
        padding: 60px 20px;
        color: #999;
      }
      
      .no-data p {
        font-size: 16px;
        margin: 0;
      }
      
      /* ============================================ */
      /* RESPONSIVE */
      /* ============================================ */
      
      @media (max-width: 1200px) {
        .artifacts-grid {
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        }
      }
      
      @media (max-width: 768px) {
        .artifacts-wrapper {
          padding: 10px;
        }
        
        .artifacts-grid {
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
        }
        
        .artifact-name h4 {
          font-size: 13px;
          min-height: 34px;
        }
        
        .pagination-container {
          padding: 10px;
        }
        
        .pagination-btn {
          width: 35px;
          height: 35px;
          font-size: 16px;
        }
        
        .page-btn {
          width: 35px;
          height: 35px;
          font-size: 13px;
        }
      }
      
      @media (max-width: 480px) {
        .artifacts-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        }
      }
    `;
    
    document.head.appendChild(style);
    log('Styles injected');
  }

  // ============================================
  // MAIN INIT
  // ============================================
  
  async function init() {
    try {
      log('Initializing Artifacts module...');
      
      injectStyles();
      await loadArtifactsData();
      getContainer();
      
      // Lưu ngôn ngữ ban đầu
      state.currentLanguage = getCurrentLanguage();
      log('Ngôn ngữ khởi tạo:', state.currentLanguage);
      
      renderArtifacts();
      
      // Bắt đầu theo dõi thay đổi ngôn ngữ
      startLanguageMonitoring();
      
      log('✓ Artifacts module initialized successfully!');
      
    } catch (error) {
      logError('Failed to initialize Artifacts module', error);
    }
  }

  // ============================================
  // AUTO INIT
  // ============================================
  
  function waitForTourReady() {
    log('Waiting for tour to be ready...');
    
    const checkInterval = setInterval(() => {
      if (typeof TourHelpers !== 'undefined' && TourHelpers.getComponentByName) {
        clearInterval(checkInterval);
        log('Tour is ready!');
        
        if (CONFIG.autoInit) {
          init();
        }
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!state.isLoaded) {
        logError('Timeout: Tour not ready after 10 seconds');
      }
    }, 10000);
  }

  // ============================================
  // PUBLIC API
  // ============================================
  
  window.ArtifactsManager = {
    init: init,
    reload: function() {
      log('Reloading artifacts...');
      state.pagination.currentPage = 1;
      return init();
    },
    filter: function(filterFn) {
      const filtered = state.artifacts.filter(filterFn);
      log(`Filtered: ${filtered.length}/${state.artifacts.length} artifacts`);
      state.pagination.currentPage = 1;
      renderArtifacts(filtered);
    },
    search: function(keyword) {
      const searched = state.artifacts.filter(artifact => 
        artifact.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (artifact.name_en && artifact.name_en.toLowerCase().includes(keyword.toLowerCase()))
      );
      log(`Search results: ${searched.length} artifacts`);
      state.pagination.currentPage = 1;
      renderArtifacts(searched);
    },
    reset: function() {
      log('Resetting to all artifacts');
      state.pagination.currentPage = 1;
      renderArtifacts(state.artifacts);
    },
    goToPage: goToPage,
    nextPage: nextPage,
    prevPage: prevPage,
    setItemsPerPage: function(items) {
      CONFIG.itemsPerPage = items;
      state.pagination.itemsPerPage = items;
      state.pagination.currentPage = 1;
      log('Items per page changed to:', items);
      renderArtifacts(state.filteredArtifacts);
    },
    // Language functions
    getCurrentLanguage: function() {
      return state.currentLanguage;
    },
    startLanguageMonitoring: startLanguageMonitoring,
    stopLanguageMonitoring: stopLanguageMonitoring,
    forceLanguageUpdate: function() {
      state.currentLanguage = getCurrentLanguage();
      onLanguageChange();
    },
    getState: function() {
      return { 
        ...state,
        pagination: { ...state.pagination }
      };
    },
    config: CONFIG
  };

  // ============================================
  // START
  // ============================================
  
  if (CONFIG.autoInit) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', waitForTourReady);
    } else {
      waitForTourReady();
    }
  }

  // ============================================
  // GLOBAL FUNCTION FOR TOUR ACTIONS
  // ============================================
  
  // Function để tour có thể gọi từ button/hotspot
  window.showArtifactContainer = function() {
    log('showArtifactContainer() called from tour');
    
    // Gọi trực tiếp function openContainer
    if (state.container) {
      state.container.style.display = 'block';
      state.container.style.opacity = '1';
      log('Container đã mở');
    } else if (window.ArtifactsManager) {
      // Nếu chưa init, thử init lại
      logError('Container chưa sẵn sàng, đang khởi tạo...');
      window.ArtifactsManager.init().then(() => {
        if (state.container) {
          state.container.style.display = 'block';
          state.container.style.opacity = '1';
          log('Container đã mở sau khi init');
        }
      });
    } else {
      logError('ArtifactsManager chưa được khởi tạo');
    }
  };

  // Alias - cũng có thể gọi bằng tên khác
  window.openArtifacts = window.showArtifactContainer;
  window.showArtifacts = window.showArtifactContainer;

})();