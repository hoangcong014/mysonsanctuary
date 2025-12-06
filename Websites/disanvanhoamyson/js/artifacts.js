/**
 * artifacts.js
 * Module quản lý hiển thị artifacts với Category Filter
 * Auto Items Per Page + Auto Adjust Image Height + Min Rows
 * Version: 6.0 - With Min Rows Support
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
    debug: true,
    autoCalculateItems: true,
    autoAdjustImageHeight: true,
    minRows: 2 // Đảm bảo ít nhất 2 hàng
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const state = {
    artifacts: [],
    filteredArtifacts: [],
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
  // AUTO CALCULATE ITEMS PER PAGE
  // ============================================

  function calculateItemsPerPage() {
    const gridContainer = state.container?.querySelector('.artifacts-grid-container');
    if (!gridContainer) {
      log('Cannot calculate - grid container not found');
      return CONFIG.itemsPerPage;
    }
    
    const containerHeight = gridContainer.clientHeight;
    const grid = gridContainer.querySelector('.artifacts-grid');
    if (!grid) {
      return CONFIG.itemsPerPage;
    }
    
    const gridStyles = window.getComputedStyle(grid);
    const gap = parseInt(gridStyles.gap) || 15;
    const gridCols = gridStyles.gridTemplateColumns.split(' ').length;
    
    const firstCard = grid.querySelector('.artifact-item');
    if (!firstCard) {
      return CONFIG.itemsPerPage;
    }
    
    const cardHeight = firstCard.offsetHeight;
    const containerPaddingTop = parseInt(window.getComputedStyle(gridContainer).paddingTop) || 0;
    const containerPaddingBottom = parseInt(window.getComputedStyle(gridContainer).paddingBottom) || 0;
    
    const availableHeight = containerHeight - containerPaddingTop - containerPaddingBottom;
    let rows = Math.floor((availableHeight + gap) / (cardHeight + gap));
    
    // Đảm bảo ít nhất minRows hàng
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
      
      renderArtifacts(state.filteredArtifacts);
    }
  }

  // ============================================
  // AUTO ADJUST CARD IMAGE HEIGHT
  // ============================================

  function adjustCardImageHeight() {
    if (!CONFIG.autoAdjustImageHeight) {
      return;
    }
    
    const gridContainer = state.container?.querySelector('.artifacts-grid-container');
    if (!gridContainer) {
      log('Cannot adjust image height - grid container not found');
      return;
    }
    
    const grid = gridContainer.querySelector('.artifacts-grid');
    if (!grid) {
      return;
    }
    
    // Lấy chiều cao container
    const containerHeight = gridContainer.clientHeight;
    const containerPaddingTop = parseInt(window.getComputedStyle(gridContainer).paddingTop) || 0;
    const containerPaddingBottom = parseInt(window.getComputedStyle(gridContainer).paddingBottom) || 0;
    
    // Lấy gap và số cột
    const gridStyles = window.getComputedStyle(grid);
    const gap = parseInt(gridStyles.gap) || 15;
    const gridCols = gridStyles.gridTemplateColumns.split(' ').length;
    
    // Tính số hàng dựa trên items per page
    let rows = Math.ceil(state.pagination.itemsPerPage / gridCols);
    
    // Đảm bảo ít nhất minRows hàng
    const minRows = CONFIG.minRows || 2;
    rows = Math.max(rows, minRows);
    
    // Tính chiều cao mỗi card
    const availableHeight = containerHeight - containerPaddingTop - containerPaddingBottom;
    const cardHeight = (availableHeight - (gap * (rows - 1))) / rows;
    
    // Lấy chiều cao phần text (tên artifact)
    const firstCardName = grid.querySelector('.artifact-name');
    const textHeight = firstCardName ? firstCardName.offsetHeight : 50;
    
    // Chiều cao ảnh = chiều cao card - chiều cao text
    const imageHeight = cardHeight - textHeight;
    
    // Tính aspect ratio cho ảnh
    const firstThumb = grid.querySelector('.artifact-thumb');
    if (firstThumb) {
      const thumbWidth = firstThumb.offsetWidth;
      const aspectRatio = (imageHeight / thumbWidth) * 100;
      
      // Giới hạn aspect ratio hợp lý (50% - 200%)
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
      
      // Apply CSS cho tất cả thumbnails
      const allThumbs = grid.querySelectorAll('.artifact-thumb');
      allThumbs.forEach(thumb => {
        thumb.style.paddingTop = `${finalAspectRatio}%`;
      });
    }
  }

  function enableAutoImageHeight() {
    CONFIG.autoAdjustImageHeight = true;
    adjustCardImageHeight();
    log('✓ Auto image height enabled');
  }

  function disableAutoImageHeight() {
    CONFIG.autoAdjustImageHeight = false;
    const allThumbs = document.querySelectorAll('.artifact-thumb');
    allThumbs.forEach(thumb => {
      thumb.style.paddingTop = '100%'; // Reset về vuông
    });
    log('✓ Auto image height disabled, reset to square (100%)');
  }

  function setImageAspectRatio(ratio) {
    CONFIG.autoAdjustImageHeight = false;
    const allThumbs = document.querySelectorAll('.artifact-thumb');
    allThumbs.forEach(thumb => {
      thumb.style.paddingTop = `${ratio}%`;
    });
    log(`✓ Image aspect ratio set to: ${ratio}%`);
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
      const gridContainer = state.container.querySelector('.artifacts-grid-container');
      if (gridContainer) {
        gridContainer.scrollTop = 0;
      }
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
    
    if (state.selectedCategoryId !== null) {
      filtered = filtered.filter(artifact => 
        artifact.cate_id === state.selectedCategoryId
      );
    }
    
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
    state.searchKeyword = '';
    
    const searchInput = state.container?.querySelector('#artifact-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
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
  // CREATE CATEGORY FILTER UI
  // ============================================
  
  function createCategoryFilter() {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'category-filter';
    
    const currentLang = state.currentLanguage;
    const allText = currentLang === 'en' || currentLang === 'en-US' ? 'All Categories' : 'Tất cả danh mục';
    const labelText = currentLang === 'en' || currentLang === 'en-US' ? 'Category:' : 'Danh mục:';
    const searchPlaceholder = currentLang === 'en' || currentLang === 'en-US' ? 'Search artifacts...' : 'Tìm kiếm hiện vật...';
    
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
    
    const categoryFilter = createCategoryFilter();
    wrapper.appendChild(categoryFilter);
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'artifacts-grid-container';
    
    if (!artifacts || artifacts.length === 0) {
      const currentLang = state.currentLanguage;
      const noDataText = currentLang === 'en' || currentLang === 'en-US' 
        ? 'No artifacts found' 
        : 'Không có hiện vật';
      
      gridContainer.innerHTML = `
        <div class="no-data">
          <p>${noDataText}</p>
        </div>
      `;
      wrapper.appendChild(gridContainer);
      state.container.appendChild(wrapper);
      attachCategoryListeners();
      attachSearchListeners();
      return;
    }
    
    const pageItems = getCurrentPageItems(artifacts);
    log(`Rendering page ${state.pagination.currentPage}/${state.pagination.totalPages} (${pageItems.length} items)`);
    
    const grid = document.createElement('div');
    grid.className = 'artifacts-grid';
    
    pageItems.forEach((artifact, index) => {
      const card = createArtifactCard(artifact, index);
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
    
    // Auto features - chạy sau khi DOM đã render
    if (state.pagination.currentPage === 1 && artifacts.length > 0) {
      setTimeout(() => {
        if (CONFIG.autoCalculateItems) {
          updateItemsPerPageAuto();
        }
        
        // Auto adjust image height AFTER items per page calculated
        setTimeout(() => {
          if (CONFIG.autoAdjustImageHeight) {
            adjustCardImageHeight();
          }
        }, 100);
      }, 150);
    } else {
      // Chỉ adjust image height khi không phải trang 1
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
    const searchInput = state.container.querySelector('#artifact-search');
    const clearBtn = state.container.querySelector('#search-clear-btn');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        
        if (clearBtn) {
          clearBtn.style.display = value ? 'flex' : 'none';
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          searchArtifacts(value);
        }, 300);
      });
      
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          searchArtifacts(e.target.value);
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
      categorySelect.addEventListener('change', handleCategoryChange);
      
      categorySelect.addEventListener('click', (e) => {
        e.currentTarget.focus();
      });
      
      categorySelect.addEventListener('touchstart', (e) => {
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
  // EVENT HANDLERS - MOUSE WHEEL SCROLL
  // ============================================
  
  function attachMouseWheelListener() {
    const gridContainer = state.container.querySelector('.artifacts-grid-container');
    
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
      state.searchKeyword = '';
      const searchInput = state.container.querySelector('#artifact-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const clearBtn = state.container.querySelector('#search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      const categorySelect = state.container.querySelector('#category-select');
      if (categorySelect) {
        categorySelect.value = 'null';
      }

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
  // INJECT STYLES
  // ============================================
  
  function injectStyles() {
    const existingLink = document.querySelector('link[href*="artifacts.css"]');
    
    if (existingLink) {
      log('✓ CSS đã được load từ HTML');
      return;
    }
    
    console.warn('⚠️ [Artifacts] CẢNH BÁO: Chưa thêm artifacts.css vào HTML!');
    console.warn('⚠️ [Artifacts] Hãy thêm <link rel="stylesheet" href="css/artifacts.css"> vào <head>');
    
    const link = document.createElement('link');
    link.id = 'artifacts-styles-fallback';
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = 'css/artifacts.css?v=' + Date.now();
    
    document.head.appendChild(link);
    
    log('⚠️ CSS đã được tự động inject (fallback mode)');
    
    link.addEventListener('load', () => {
      log('✓ CSS fallback đã load thành công');
    });
    
    link.addEventListener('error', () => {
      logError('❌ LỖI: Không thể load file css/artifacts.css', 
        'Vui lòng kiểm tra đường dẫn file CSS');
    });
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
  // MIN ROWS API
  // ============================================
  
  function setMinRows(rows) {
    CONFIG.minRows = Math.max(1, rows);
    log(`✓ Min rows set to: ${CONFIG.minRows}`);
    
    if (CONFIG.autoCalculateItems) {
      updateItemsPerPageAuto();
    }
  }

  function getMinRows() {
    return CONFIG.minRows;
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
      setupResizeListener();
      
      log('✓ Artifacts module initialized successfully!');
      log(`  - Auto Items Per Page: ${CONFIG.autoCalculateItems ? 'ON' : 'OFF'}`);
      log(`  - Auto Image Height: ${CONFIG.autoAdjustImageHeight ? 'ON' : 'OFF'}`);
      log(`  - Min Rows: ${CONFIG.minRows}`);
      
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
    // Auto Items Per Page API
    enableAutoItemsPerPage: function() {
      CONFIG.autoCalculateItems = true;
      updateItemsPerPageAuto();
      log('✓ Auto items per page enabled');
    },
    disableAutoItemsPerPage: function() {
      CONFIG.autoCalculateItems = false;
      state.pagination.itemsPerPage = CONFIG.itemsPerPage;
      renderArtifacts(state.filteredArtifacts);
      log('✓ Auto items per page disabled, using default:', CONFIG.itemsPerPage);
    },
    getCurrentItemsPerPage: function() {
      return state.pagination.itemsPerPage;
    },
    recalculateItemsPerPage: function() {
      updateItemsPerPageAuto();
    },
    // Auto Image Height API
    enableAutoImageHeight: enableAutoImageHeight,
    disableAutoImageHeight: disableAutoImageHeight,
    adjustImageHeight: adjustCardImageHeight,
    setImageAspectRatio: setImageAspectRatio,
    // Min Rows API
    setMinRows: setMinRows,
    getMinRows: getMinRows,
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
      state.searchKeyword = '';
      const searchInput = state.container.querySelector('#artifact-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const clearBtn = state.container.querySelector('#search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      const categorySelect = state.container.querySelector('#category-select');
      if (categorySelect) {
        categorySelect.value = 'null';
      }

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
          state.searchKeyword = '';
          const searchInput = state.container.querySelector('#artifact-search');
          if (searchInput) {
            searchInput.value = '';
          }
          const clearBtn = state.container.querySelector('#search-clear-btn');
          if (clearBtn) {
            clearBtn.style.display = 'none';
          }

          const categorySelect = state.container.querySelector('#category-select');
          if (categorySelect) {
            categorySelect.value = 'null';
          }

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