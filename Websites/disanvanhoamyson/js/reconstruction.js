/**
 * reconstruction.js
 * Module quản lý hiển thị reconstruction workspaces với Category Filter
 * Auto Items Per Page + Auto Adjust Image Height + Min Rows
 * Version: 1.0 - Reconstruction Workspaces Module
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    jsonPath: './jsons/workspaces.json',
    categoryJsonPath: './jsons/workspace_category.json',
    containerName: 'Container Reconstruction',
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
    workspaces: [],
    filteredWorkspaces: [],
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
      console.log('[Reconstruction]', message, ...args);
    }
  }

  function logError(message, error) {
    console.error('[Reconstruction Error]', message, error);
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
    const gridContainer = state.container?.querySelector('.reconstruction-grid-container');
    if (!gridContainer) {
      log('Cannot calculate - grid container not found');
      return CONFIG.itemsPerPage;
    }
    
    const containerHeight = gridContainer.clientHeight;
    const grid = gridContainer.querySelector('.reconstruction-grid');
    if (!grid) {
      return CONFIG.itemsPerPage;
    }
    
    const gridStyles = window.getComputedStyle(grid);
    const gap = parseInt(gridStyles.gap) || 15;
    const gridCols = gridStyles.gridTemplateColumns.split(' ').length;
    
    const firstCard = grid.querySelector('.reconstruction-item');
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
      
      renderWorkspaces(state.filteredWorkspaces);
    }
  }

  // ============================================
  // AUTO ADJUST CARD IMAGE HEIGHT
  // ============================================

  function adjustCardImageHeight() {
    if (!CONFIG.autoAdjustImageHeight) {
      return;
    }
    
    const gridContainer = state.container?.querySelector('.reconstruction-grid-container');
    if (!gridContainer) {
      log('Cannot adjust image height - grid container not found');
      return;
    }
    
    const grid = gridContainer.querySelector('.reconstruction-grid');
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
    
    const firstCardName = grid.querySelector('.reconstruction-name');
    const textHeight = firstCardName ? firstCardName.offsetHeight : 50;
    
    const imageHeight = cardHeight - textHeight;
    
    const firstThumb = grid.querySelector('.reconstruction-thumb');
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
      
      const allThumbs = grid.querySelectorAll('.reconstruction-thumb');
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
    log('Đang cập nhật workspaces theo ngôn ngữ mới...');
    renderWorkspaces(state.filteredWorkspaces);
    log('✓ Đã cập nhật workspaces theo ngôn ngữ:', state.currentLanguage);
  }

  // ============================================
  // PAGINATION HELPERS
  // ============================================
  
  function updatePaginationState(workspaces) {
    state.pagination.totalItems = workspaces.length;
    state.pagination.totalPages = Math.ceil(workspaces.length / state.pagination.itemsPerPage);
    
    if (state.pagination.currentPage > state.pagination.totalPages) {
      state.pagination.currentPage = state.pagination.totalPages || 1;
    }
    
    log('Pagination updated:', state.pagination);
  }

  function getCurrentPageItems(workspaces) {
    const start = (state.pagination.currentPage - 1) * state.pagination.itemsPerPage;
    const end = start + state.pagination.itemsPerPage;
    return workspaces.slice(start, end);
  }

  function goToPage(pageNumber) {
    if (pageNumber < 1 || pageNumber > state.pagination.totalPages) {
      return;
    }
    
    state.pagination.currentPage = pageNumber;
    log('Go to page:', pageNumber);
    
    renderWorkspaces(state.filteredWorkspaces);
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
      const gridContainer = state.container.querySelector('.reconstruction-grid-container');
      if (gridContainer) {
        gridContainer.scrollTop = 0;
      }
    }
  }

  // ============================================
  // LOAD DATA
  // ============================================
  
  async function loadWorkspacesData() {
    try {
      log('Đang load dữ liệu workspaces từ', CONFIG.jsonPath);
      
      const response = await fetch(CONFIG.jsonPath);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.json();
      
      if (!jsonData.success || !jsonData.data) {
        throw new Error('Dữ liệu JSON không hợp lệ');
      }
      
      state.workspaces = jsonData.data;
      state.filteredWorkspaces = jsonData.data;
      state.isLoaded = true;
      
      updatePaginationState(state.filteredWorkspaces);
      
      log(`Đã load thành công ${state.workspaces.length} workspaces`);
      
      return state.workspaces;
      
    } catch (error) {
      logError('Lỗi khi load dữ liệu workspaces', error);
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
    let filtered = state.workspaces;
    
    if (state.selectedCategoryId !== null) {
      filtered = filtered.filter(workspace => 
        workspace.cate_id === state.selectedCategoryId
      );
    }
    
    if (state.searchKeyword && state.searchKeyword.trim() !== '') {
      const keyword = state.searchKeyword.toLowerCase().trim();
      filtered = filtered.filter(workspace => {
        const nameMatch = workspace.name && workspace.name.toLowerCase().includes(keyword);
        const nameEnMatch = workspace.name_en && workspace.name_en.toLowerCase().includes(keyword);
        const codeMatch = workspace.code && workspace.code.toLowerCase().includes(keyword);
        return nameMatch || nameEnMatch || codeMatch;
      });
    }
    
    state.pagination.currentPage = 1;
    state.filteredWorkspaces = filtered;
    
    log(`Filters applied: Category=${state.selectedCategoryId}, Search="${state.searchKeyword}", Results=${filtered.length}`);
    
    renderWorkspaces(filtered);
  }
  
  function filterByCategory(categoryId) {
    state.selectedCategoryId = categoryId;
    state.searchKeyword = '';
    
    const searchInput = state.container?.querySelector('#reconstruction-search');
    if (searchInput) {
        searchInput.value = '';
    }
    
    const clearBtn = state.container?.querySelector('#reconstruction-search-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    applyFilters();
  }
  
  function searchWorkspaces(keyword) {
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
    filterDiv.className = 'reconstruction-category-filter';
    
    const currentLang = state.currentLanguage;
    const allText = currentLang === 'en' || currentLang === 'en-US' ? 'All Workspaces' : 'Tất cả phục dựng';
    const labelText = currentLang === 'en' || currentLang === 'en-US' ? 'Category:' : 'Danh mục:';
    const searchPlaceholder = currentLang === 'en' || currentLang === 'en-US' ? 'Search workspaces...' : 'Tìm kiếm phục dựng...';
    
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
      <div class="reconstruction-category-filter-wrapper">
        <div class="reconstruction-search-box">
          <input 
            type="text" 
            id="reconstruction-search" 
            class="reconstruction-search-input" 
            placeholder="${searchPlaceholder}"
            value="${state.searchKeyword}"
            autocomplete="off"
            autocapitalize="off"
            autocorrect="off"
            spellcheck="false">
          <button class="reconstruction-search-clear-btn" id="reconstruction-search-clear-btn" style="display: ${state.searchKeyword ? 'flex' : 'none'}">
            ✕
          </button>
        </div>
        
        <div class="reconstruction-category-select-wrapper">
          <label for="reconstruction-category-select" class="reconstruction-category-label">${labelText}</label>
          <select id="reconstruction-category-select" class="reconstruction-category-select">
            ${optionsHTML}
          </select>
        </div>
      </div>
    `;
    
    return filterDiv;
  }

  // ============================================
  // CREATE WORKSPACE CARD
  // ============================================
  
  function createWorkspaceCard(workspace, index) {
    const card = document.createElement('div');
    card.className = 'reconstruction-item';
    card.dataset.id = workspace.id;
    card.dataset.workspaceId = workspace.id;
    card.dataset.index = index;
    
    if (CONFIG.showAnimation) {
      card.style.animationDelay = `${index * 0.03}s`;
    }
    
    const thumbImage = workspace.photo && workspace.photo.length > 0 
      ? workspace.photo[0]
      : 'images/no-image.png';
    
    const currentLang = state.currentLanguage;
    let displayName = workspace.name;
    
    if (currentLang === 'en' || currentLang === 'en-US') {
      displayName = workspace.name_en || workspace.name;
    }
    
    card.innerHTML = `
      <div class="reconstruction-card" data-workspace-id="${workspace.id}">
        <div class="reconstruction-thumb">
          <img src="${thumbImage}" 
               alt="${displayName}" 
               loading="lazy"
               onerror="this.src='images/no-image.png'">
        </div>
        <div class="reconstruction-name">
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
    paginationDiv.className = 'reconstruction-pagination-container';
    
    paginationDiv.innerHTML = `
      <div class="reconstruction-pagination-controls">
        <button class="reconstruction-pagination-btn reconstruction-btn-prev" ${pagination.currentPage === 1 ? 'disabled' : ''}>
          ←
        </button>
        
        <div class="reconstruction-pagination-pages">
          ${generatePageButtons()}
        </div>
        
        <button class="reconstruction-pagination-btn reconstruction-btn-next" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}>
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
      buttons += `<button class="reconstruction-page-btn" data-page="1">1</button>`;
      if (startPage > 2) {
        buttons += `<span class="reconstruction-page-dots">...</span>`;
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === current ? 'active' : '';
      buttons += `<button class="reconstruction-page-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }
    
    if (endPage < total) {
      if (endPage < total - 1) {
        buttons += `<span class="reconstruction-page-dots">...</span>`;
      }
      buttons += `<button class="reconstruction-page-btn" data-page="${total}">${total}</button>`;
    }
    
    return buttons;
  }

  // ============================================
  // RENDER WORKSPACES
  // ============================================
  
  function renderWorkspaces(workspaces = state.filteredWorkspaces) {
    if (!state.container) {
      logError('Container chưa được khởi tạo');
      return;
    }
    
    state.filteredWorkspaces = workspaces;
    updatePaginationState(workspaces);
    state.container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'reconstruction-wrapper';
    
    const categoryFilter = createCategoryFilter();
    wrapper.appendChild(categoryFilter);
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'reconstruction-grid-container';
    
    if (!workspaces || workspaces.length === 0) {
      const currentLang = state.currentLanguage;
      const noDataText = currentLang === 'en' || currentLang === 'en-US' 
        ? 'No reconstructions found' 
        : 'Không có phục dựng';
      
      gridContainer.innerHTML = `
        <div class="reconstruction-no-data">
          <p>${noDataText}</p>
        </div>
      `;
      wrapper.appendChild(gridContainer);
      state.container.appendChild(wrapper);
      attachCategoryListeners();
      attachSearchListeners();
      return;
    }
    
    const pageItems = getCurrentPageItems(workspaces);
    log(`Rendering page ${state.pagination.currentPage}/${state.pagination.totalPages} (${pageItems.length} items)`);
    
    const grid = document.createElement('div');
    grid.className = 'reconstruction-grid';
    
    pageItems.forEach((workspace, index) => {
      const card = createWorkspaceCard(workspace, index);
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
    
    if (state.pagination.currentPage === 1 && workspaces.length > 0) {
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
    const searchInput = state.container.querySelector('#reconstruction-search');
    const clearBtn = state.container.querySelector('#reconstruction-search-clear-btn');
    
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const value = e.target.value;
        
        if (clearBtn) {
          clearBtn.style.display = value ? 'flex' : 'none';
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          searchWorkspaces(value);
        }, 300);
      });
      
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          clearTimeout(searchTimeout);
          searchWorkspaces(e.target.value);
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
          searchWorkspaces('');
          searchInput.focus();
        }
      });
      
      clearBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = '';
          clearBtn.style.display = 'none';
          searchWorkspaces('');
        }
      }, { passive: false });
    }
  }

  // ============================================
  // EVENT HANDLERS - CATEGORY FILTER
  // ============================================
  
  function attachCategoryListeners() {
    const categorySelect = state.container.querySelector('#reconstruction-category-select');
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
    const gridContainer = state.container.querySelector('.reconstruction-grid-container');
    
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
    const cards = state.container.querySelectorAll('.reconstruction-card');
    cards.forEach(card => {
      card.addEventListener('click', handleCardClick);
      card.addEventListener('touchstart', handleTouchStart, { passive: false });
      card.addEventListener('touchend', handleTouchEnd, { passive: false });
    });
  }

  function attachPaginationListeners() {
    const btnPrev = state.container.querySelector('.reconstruction-btn-prev');
    if (btnPrev) {
      btnPrev.addEventListener('click', prevPage);
      btnPrev.addEventListener('touchend', (e) => {
        e.preventDefault();
        prevPage();
      }, { passive: false });
    }
    
    const btnNext = state.container.querySelector('.reconstruction-btn-next');
    if (btnNext) {
      btnNext.addEventListener('click', nextPage);
      btnNext.addEventListener('touchend', (e) => {
        e.preventDefault();
        nextPage();
      }, { passive: false });
    }
    
    const pageButtons = state.container.querySelectorAll('.reconstruction-page-btn');
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
    const workspaceId = event.currentTarget.dataset.workspaceId;
    
    if (!workspaceId) {
      logError('Không tìm thấy workspace ID');
      return;
    }
    
    const mediaName = 'workspace' + workspaceId;
    log('Opening workspace:', mediaName);
    
    if (typeof window.tour !== 'undefined' && window.tour.setMediaByName) {
      try {
        window.tour.setMediaByName(mediaName);
        closeContainer();
        log('✓ Đã mở workspace:', mediaName);
      } catch (error) {
        logError('Lỗi khi mở workspace:', error);
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
      const searchInput = state.container.querySelector('#reconstruction-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const clearBtn = state.container.querySelector('#reconstruction-search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      const categorySelect = state.container.querySelector('#reconstruction-category-select');
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
      log('Initializing Reconstruction module...');
      
      await loadCategoriesData();
      await loadWorkspacesData();
      getContainer();
      
      state.currentLanguage = getCurrentLanguage();
      log('Ngôn ngữ khởi tạo:', state.currentLanguage);
      
      renderWorkspaces();
      startLanguageMonitoring();
      setupResizeListener();
      
      log('✓ Reconstruction module initialized successfully!');
      log(`  - Auto Items Per Page: ${CONFIG.autoCalculateItems ? 'ON' : 'OFF'}`);
      log(`  - Auto Image Height: ${CONFIG.autoAdjustImageHeight ? 'ON' : 'OFF'}`);
      log(`  - Min Rows: ${CONFIG.minRows}`);
      
    } catch (error) {
      logError('Failed to initialize Reconstruction module', error);
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
  
  window.ReconstructionManager = {
    init: init,
    reload: function() {
      log('Reloading reconstruction...');
      state.pagination.currentPage = 1;
      state.searchKeyword = '';
      state.selectedCategoryId = null;
      return init();
    },
    filterByCategory: filterByCategory,
    search: searchWorkspaces,
    reset: function() {
      log('Resetting to all workspaces');
      state.selectedCategoryId = null;
      state.searchKeyword = '';
      state.pagination.currentPage = 1;
      state.filteredWorkspaces = state.workspaces;
      renderWorkspaces(state.workspaces);
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
  
  window.showReconstructionContainer = function() {
    log('showReconstructionContainer() called from tour');
    
    if (state.container) {
      state.searchKeyword = '';
      const searchInput = state.container.querySelector('#reconstruction-search');
      if (searchInput) {
        searchInput.value = '';
      }
      const clearBtn = state.container.querySelector('#reconstruction-search-clear-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      const categorySelect = state.container.querySelector('#reconstruction-category-select');
      if (categorySelect) {
        categorySelect.value = 'null';
      }

      applyFilters();
      
      state.container.style.display = 'block';
      state.container.style.opacity = '1';
      state.container.style.pointerEvents = 'auto';
      state.container.style.touchAction = 'auto';
      
      const wrapper = state.container.querySelector('.reconstruction-wrapper');
      if (wrapper) {
        wrapper.style.pointerEvents = 'auto';
      }
      
      log('Container đã mở');
    } else if (window.ReconstructionManager) {
      logError('Container chưa sẵn sàng, đang khởi tạo...');
      window.ReconstructionManager.init().then(() => {
        if (state.container) {
          state.searchKeyword = '';
          const searchInput = state.container.querySelector('#reconstruction-search');
          if (searchInput) {
            searchInput.value = '';
          }
          const clearBtn = state.container.querySelector('#reconstruction-search-clear-btn');
          if (clearBtn) {
            clearBtn.style.display = 'none';
          }

          const categorySelect = state.container.querySelector('#reconstruction-category-select');
          if (categorySelect) {
            categorySelect.value = 'null';
          }

          applyFilters();
          
          state.container.style.display = 'block';
          state.container.style.opacity = '1';
          state.container.style.pointerEvents = 'auto';
          state.container.style.touchAction = 'auto';
          
          const wrapper = state.container.querySelector('.reconstruction-wrapper');
          if (wrapper) {
            wrapper.style.pointerEvents = 'auto';
          }
          
          log('Container đã mở sau khi init');
        }
      });
    } else {
      logError('ReconstructionManager chưa được khởi tạo');
    }
  };

  window.openReconstruction = window.showReconstructionContainer;
  window.showReconstruction = window.showReconstructionContainer;

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