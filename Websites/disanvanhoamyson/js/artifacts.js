/**
 * artifacts.js
 * Module quản lý hiển thị artifacts với Category Filter
 * Mobile Touch Support + Category Filtering
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    jsonPath: './jsons/assets.json',
    categoryJsonPath: './jsons/asset_category.json',
    containerName: 'Container Artifacts',
    autoInit: true,
    showAnimation: true,
    itemsPerPage: 20,
    maxPageButtons: 5,
    debug: true
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const state = {
    artifacts: [],
    filteredArtifacts: [],
    categories: [],
    selectedCategoryId: null, // null = "Tất cả"
    searchKeyword: '', // Từ khóa tìm kiếm
    container: null,
    isLoaded: false,
    currentFilter: null,
    currentLanguage: 'vi',
    languageCheckInterval: null,
    
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

  function getCurrentLanguage() {
    try {
      if (typeof TourHelpers !== 'undefined' && TourHelpers.getCurrentLanguage) {
        return TourHelpers.getCurrentLanguage();
      }
    } catch (e) {
      log('Không lấy được ngôn ngữ tour, dùng mặc định: vi');
    }
    return 'vi';
  }

  // ============================================
  // LANGUAGE CHANGE DETECTION
  // ============================================
  
  function startLanguageMonitoring() {
    state.currentLanguage = getCurrentLanguage();
    log('Bắt đầu theo dõi thay đổi ngôn ngữ. Ngôn ngữ hiện tại:', state.currentLanguage);
    
    state.languageCheckInterval = setInterval(() => {
      const newLanguage = getCurrentLanguage();
      
      if (newLanguage !== state.currentLanguage) {
        log(`Phát hiện đổi ngôn ngữ: ${state.currentLanguage} → ${newLanguage}`);
        state.currentLanguage = newLanguage;
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
      // Scroll wrapper về top
      const wrapper = state.container.querySelector('.artifacts-wrapper');
      if (wrapper) {
        wrapper.scrollTop = 0;
      }
      
      // Scroll container về top
      state.container.scrollTop = 0;
      
      // Scroll vào view nếu cần
      state.container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ============================================
  // LOAD DATA
  // ============================================
  
  async function loadArtifactsData() {
    try {
      log('Đang load dữ liệu artifacts từ', CONFIG.jsonPath);
      
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

  async function loadCategoriesData() {
    try {
      log('Đang load dữ liệu categories từ', CONFIG.categoryJsonPath);
      
      const response = await fetch(CONFIG.categoryJsonPath);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.json();
      
      if (!jsonData.success || !jsonData.data) {
        throw new Error('Dữ liệu categories JSON không hợp lệ');
      }
      
      state.categories = jsonData.data;
      
      log(`Đã load thành công ${state.categories.length} categories`);
      
      return state.categories;
      
    } catch (error) {
      logError('Lỗi khi load dữ liệu categories', error);
      throw error;
    }
  }

  // ============================================
  // CATEGORY & SEARCH FILTER
  // ============================================
  
  function applyFilters() {
    let filtered = state.artifacts;
    
    // Filter by category
    if (state.selectedCategoryId !== null) {
      filtered = filtered.filter(artifact => 
        artifact.cate_id === state.selectedCategoryId
      );
    }
    
    // Filter by search keyword
    if (state.searchKeyword && state.searchKeyword.trim() !== '') {
      const keyword = state.searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(artifact => {
        const nameMatch = artifact.name && artifact.name.toLowerCase().includes(keyword);
        const nameEnMatch = artifact.name_en && artifact.name_en.toLowerCase().includes(keyword);
        const codeMatch = artifact.code && artifact.code.toLowerCase().includes(keyword);
        return nameMatch || nameEnMatch || codeMatch;
      });
    }
    
    state.pagination.currentPage = 1;
    state.filteredArtifacts = filtered;
    
    log(`Filters applied: Category=${state.selectedCategoryId}, Search="${state.searchKeyword}", Results=${filtered.length}`);
    
    renderArtifacts(filtered);
  }
  
  function filterByCategory(categoryId) {
    state.selectedCategoryId = categoryId;
    applyFilters();
  }
  
  function searchArtifacts(keyword) {
    state.searchKeyword = keyword;
    applyFilters();
  }

  function getCategoryName(category) {
    const currentLang = state.currentLanguage;
    if (currentLang === 'en' || currentLang === 'en-US') {
      return category.nameEn || category.name;
    }
    return category.name;
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
  // CREATE CATEGORY FILTER UI - DROPDOWN WITH SEARCH
  // ============================================
  
  function createCategoryFilter() {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'category-filter';
    
    const currentLang = state.currentLanguage;
    const allText = currentLang === 'en' || currentLang === 'en-US' ? 'All Categories' : 'Tất cả danh mục';
    const labelText = currentLang === 'en' || currentLang === 'en-US' ? 'Category:' : 'Danh mục:';
    const searchPlaceholder = currentLang === 'en' || currentLang === 'en-US' ? 'Search artifacts...' : 'Tìm kiếm hiện vật...';
    
    // Create options HTML
    let optionsHTML = `<option value="null">${allText}</option>`;
    
    state.categories.forEach(category => {
      const categoryName = getCategoryName(category);
      const selected = state.selectedCategoryId === category.id ? 'selected' : '';
      
      optionsHTML += `
        <option value="${category.id}" ${selected}>
          ${categoryName}
        </option>
      `;
    });
    
    filterDiv.innerHTML = `
      <div class="category-filter-wrapper">
        <div class="search-box">
          <input 
            type="text" 
            id="artifact-search" 
            class="search-input" 
            placeholder="${searchPlaceholder}"
            value="${state.searchKeyword}"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false">
          <button class="search-clear-btn" id="search-clear-btn" style="display: ${state.searchKeyword ? 'flex' : 'none'}">
            ✕
          </button>
        </div>
        
        <div class="category-select-wrapper">
          <label for="category-select" class="category-label">${labelText}</label>
          <select id="category-select" class="category-select">
            ${optionsHTML}
          </select>
        </div>
      </div>
    `;
    
    return filterDiv;
  }

  // ============================================
  // CREATE ARTIFACT CARD
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
    
    const thumbImage = artifact.photo && artifact.photo.length > 0 
      ? artifact.photo[0].thumb || artifact.photo[0].original
      : 'images/no-image.png';
    
    const currentLang = state.currentLanguage;
    let displayName = artifact.name;
    
    if (currentLang === 'en' || currentLang === 'en-US') {
      displayName = artifact.name_en || artifact.name;
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
    
    const wrapper = document.createElement('div');
    wrapper.className = 'artifacts-wrapper';
    
    // Category Filter
    const categoryFilter = createCategoryFilter();
    wrapper.appendChild(categoryFilter);
    
    if (!artifacts || artifacts.length === 0) {
      const currentLang = state.currentLanguage;
      const noDataText = currentLang === 'en' || currentLang === 'en-US' 
        ? 'No artifacts found' 
        : 'Không có hiện vật';
      
      wrapper.innerHTML += `
        <div class="no-data">
          <p>${noDataText}</p>
        </div>
      `;
      state.container.appendChild(wrapper);
      attachCategoryListeners();
      attachSearchListeners();
      return;
    }
    
    const pageItems = getCurrentPageItems(artifacts);
    log(`Rendering page ${state.pagination.currentPage}/${state.pagination.totalPages} (${pageItems.length} items)`);
    
    // Grid
    const grid = document.createElement('div');
    grid.className = 'artifacts-grid';
    
    pageItems.forEach((artifact, index) => {
      const card = createArtifactCard(artifact, index);
      grid.appendChild(card);
    });
    
    wrapper.appendChild(grid);
    
    // Pagination ở cuối
    const paginationBottom = createPaginationUI();
    if (paginationBottom) {
      paginationBottom.classList.add('pagination-bottom');
      wrapper.appendChild(paginationBottom);
    }
    
    state.container.appendChild(wrapper);
    
    attachEventListeners();
    attachPaginationListeners();
    attachCategoryListeners();
    attachSearchListeners();
    
    log('Render hoàn tất!');
  }

  // ============================================
  // EVENT HANDLERS - SEARCH
  // ============================================
  
  let searchTimeout = null;
  
  function attachSearchListeners() {
    const searchInput = state.container.querySelector('#artifact-search');
    const clearBtn = state.container.querySelector('#search-clear-btn');
    
    if (searchInput) {
      // Input event với debounce
      searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        
        // Show/hide clear button
        if (clearBtn) {
          clearBtn.style.display = value ? 'flex' : 'none';
        }
        
        // Debounce search
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          searchArtifacts(value);
        }, 300);
      });
      
      // Enter key
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          searchArtifacts(e.target.value);
        }
      });
      
      // Touch support - focus khi touch
      searchInput.addEventListener('touchstart', (e) => {
        // Không preventDefault để keyboard xuất hiện
        e.currentTarget.focus();
      }, { passive: true });
      
      // Click support
      searchInput.addEventListener('click', (e) => {
        e.currentTarget.focus();
      });
    }
    
    // Clear button
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = '';
          clearBtn.style.display = 'none';
          searchArtifacts('');
          searchInput.focus();
        }
      });
      
      clearBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = '';
          clearBtn.style.display = 'none';
          searchArtifacts('');
        }
      }, { passive: false });
    }
  }

  // ============================================
  // EVENT HANDLERS - CATEGORY FILTER
  // ============================================
  
  function attachCategoryListeners() {
    const categorySelect = state.container.querySelector('#category-select');
    if (categorySelect) {
      // Change event cho cả desktop và mobile
      categorySelect.addEventListener('change', handleCategoryChange);
      
      // Thêm click event để đảm bảo dropdown mở được
      categorySelect.addEventListener('click', (e) => {
        // Force focus để mở dropdown
        e.currentTarget.focus();
      });
      
      // Touch event để đảm bảo hoạt động trên mobile
      categorySelect.addEventListener('touchstart', (e) => {
        // Không preventDefault để native select vẫn hoạt động
        e.currentTarget.focus();
      }, { passive: true });
    }
  }

  function handleCategoryChange(event) {
    const categoryId = event.target.value;
    const actualCategoryId = categoryId === 'null' ? null : categoryId;
    
    log('Category selected:', actualCategoryId);
    filterByCategory(actualCategoryId);
  }

  // ============================================
  // EVENT HANDLERS - MOBILE TOUCH SUPPORT
  // ============================================
  
  function attachEventListeners() {
    const cards = state.container.querySelectorAll('.artifact-card');
    cards.forEach(card => {
      card.addEventListener('click', handleCardClick);
      card.addEventListener('touchstart', handleTouchStart, { passive: false });
      card.addEventListener('touchend', handleTouchEnd, { passive: false });
    });
  }

  function attachPaginationListeners() {
    const btnPrev = state.container.querySelector('.btn-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', prevPage);
      btnPrev.addEventListener('touchend', (e) => {
        e.preventDefault();
        prevPage();
      }, { passive: false });
    }
    
    const btnNext = state.container.querySelector('.btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', nextPage);
      btnNext.addEventListener('touchend', (e) => {
        e.preventDefault();
        nextPage();
      }, { passive: false });
    }
    
    const pageButtons = state.container.querySelectorAll('.page-btn');
    pageButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const page = parseInt(this.dataset.page);
        goToPage(page);
      });
      
      btn.addEventListener('touchend', function(e) {
        e.preventDefault();
        const page = parseInt(this.dataset.page);
        goToPage(page);
      }, { passive: false });
    });
  }

  let touchStartTime = 0;
  let touchStartTarget = null;

  function handleTouchStart(event) {
    touchStartTime = Date.now();
    touchStartTarget = event.currentTarget;
    event.currentTarget.classList.add('touch-active');
  }

  function handleTouchEnd(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('touch-active');
    
    const touchDuration = Date.now() - touchStartTime;
    
    if (touchDuration < 500 && touchStartTarget === event.currentTarget) {
      handleCardClick({ currentTarget: event.currentTarget });
    }
    
    touchStartTarget = null;
  }

  function handleCardClick(event) {
    const artifactId = event.currentTarget.dataset.artifactId;
    
    if (!artifactId) {
      logError('Không tìm thấy artifact ID');
      return;
    }
    
    const mediaName = 'asset' + artifactId;
    log('Opening asset:', mediaName);
    
    if (typeof window.tour !== 'undefined' && window.tour.setMediaByName) {
      try {
        window.tour.setMediaByName(mediaName);
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
  // CONTAINER CONTROL
  // ============================================
  
  function closeContainer() {
    if (state.container) {
      state.container.style.display = 'none';
      log('Container đã đóng');
    }
  }

  function openContainer() {
    if (state.container) {
      state.container.style.display = 'block';
      state.container.style.opacity = '1';
      state.container.style.pointerEvents = 'auto';
      state.container.style.touchAction = 'auto';
      scrollToTop();
      log('Container đã mở');
    } else {
      logError('Container chưa được khởi tạo. Gọi init() trước.');
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
      /* CONTAINER */
      /* ============================================ */
      
      [data-name="Container Artifacts"],
      .artifacts-container-wrapper {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 10000 !important;
        background: white !important;
        overflow: hidden !important;
        pointer-events: auto !important;
        touch-action: auto !important;
      }
      
      .artifacts-wrapper {
        padding: 15px;
        height: 100%;
        width: 100%;
        overflow-y: auto;
        background: white;
        -webkit-overflow-scrolling: touch;
        pointer-events: auto !important;
        padding-bottom: max(80px, calc(env(safe-area-inset-bottom, 0px) + 80px));
      }
      
      /* ============================================ */
      /* CATEGORY FILTER - DROPDOWN WITH SEARCH */
      /* ============================================ */
      
      .category-filter {
        position: sticky;
        top: 0;
        z-index: 200;
        background: white;
        padding: 10px 0 15px 0;
        margin-bottom: 15px;
        border-bottom: 2px solid rgba(234, 203, 50, 0.3);
        pointer-events: auto !important;
      }
      
      .category-filter-wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
        padding-right: 20px;
        pointer-events: auto !important;
      }
      
      /* Search Box */
      .search-box {
        position: relative;
        flex: 1;
        max-width: 400px;
        min-width: 200px;
        pointer-events: auto !important;
      }
      
      .search-input {
        width: 100%;
        padding: 10px 40px 10px 15px;
        font-size: 14px;
        color: #422118;
        background: white;
        border: 2px solid rgba(66, 33, 24, 0.3);
        border-radius: 8px;
        outline: none;
        transition: all 0.3s ease;
        pointer-events: auto !important;
        touch-action: manipulation !important;
        position: relative;
        z-index: 201;
        -webkit-tap-highlight-color: rgba(234, 203, 50, 0.2);
        -webkit-user-select: text;
        user-select: text;
      }
      
      .search-input:hover {
        border-color: rgba(234, 203, 50, 1);
        background-color: rgba(234, 203, 50, 0.05);
      }
      
      .search-input:focus {
        border-color: rgba(234, 203, 50, 1);
        box-shadow: 0 0 0 3px rgba(234, 203, 50, 0.2);
      }
      
      .search-input::placeholder {
        color: rgba(66, 33, 24, 0.5);
      }
      
      .search-clear-btn {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        width: 24px;
        height: 24px;
        border: none;
        background: rgba(66, 33, 24, 0.2);
        color: #422118;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        transition: all 0.2s ease;
        pointer-events: auto !important;
        touch-action: manipulation !important;
        z-index: 202;
      }
      
      .search-clear-btn:hover {
        background: rgba(234, 203, 50, 1);
        transform: translateY(-50%) scale(1.1);
      }
      
      .search-clear-btn:active {
        transform: translateY(-50%) scale(0.9);
      }
      
      /* Category Select Wrapper */
      .category-select-wrapper {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
      }
      
      .category-label {
        font-size: 14px;
        font-weight: 600;
        color: #422118;
        white-space: nowrap;
        pointer-events: none;
      }
      
      .category-select {
        min-width: 200px;
        max-width: 300px;
        padding: 10px 40px 10px 15px;
        font-size: 14px;
        font-weight: 500;
        color: #422118;
        background: white;
        border: 2px solid rgba(66, 33, 24, 0.3);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        outline: none;
        appearance: none;
        -webkit-appearance: none;
        -moz-appearance: none;
        background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23422118' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 10px center;
        background-size: 20px;
        pointer-events: auto !important;
        touch-action: manipulation !important;
        user-select: none;
        position: relative;
        z-index: 201;
      }
      
      .category-select:hover {
        border-color: rgba(234, 203, 50, 1);
        background-color: rgba(234, 203, 50, 0.05);
      }
      
      .category-select:focus {
        border-color: rgba(234, 203, 50, 1);
        box-shadow: 0 0 0 3px rgba(234, 203, 50, 0.2);
      }
      
      .category-select:active {
        transform: scale(0.98);
      }
      
      .category-select option {
        padding: 10px;
        font-size: 14px;
        color: #422118;
        background: white;
      }
      
      .category-select option:hover {
        background: rgba(234, 203, 50, 0.2);
      }
      
      .category-select option:checked {
        background: rgba(234, 203, 50, 0.3);
        font-weight: 600;
      }
      
      /* ============================================ */
      /* GRID */
      /* ============================================ */
      
      .artifacts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 15px;
        margin-bottom: 0px;
        margin-right: 20px;
        pointer-events: auto !important;
      }
      
      .artifact-item {
        opacity: 0;
        animation: fadeInUp 0.4s ease forwards;
        pointer-events: auto !important;
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
      
      /* ============================================ */
      /* CARD */
      /* ============================================ */
      
      .artifact-card {
        background: rgba(66, 33, 24, 0.5);
        border-radius: 10px;
        overflow: hidden;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
        pointer-events: auto !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
      }
      
      .artifact-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      }
      
      .artifact-card.touch-active {
        transform: scale(0.95);
        background: rgba(66, 33, 24, 0.7);
      }
      
      .artifact-card:active {
        transform: scale(0.95);
        background: rgba(66, 33, 24, 0.7);
      }
      
      .artifact-thumb {
        position: relative;
        width: 100%;
        padding-top: 100%;
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
      
      .artifact-name {
        padding: 12px;
      }
      
      .artifact-name h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: #FFFFFF;
        line-height: 1.4;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        min-height: 38px;
      }
      
      .artifact-card:hover .artifact-name h4 {
        color: #EACB32;
      }
      
      /* ============================================ */
      /* PAGINATION */
      /* ============================================ */
      
      .pagination-container {
        background: transparent;
        border-radius: 0;
        padding: 20px 15px;
        box-shadow: none;
        margin-bottom: 0;
        margin-top: 20px;
        pointer-events: auto !important;
      }
      
      .pagination-top {
        position: relative;
        top: auto;
        z-index: 1;
        margin-bottom: 0;
        margin-top: 20px;
      }
      
      .pagination-bottom {
        position: relative;
        z-index: 1;
        margin-top: -15px;
        margin-bottom: 20px;
        padding-bottom: max(60px, env(safe-area-inset-bottom, 60px));
      }
      
      .pagination-controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        pointer-events: auto !important;
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
        pointer-events: auto !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
      }
      
      .pagination-btn:hover:not(:disabled) {
        background: rgba(234, 203, 50, 1);
        color: #422118;
        transform: translateY(-2px);
      }
      
      .pagination-btn:active:not(:disabled) {
        transform: scale(0.9);
        background: rgba(234, 203, 50, 1);
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
        pointer-events: auto !important;
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
        pointer-events: auto !important;
        touch-action: manipulation !important;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
      }
      
      .page-btn:hover {
        border-color: rgba(234, 203, 50, 1);
        background: rgba(234, 203, 50, 0.2);
        color: #422118;
        transform: scale(1.1);
      }
      
      .page-btn:active {
        transform: scale(0.9);
        background: rgba(234, 203, 50, 0.5);
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
          margin-right: 15px;
        }
      }
      
      @media (max-width: 768px) {
        .artifacts-wrapper {
          padding: 10px;
          padding-bottom: max(100px, calc(env(safe-area-inset-bottom, 0px) + 100px));
        }
        
        .category-filter {
          padding: 8px 0 12px 0;
          pointer-events: auto !important;
        }
        
        .category-filter-wrapper {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
          padding-right: 0;
          pointer-events: auto !important;
        }
        
        .category-label {
          font-size: 13px;
          text-align: left;
        }
        
        .category-select {
          min-width: 100%;
          max-width: 100%;
          font-size: 13px;
          padding: 10px 35px 10px 12px;
          background-size: 18px;
          pointer-events: auto !important;
          -webkit-tap-highlight-color: rgba(234, 203, 50, 0.2);
          z-index: 201;
          /* Ensure iOS Safari renders select properly */
          -webkit-appearance: menulist-button;
          min-height: 44px;
        }
        
        .category-select:focus {
          outline: none;
          border-color: rgba(234, 203, 50, 1);
          box-shadow: 0 0 0 3px rgba(234, 203, 50, 0.2);
        }
        
        .artifacts-grid {
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 10px;
          margin-right: 0;
        }
        
        .artifact-name h4 {
          font-size: 13px;
          min-height: 34px;
        }
        
        .pagination-container {
          padding: 15px 10px;
          padding-bottom: max(80px, calc(env(safe-area-inset-bottom, 0px) + 80px));
        }
        
        .pagination-btn {
          width: 35px;
          height: 35px;
          font-size: 16px;
          min-width: 44px;
          min-height: 44px;
        }
        
        .page-btn {
          width: 35px;
          height: 35px;
          font-size: 13px;
          min-width: 44px;
          min-height: 44px;
        }
        
        .pagination-controls {
          gap: 12px;
        }
        
        .pagination-pages {
          gap: 8px;
        }
        
        .pagination-bottom {
          padding-bottom: max(80px, calc(env(safe-area-inset-bottom, 0px) + 80px));
        }
        
        @media (hover: none) {
          .artifact-card:hover {
            transform: none;
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          }
          
          .pagination-btn:hover:not(:disabled) {
            transform: none;
          }
          
          .page-btn:hover {
            transform: none;
          }
          
          .category-select:hover {
            border-color: rgba(66, 33, 24, 0.3);
            background-color: white;
          }
        }
      }
      
      @media (max-width: 480px) {
        .artifacts-wrapper {
          padding-bottom: max(120px, calc(env(safe-area-inset-bottom, 0px) + 120px));
        }
        
        .category-filter-wrapper {
          gap: 8px;
          padding-right: 0;
        }
        
        .search-input {
          font-size: 16px;
          padding: 8px 30px 8px 10px;
          min-height: 44px;
          pointer-events: auto !important;
          z-index: 201;
          -webkit-tap-highlight-color: rgba(234, 203, 50, 0.2);
          -webkit-user-select: text;
          user-select: text;
        }
        
        .search-clear-btn {
          width: 24px;
          height: 24px;
          font-size: 10px;
          z-index: 202;
        }
        
        .category-label {
          font-size: 12px;
        }
        
        .category-select {
          font-size: 12px;
          padding: 8px 30px 8px 10px;
          background-size: 16px;
          min-height: 44px;
          -webkit-appearance: menulist-button;
          pointer-events: auto !important;
          z-index: 201;
        }
        
        .artifacts-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          margin-right: 0;
        }
        
        .artifact-card,
        .pagination-btn,
        .page-btn {
          min-width: 44px !important;
          min-height: 44px !important;
        }
        
        .pagination-container {
          padding: 10px;
          padding-bottom: max(100px, calc(env(safe-area-inset-bottom, 0px) + 100px));
        }
        
        .pagination-bottom {
          padding-bottom: max(100px, calc(env(safe-area-inset-bottom, 0px) + 100px));
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
      await loadCategoriesData();
      await loadArtifactsData();
      getContainer();
      
      state.currentLanguage = getCurrentLanguage();
      log('Ngôn ngữ khởi tạo:', state.currentLanguage);
      
      renderArtifacts();
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
      state.searchKeyword = '';
      state.selectedCategoryId = null;
      return init();
    },
    filterByCategory: filterByCategory,
    search: searchArtifacts,
    filter: function(filterFn) {
      const filtered = state.artifacts.filter(filterFn);
      log(`Filtered: ${filtered.length}/${state.artifacts.length} artifacts`);
      state.pagination.currentPage = 1;
      renderArtifacts(filtered);
    },
    reset: function() {
      log('Resetting to all artifacts');
      state.selectedCategoryId = null;
      state.searchKeyword = '';
      state.pagination.currentPage = 1;
      state.filteredArtifacts = state.artifacts;
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
  // GLOBAL FUNCTIONS
  // ============================================
  
  window.showArtifactContainer = function() {
    log('showArtifactContainer() called from tour');
    
    if (state.container) {
      state.container.style.display = 'block';
      state.container.style.opacity = '1';
      state.container.style.pointerEvents = 'auto';
      state.container.style.touchAction = 'auto';
      
      const wrapper = state.container.querySelector('.artifacts-wrapper');
      if (wrapper) {
        wrapper.style.pointerEvents = 'auto';
      }
      
      log('Container đã mở');
    } else if (window.ArtifactsManager) {
      logError('Container chưa sẵn sàng, đang khởi tạo...');
      window.ArtifactsManager.init().then(() => {
        if (state.container) {
          state.container.style.display = 'block';
          state.container.style.opacity = '1';
          state.container.style.pointerEvents = 'auto';
          state.container.style.touchAction = 'auto';
          
          const wrapper = state.container.querySelector('.artifacts-wrapper');
          if (wrapper) {
            wrapper.style.pointerEvents = 'auto';
          }
          
          log('Container đã mở sau khi init');
        }
      });
    } else {
      logError('ArtifactsManager chưa được khởi tạo');
    }
  };

  window.openArtifacts = window.showArtifactContainer;
  window.showArtifacts = window.showArtifactContainer;

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

})();