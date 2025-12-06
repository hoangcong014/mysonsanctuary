/**
 * artifacts.js
 * Module quản lý hiển thị artifacts với Category Filter
 * Mobile Touch Support + Category Filtering + External CSS
 * Version: 2.0 - Option 2 (Safe fallback)
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
    itemsPerPage: 27,
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
    state.searchKeyword = ''; // Xóa từ khóa tìm kiếm
    
    // Cập nhật UI - xóa giá trị trong ô search
    const searchInput = state.container?.querySelector('#artifact-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
    // Ẩn nút clear search
    const clearBtn = state.container?.querySelector('#search-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
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
      // Xóa search khi mở container
      state.searchKeyword = '';
      const searchInput = state.container.querySelector('#artifact-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const clearBtn = state.container.querySelector('#search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      // Reset dropdown về "Tất cả"
      const categorySelect = state.container.querySelector('#category-select');
      if (categorySelect) {
        categorySelect.value = 'null';
      }

      // Áp dụng filter để cập nhật danh sách
      applyFilters();
      
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
  // INJECT STYLES - OPTION 2: CHECK + FALLBACK
  // ============================================
  
  function injectStyles() {
    // Kiểm tra xem CSS đã được load từ HTML chưa
    const existingLink = document.querySelector('link[href*="artifacts.css"]');
    
    if (existingLink) {
      log('✓ CSS đã được load từ HTML');
      return;
    }
    
    // Nếu không tìm thấy CSS, hiển thị cảnh báo
    console.warn('⚠️ [Artifacts] CẢNH BÁO: Chưa thêm artifacts.css vào HTML!');
    console.warn('⚠️ [Artifacts] Hãy thêm <link rel="stylesheet" href="css/artifacts.css"> vào <head>');
    
    // Tự động inject CSS như fallback
    const link = document.createElement('link');
    link.id = 'artifacts-styles-fallback';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'css/artifacts.css?v=' + Date.now();
    
    document.head.appendChild(link);
    
    log('⚠️ CSS đã được tự động inject (fallback mode)');
    
    // Event listeners
    link.addEventListener('load', () => {
      log('✓ CSS fallback đã load thành công');
    });
    
    link.addEventListener('error', () => {
      logError('❌ LỖI: Không thể load file css/artifacts.css', 
        'Vui lòng kiểm tra đường dẫn file CSS');
    });
  }

  // ============================================
  // MAIN INIT
  // ============================================
  
  async function init() {
    try {
      log('Initializing Artifacts module...');
      
      // Kiểm tra CSS
      injectStyles();
      
      // Load data
      await loadCategoriesData();
      await loadArtifactsData();
      
      // Get container
      getContainer();
      
      // Set language
      state.currentLanguage = getCurrentLanguage();
      log('Ngôn ngữ khởi tạo:', state.currentLanguage);
      
      // Render
      renderArtifacts();
      
      // Start monitoring
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
      // Xóa search khi mở container
      state.searchKeyword = '';
      const searchInput = state.container.querySelector('#artifact-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const clearBtn = state.container.querySelector('#search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      // Reset dropdown về "Tất cả"
      const categorySelect = state.container.querySelector('#category-select');
      if (categorySelect) {
        categorySelect.value = 'null';
      }

      // Áp dụng filter để cập nhật danh sách
      applyFilters();
      
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
          // Xóa search sau khi init
          state.searchKeyword = '';
          const searchInput = state.container.querySelector('#artifact-search');
          if (searchInput) {
            searchInput.value = '';
          }
          const clearBtn = state.container.querySelector('#search-clear-btn');
          if (clearBtn) {
            clearBtn.style.display = 'none';
          }

          // Reset dropdown về "Tất cả"
          const categorySelect = state.container.querySelector('#category-select');
          if (categorySelect) {
            categorySelect.value = 'null';
          }

          // Áp dụng filter để cập nhật danh sách
          applyFilters();
          
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