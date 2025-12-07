/**
 * towers.js
 * Module quản lý hiển thị tower groups với Category Buttons (Horizontal)
 * Auto Items Per Page + Auto Adjust Image Height + Min Rows
 * Version: 2.0 - Horizontal Category Buttons
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    jsonPath: './jsons/towers.json',
    categoryJsonPath: './jsons/tower_category.json',
    containerName: 'Container Tower Group',
    autoInit: true,
    showAnimation: true,
    itemsPerPage: 27,
    maxPageButtons: 5,
    debug: true,
    autoCalculateItems: true,
    autoAdjustImageHeight: true,
    minRows: 2
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const state = {
    towers: [],
    filteredTowers: [],
    categories: [],
    selectedCategoryId: null,
    searchKeyword: '',
    container: null,
    isLoaded: false,
    currentFilter: null,
    currentLanguage: 'vi',
    languageCheckInterval: null,
    resizeTimeout: null,
    
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
      console.log('[Towers]', message, ...args);
    }
  }

  function logError(message, error) {
    console.error('[Towers Error]', message, error);
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
  // AUTO CALCULATE ITEMS PER PAGE
  // ============================================

  function calculateItemsPerPage() {
    const gridContainer = state.container?.querySelector('.towers-grid-container');
    if (!gridContainer) {
      log('Cannot calculate - grid container not found');
      return CONFIG.itemsPerPage;
    }
    
    const containerHeight = gridContainer.clientHeight;
    const grid = gridContainer.querySelector('.towers-grid');
    if (!grid) {
      return CONFIG.itemsPerPage;
    }
    
    const gridStyles = window.getComputedStyle(grid);
    const gap = parseInt(gridStyles.gap) || 15;
    const gridCols = gridStyles.gridTemplateColumns.split(' ').length;
    
    const firstCard = grid.querySelector('.tower-item');
    if (!firstCard) {
      return CONFIG.itemsPerPage;
    }
    
    const cardHeight = firstCard.offsetHeight;
    const containerPaddingTop = parseInt(window.getComputedStyle(gridContainer).paddingTop) || 0;
    const containerPaddingBottom = parseInt(window.getComputedStyle(gridContainer).paddingBottom) || 0;
    
    const availableHeight = containerHeight - containerPaddingTop - containerPaddingBottom;
    let rows = Math.floor((availableHeight + gap) / (cardHeight + gap));
    
    const minRows = CONFIG.minRows || 2;
    rows = Math.max(rows, minRows);
    
    const itemsPerPage = rows * gridCols;
    
    log(`📊 Auto calculated items per page:
    - Container height: ${containerHeight}px
    - Available height: ${availableHeight}px
    - Card height: ${cardHeight}px
    - Gap: ${gap}px
    - Columns: ${gridCols}
    - Rows calculated: ${Math.floor((availableHeight + gap) / (cardHeight + gap))}
    - Rows (with min ${minRows}): ${rows}
    - Items per page: ${itemsPerPage}`);
    
    return Math.max(itemsPerPage, gridCols);
  }

  function updateItemsPerPageAuto() {
    if (!CONFIG.autoCalculateItems) {
      return;
    }
    
    const newItemsPerPage = calculateItemsPerPage();
    
    if (newItemsPerPage !== state.pagination.itemsPerPage && newItemsPerPage > 0) {
      const oldItemsPerPage = state.pagination.itemsPerPage;
      state.pagination.itemsPerPage = newItemsPerPage;
      
      const firstItemOnCurrentPage = (state.pagination.currentPage - 1) * oldItemsPerPage;
      state.pagination.currentPage = Math.floor(firstItemOnCurrentPage / newItemsPerPage) + 1;
      
      log(`✓ Items per page updated: ${oldItemsPerPage} → ${newItemsPerPage}`);
      log(`  Current page adjusted: ${state.pagination.currentPage}`);
      
      renderTowers(state.filteredTowers);
    }
  }

  // ============================================
  // AUTO ADJUST CARD IMAGE HEIGHT
  // ============================================

  function adjustCardImageHeight() {
    if (!CONFIG.autoAdjustImageHeight) {
      return;
    }
    
    const gridContainer = state.container?.querySelector('.towers-grid-container');
    if (!gridContainer) {
      log('Cannot adjust image height - grid container not found');
      return;
    }
    
    const grid = gridContainer.querySelector('.towers-grid');
    if (!grid) {
      return;
    }
    
    const containerHeight = gridContainer.clientHeight;
    const containerPaddingTop = parseInt(window.getComputedStyle(gridContainer).paddingTop) || 0;
    const containerPaddingBottom = parseInt(window.getComputedStyle(gridContainer).paddingBottom) || 0;
    
    const gridStyles = window.getComputedStyle(grid);
    const gap = parseInt(gridStyles.gap) || 15;
    const gridCols = gridStyles.gridTemplateColumns.split(' ').length;
    
    let rows = Math.ceil(state.pagination.itemsPerPage / gridCols);
    
    const minRows = CONFIG.minRows || 2;
    rows = Math.max(rows, minRows);
    
    const availableHeight = containerHeight - containerPaddingTop - containerPaddingBottom;
    const cardHeight = (availableHeight - (gap * (rows - 1))) / rows;
    
    const firstCardName = grid.querySelector('.tower-name');
    const textHeight = firstCardName ? firstCardName.offsetHeight : 50;
    
    const imageHeight = cardHeight - textHeight;
    
    const firstThumb = grid.querySelector('.tower-thumb');
    if (firstThumb) {
      const thumbWidth = firstThumb.offsetWidth;
      const aspectRatio = (imageHeight / thumbWidth) * 100;
      
      const finalAspectRatio = Math.max(50, Math.min(200, aspectRatio));
      
      log(`📐 Auto adjusted image height:
    - Container height: ${containerHeight}px
    - Available height: ${availableHeight}px
    - Rows (with min ${minRows}): ${rows}
    - Card height: ${cardHeight.toFixed(1)}px
    - Text height: ${textHeight}px
    - Image height: ${imageHeight.toFixed(1)}px
    - Thumb width: ${thumbWidth}px
    - Aspect ratio: ${finalAspectRatio.toFixed(1)}%`);
      
      const allThumbs = grid.querySelectorAll('.tower-thumb');
      allThumbs.forEach(thumb => {
        thumb.style.paddingTop = `${finalAspectRatio}%`;
      });
    }
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
    log('Đang cập nhật towers theo ngôn ngữ mới...');
    renderTowers(state.filteredTowers);
    log('✓ Đã cập nhật towers theo ngôn ngữ:', state.currentLanguage);
  }

  // ============================================
  // PAGINATION HELPERS
  // ============================================
  
  function updatePaginationState(towers) {
    state.pagination.totalItems = towers.length;
    state.pagination.totalPages = Math.ceil(towers.length / state.pagination.itemsPerPage);
    
    if (state.pagination.currentPage > state.pagination.totalPages) {
      state.pagination.currentPage = state.pagination.totalPages || 1;
    }
    
    log('Pagination updated:', state.pagination);
  }

  function getCurrentPageItems(towers) {
    const start = (state.pagination.currentPage - 1) * state.pagination.itemsPerPage;
    const end = start + state.pagination.itemsPerPage;
    return towers.slice(start, end);
  }

  function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > state.pagination.totalPages) {
      return;
    }
    
    state.pagination.currentPage = pageNumber;
    log('Go to page:', pageNumber);
    
    renderTowers(state.filteredTowers);
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
      const gridContainer = state.container.querySelector('.towers-grid-container');
      if (gridContainer) {
        gridContainer.scrollTop = 0;
      }
    }
  }

  // ============================================
  // LOAD DATA
  // ============================================
  
  async function loadTowersData() {
    try {
      log('Đang load dữ liệu towers từ', CONFIG.jsonPath);
      
      const response = await fetch(CONFIG.jsonPath);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.json();
      
      if (!jsonData.success || !jsonData.data) {
        throw new Error('Dữ liệu JSON không hợp lệ');
      }
      
      state.towers = jsonData.data;
      state.filteredTowers = jsonData.data;
      state.isLoaded = true;
      
      updatePaginationState(state.filteredTowers);
      
      log(`Đã load thành công ${state.towers.length} towers`);
      
      return state.towers;
      
    } catch (error) {
      logError('Lỗi khi load dữ liệu towers', error);
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
    let filtered = state.towers;
    
    if (state.selectedCategoryId !== null) {
      filtered = filtered.filter(tower => 
        tower.cate_id === state.selectedCategoryId
      );
    }
    
    if (state.searchKeyword && state.searchKeyword.trim() !== '') {
      const keyword = state.searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(tower => {
        const nameMatch = tower.name && tower.name.toLowerCase().includes(keyword);
        const nameEnMatch = tower.name_en && tower.name_en.toLowerCase().includes(keyword);
        const codeMatch = tower.code && tower.code.toLowerCase().includes(keyword);
        return nameMatch || nameEnMatch || codeMatch;
      });
    }
    
    state.pagination.currentPage = 1;
    state.filteredTowers = filtered;
    
    log(`Filters applied: Category=${state.selectedCategoryId}, Search="${state.searchKeyword}", Results=${filtered.length}`);
    
    renderTowers(filtered);
  }
  
  function filterByCategory(categoryId) {
    state.selectedCategoryId = categoryId;
    state.searchKeyword = '';
    
    const searchInput = state.container?.querySelector('#towers-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
    const clearBtn = state.container?.querySelector('#towers-search-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    applyFilters();
  }
  
  function searchTowers(keyword) {
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
  // CREATE CATEGORY FILTER UI (HORIZONTAL BUTTONS)
  // ============================================
  
  function createCategoryFilter() {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'towers-category-filter';
    
    const currentLang = state.currentLanguage;
    const allText = currentLang === 'en' || currentLang === 'en-US' ? 'All' : 'Tất cả';
    const searchPlaceholder = currentLang === 'en' || currentLang === 'en-US' ? 'Search towers...' : 'Tìm kiếm tháp...';
    
    let categoriesHTML = `<button class="towers-category-btn ${state.selectedCategoryId === null ? 'active' : ''}" data-category-id="null">${allText}</button>`;
    
    state.categories.forEach(category => {
      const categoryName = getCategoryName(category);
      const activeClass = state.selectedCategoryId === category.id ? 'active' : '';
      
      categoriesHTML += `
        <button class="towers-category-btn ${activeClass}" data-category-id="${category.id}">
          ${categoryName}
        </button>
      `;
    });
    
    filterDiv.innerHTML = `
      <div class="towers-category-filter-wrapper">
        <div class="towers-search-box">
          <input 
            type="text" 
            id="towers-search" 
            class="towers-search-input" 
            placeholder="${searchPlaceholder}"
            value="${state.searchKeyword}"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false">
          <button class="towers-search-clear-btn" id="towers-search-clear-btn" style="display: ${state.searchKeyword ? 'flex' : 'none'}">
            ✕
          </button>
        </div>
        
        <div class="towers-category-buttons-wrapper">
          ${categoriesHTML}
        </div>
      </div>
    `;
    
    return filterDiv;
  }

  // ============================================
  // CREATE TOWER CARD
  // ============================================
  
  function createTowerCard(tower, index) {
    const card = document.createElement('div');
    card.className = 'tower-item';
    card.dataset.id = tower.id;
    card.dataset.towerId = tower.id;
    card.dataset.index = index;
    
    if (CONFIG.showAnimation) {
      card.style.animationDelay = `${index * 0.03}s`;
    }
    
    const thumbImage = tower.photo && tower.photo.length > 0 
      ? tower.photo[0]
      : 'images/no-image.png';
    
    const currentLang = state.currentLanguage;
    let displayName = tower.name;
    
    if (currentLang === 'en' || currentLang === 'en-US') {
      displayName = tower.name_en || tower.name;
    }
    
    card.innerHTML = `
      <div class="tower-card" data-tower-id="${tower.id}">
        <div class="tower-thumb">
          <img src="${thumbImage}" 
               alt="${displayName}" 
               loading="lazy"
               onerror="this.src='images/no-image.png'">
        </div>
        <div class="tower-name">
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
    paginationDiv.className = 'towers-pagination-container';
    
    paginationDiv.innerHTML = `
      <div class="towers-pagination-controls">
        <button class="towers-pagination-btn towers-btn-prev" ${pagination.currentPage === 1 ? 'disabled' : ''}>
          ←
        </button>
        
        <div class="towers-pagination-pages">
          ${generatePageButtons()}
        </div>
        
        <button class="towers-pagination-btn towers-btn-next" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}>
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
      buttons += `<button class="towers-page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        buttons += `<span class="towers-page-dots">...</span>`;
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === current ? 'active' : '';
      buttons += `<button class="towers-page-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }
    
    if (endPage < total) {
      if (endPage < total - 1) {
        buttons += `<span class="towers-page-dots">...</span>`;
      }
      buttons += `<button class="towers-page-btn" data-page="${total}">${total}</button>`;
    }
    
    return buttons;
  }

  // ============================================
  // RENDER TOWERS
  // ============================================
  
  function renderTowers(towers = state.filteredTowers) {
    if (!state.container) {
      logError('Container chưa được khởi tạo');
      return;
    }
    
    state.filteredTowers = towers;
    updatePaginationState(towers);
    state.container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'towers-wrapper';
    
    const categoryFilter = createCategoryFilter();
    wrapper.appendChild(categoryFilter);
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'towers-grid-container';
    
    if (!towers || towers.length === 0) {
      const currentLang = state.currentLanguage;
      const noDataText = currentLang === 'en' || currentLang === 'en-US' 
        ? 'No towers found' 
        : 'Không có tháp';
      
      gridContainer.innerHTML = `
        <div class="towers-no-data">
          <p>${noDataText}</p>
        </div>
      `;
      wrapper.appendChild(gridContainer);
      state.container.appendChild(wrapper);
      attachCategoryListeners();
      attachSearchListeners();
      return;
    }
    
    const pageItems = getCurrentPageItems(towers);
    log(`Rendering page ${state.pagination.currentPage}/${state.pagination.totalPages} (${pageItems.length} items)`);
    
    const grid = document.createElement('div');
    grid.className = 'towers-grid';
    
    pageItems.forEach((tower, index) => {
      const card = createTowerCard(tower, index);
      grid.appendChild(card);
    });
    
    gridContainer.appendChild(grid);
    wrapper.appendChild(gridContainer);
    
    const paginationBottom = createPaginationUI();
    if (paginationBottom) {
      wrapper.appendChild(paginationBottom);
    }
    
    state.container.appendChild(wrapper);
    
    attachEventListeners();
    attachPaginationListeners();
    attachCategoryListeners();
    attachSearchListeners();
    attachMouseWheelListener();
    
    log('Render hoàn tất!');
    
    if (state.pagination.currentPage === 1 && towers.length > 0) {
      setTimeout(() => {
        if (CONFIG.autoCalculateItems) {
          updateItemsPerPageAuto();
        }
        
        setTimeout(() => {
          if (CONFIG.autoAdjustImageHeight) {
            adjustCardImageHeight();
          }
        }, 100);
      }, 150);
    } else {
      setTimeout(() => {
        if (CONFIG.autoAdjustImageHeight) {
          adjustCardImageHeight();
        }
      }, 100);
    }
  }

  // ============================================
  // EVENT HANDLERS - SEARCH
  // ============================================
  
  let searchTimeout = null;
  
  function attachSearchListeners() {
    const searchInput = state.container.querySelector('#towers-search');
    const clearBtn = state.container.querySelector('#towers-search-clear-btn');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        
        if (clearBtn) {
          clearBtn.style.display = value ? 'flex' : 'none';
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          searchTowers(value);
        }, 300);
      });
      
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          searchTowers(e.target.value);
        }
      });
      
      searchInput.addEventListener('touchstart', (e) => {
        e.currentTarget.focus();
      }, { passive: true });
      
      searchInput.addEventListener('click', (e) => {
        e.currentTarget.focus();
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = '';
          clearBtn.style.display = 'none';
          searchTowers('');
          searchInput.focus();
        }
      });
      
      clearBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = '';
          clearBtn.style.display = 'none';
          searchTowers('');
        }
      }, { passive: false });
    }
  }

  // ============================================
  // EVENT HANDLERS - CATEGORY BUTTONS
  // ============================================
  
  function attachCategoryListeners() {
    const categoryButtons = state.container.querySelectorAll('.towers-category-btn');
    
    categoryButtons.forEach(btn => {
      btn.addEventListener('click', handleCategoryClick);
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleCategoryClick.call(btn, e);
      }, { passive: false });
    });
  }

  function handleCategoryClick(event) {
    const categoryId = event.currentTarget.dataset.categoryId;
    const actualCategoryId = categoryId === 'null' ? null : categoryId;
    
    // Remove active class from all buttons
    state.container.querySelectorAll('.towers-category-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    event.currentTarget.classList.add('active');
    
    log('Category selected:', actualCategoryId);
    filterByCategory(actualCategoryId);
  }

  // ============================================
  // EVENT HANDLERS - MOUSE WHEEL SCROLL
  // ============================================
  
  function attachMouseWheelListener() {
    const gridContainer = state.container.querySelector('.towers-grid-container');
    
    if (gridContainer) {
      gridContainer.style.overflowY = 'auto';
      gridContainer.style.pointerEvents = 'auto';
      
      log('✓ Grid container scroll enabled (native browser scroll)');
    }
  }

  // ============================================
  // EVENT HANDLERS - MOBILE TOUCH SUPPORT
  // ============================================
  
  function attachEventListeners() {
    const cards = state.container.querySelectorAll('.tower-card');
    cards.forEach(card => {
      card.addEventListener('click', handleCardClick);
      card.addEventListener('touchstart', handleTouchStart, { passive: false });
      card.addEventListener('touchend', handleTouchEnd, { passive: false });
    });
  }

  function attachPaginationListeners() {
    const btnPrev = state.container.querySelector('.towers-btn-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', prevPage);
      btnPrev.addEventListener('touchend', (e) => {
        e.preventDefault();
        prevPage();
      }, { passive: false });
    }
    
    const btnNext = state.container.querySelector('.towers-btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', nextPage);
      btnNext.addEventListener('touchend', (e) => {
        e.preventDefault();
        nextPage();
      }, { passive: false });
    }
    
    const pageButtons = state.container.querySelectorAll('.towers-page-btn');
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
    const towerId = event.currentTarget.dataset.towerId;
    
    if (!towerId) {
      logError('Không tìm thấy tower ID');
      return;
    }
    
    const mediaName = 'tower' + towerId;
    log('Opening tower:', mediaName);
    
    if (typeof window.tour !== 'undefined' && window.tour.setMediaByName) {
      try {
        window.tour.setMediaByName(mediaName);
        closeContainer();
        log('✓ Đã mở tower:', mediaName);
      } catch (error) {
        logError('Lỗi khi mở tower:', error);
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
      state.searchKeyword = '';
      const searchInput = state.container.querySelector('#towers-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const clearBtn = state.container.querySelector('#towers-search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      state.selectedCategoryId = null;
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
  // WINDOW RESIZE HANDLER
  // ============================================
  
  function setupResizeListener() {
    window.addEventListener('resize', () => {
      clearTimeout(state.resizeTimeout);
      state.resizeTimeout = setTimeout(() => {
        if (state.container && state.isLoaded) {
          if (CONFIG.autoCalculateItems) {
            log('Window resized - recalculating items per page...');
            updateItemsPerPageAuto();
          }
          
          if (CONFIG.autoAdjustImageHeight) {
            log('Window resized - adjusting image height...');
            adjustCardImageHeight();
          }
        }
      }, 300);
    });
    
    log('✓ Resize listener attached');
  }

  // ============================================
  // MAIN INIT
  // ============================================
  
  async function init() {
    try {
      log('Initializing Towers module...');
      
      await loadCategoriesData();
      await loadTowersData();
      getContainer();
      
      state.currentLanguage = getCurrentLanguage();
      log('Ngôn ngữ khởi tạo:', state.currentLanguage);
      
      renderTowers();
      startLanguageMonitoring();
      setupResizeListener();
      
      log('✓ Towers module initialized successfully!');
      log(`  - Auto Items Per Page: ${CONFIG.autoCalculateItems ? 'ON' : 'OFF'}`);
      log(`  - Auto Image Height: ${CONFIG.autoAdjustImageHeight ? 'ON' : 'OFF'}`);
      log(`  - Min Rows: ${CONFIG.minRows}`);
      
    } catch (error) {
      logError('Failed to initialize Towers module', error);
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
  
  window.TowersManager = {
    init: init,
    reload: function() {
      log('Reloading towers...');
      state.pagination.currentPage = 1;
      state.searchKeyword = '';
      state.selectedCategoryId = null;
      return init();
    },
    filterByCategory: filterByCategory,
    search: searchTowers,
    reset: function() {
      log('Resetting to all towers');
      state.selectedCategoryId = null;
      state.searchKeyword = '';
      state.pagination.currentPage = 1;
      state.filteredTowers = state.towers;
      renderTowers(state.towers);
    },
    goToPage: goToPage,
    nextPage: nextPage,
    prevPage: prevPage,
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
  
  window.showTowerGroupContainer = function() {
    log('showTowerGroupContainer() called from tour');
    
    if (state.container) {
      state.searchKeyword = '';
      const searchInput = state.container.querySelector('#towers-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const clearBtn = state.container.querySelector('#towers-search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      state.selectedCategoryId = null;
      applyFilters();
      
      state.container.style.display = 'block';
      state.container.style.opacity = '1';
      state.container.style.pointerEvents = 'auto';
      state.container.style.touchAction = 'auto';
      
      const wrapper = state.container.querySelector('.towers-wrapper');
      if (wrapper) {
        wrapper.style.pointerEvents = 'auto';
      }
      
      log('Container đã mở');
    } else if (window.TowersManager) {
      logError('Container chưa sẵn sàng, đang khởi tạo...');
      window.TowersManager.init().then(() => {
        if (state.container) {
          state.searchKeyword = '';
          const searchInput = state.container.querySelector('#towers-search');
          if (searchInput) {
            searchInput.value = '';
          }
          const clearBtn = state.container.querySelector('#towers-search-clear-btn');
          if (clearBtn) {
            clearBtn.style.display = 'none';
          }

          state.selectedCategoryId = null;
          applyFilters();
          
          state.container.style.display = 'block';
          state.container.style.opacity = '1';
          state.container.style.pointerEvents = 'auto';
          state.container.style.touchAction = 'auto';
          
          const wrapper = state.container.querySelector('.towers-wrapper');
          if (wrapper) {
            wrapper.style.pointerEvents = 'auto';
          }
          
          log('Container đã mở sau khi init');
        }
      });
    } else {
      logError('TowersManager chưa được khởi tạo');
    }
  };

  window.openTowers = window.showTowerGroupContainer;
  window.showTowers = window.showTowerGroupContainer;

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