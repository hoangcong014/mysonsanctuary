/**
 * model-info.js
 * Module quản lý hiển thị thông tin chi tiết model (artifact/tower/reconstruction)
 * Version: 1.2 - Fixed ID-based lookup
 */

(function() {
  'use strict';

  // ============================================
  // CONFIGURATION
  // ============================================
  const CONFIG = {
    assetsJson: './jsons/assets.json',
    towersJson: './jsons/towers.json',
    workspacesJson: './jsons/workspaces.json',
    containerName: '-- THE MODEL INFO',
    debug: true,
    autoInit: true
  };

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const state = {
    assets: [],
    towers: [],
    workspaces: [],
    currentImages: [],
    currentImageIndex: 0,
    container: null,
    isLoaded: false,
    currentLanguage: 'vi',
    languageCheckInterval: null
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  function log(message, ...args) {
    if (CONFIG.debug) {
      console.log('[ModelInfo]', message, ...args);
    }
  }

  function logError(message, error) {
    console.error('[ModelInfo Error]', message, error);
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
  // LOAD DATA
  // ============================================
  
  async function loadAllData() {
    try {
      log('Loading all data...');
      
      const [assetsRes, towersRes, workspacesRes] = await Promise.all([
        fetch(CONFIG.assetsJson),
        fetch(CONFIG.towersJson),
        fetch(CONFIG.workspacesJson)
      ]);

      const [assetsData, towersData, workspacesData] = await Promise.all([
        assetsRes.json(),
        towersRes.json(),
        workspacesRes.json()
      ]);

      state.assets = assetsData.success ? assetsData.data : [];
      state.towers = towersData.success ? towersData.data : [];
      state.workspaces = workspacesData.success ? workspacesData.data : [];
      state.isLoaded = true;

      log(`✓ Loaded: ${state.assets.length} assets, ${state.towers.length} towers, ${state.workspaces.length} workspaces`);
      
    } catch (error) {
      logError('Failed to load data', error);
      state.isLoaded = false;
      throw error;
    }
  }

  // ============================================
  // GET CURRENT MODEL INFO
  // ============================================
  
  function getCurrentModelInfo() {
    try {
      // Use TourHelpers to get media name
      if (typeof TourHelpers === 'undefined' || !TourHelpers.getCurrentMediaName) {
        log('TourHelpers not available');
        return null;
      }

      const mediaName = TourHelpers.getCurrentMediaName();
      if (!mediaName) {
        log('No active media name');
        return null;
      }

      log('Current media name:', mediaName);

      // Check if it's an asset
      if (mediaName.startsWith('asset')) {
        const id = mediaName.replace('asset', '');
        const asset = state.assets.find(a => String(a.id) === String(id));
        if (asset) {
          log('Found asset with ID:', id, asset.name);
          return {
            type: 'asset',
            data: asset
          };
        }
      }

      // Check if it's a tower
      if (mediaName.startsWith('tower')) {
        const id = mediaName.replace('tower', '');
        const tower = state.towers.find(t => String(t.id) === String(id));
        if (tower) {
          log('Found tower with ID:', id, tower.name);
          return {
            type: 'tower',
            data: tower
          };
        }
      }

      // Check if it's a workspace/reconstruction
      if (mediaName.startsWith('workspace')) {
        const id = mediaName.replace('workspace', '');
        const workspace = state.workspaces.find(w => String(w.id) === String(id));
        if (workspace) {
          log('Found workspace with ID:', id, workspace.name);
          return {
            type: 'workspace',
            data: workspace
          };
        }
      }

      log('No matching model found for:', mediaName);
      return null;

    } catch (error) {
      logError('Error getting current model info', error);
      return null;
    }
  }

  // ============================================
  // RENDER INFO
  // ============================================
  
  function renderModelInfo(modelInfo) {
    if (!modelInfo || !modelInfo.data) {
      renderNoInfo();
      return;
    }

    const { data } = modelInfo;
    const lang = getCurrentLanguage();
    
    const name = lang === 'en' || lang === 'en-US' ? (data.name_en || data.name) : data.name;
    const description = lang === 'en' || lang === 'en-US' ? (data.description_en || data.description) : data.description;
    
    // Get images
    let images = [];
    if (data.photo && Array.isArray(data.photo)) {
      images = data.photo.map(p => {
        if (typeof p === 'string') return p;
        return p.original || p.thumb || p;
      });
    } else if (typeof data.photo === 'string') {
      images = [data.photo];
    }

    state.currentImages = images.filter(img => img && typeof img === 'string');
    state.currentImageIndex = 0;

    log('Images found:', state.currentImages.length);

    // Update title
    const titleEl = state.container.querySelector('.model-info-title');
    if (titleEl) {
      titleEl.textContent = name || (lang === 'en' ? 'Untitled' : 'Chưa có tên');
    }

    // Build content HTML
    let html = '';

    // Description
    if (description && description.trim()) {
      html += `<div class="model-info-description">${description}</div>`;
    } else {
      html += `<div class="model-info-no-description">${lang === 'en' ? 'No description available' : 'Không có mô tả'}</div>`;
    }

    // Images
    if (state.currentImages.length > 0) {
      html += `
        <div class="model-info-gallery">
          <span class="model-info-gallery-label">${lang === 'en' ? 'Images' : 'Hình ảnh'}</span>
          <div class="model-info-gallery-container">
            <img src="${state.currentImages[0]}" 
                 alt="${name}" 
                 class="model-info-gallery-image" 
                 id="galleryImage"
                 onerror="this.src='images/no-image.png'">
            ${state.currentImages.length > 1 ? `
              <button class="model-info-gallery-nav prev" id="prevImageBtn">❮</button>
              <button class="model-info-gallery-nav next" id="nextImageBtn">❯</button>
              <div class="model-info-gallery-counter">
                <span id="imageCounter">1</span> / ${state.currentImages.length}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      html += `<div class="model-info-no-images">${lang === 'en' ? 'No images available' : 'Không có hình ảnh'}</div>`;
    }

    const contentEl = state.container.querySelector('.model-info-content');
    if (contentEl) {
      contentEl.innerHTML = html;
      
      // Attach image navigation events
      if (state.currentImages.length > 1) {
        attachImageNavigation();
      }

      // Scroll to top
      contentEl.scrollTop = 0;
    }

    log('✓ Model info rendered');
  }

  function renderNoInfo() {
    const lang = getCurrentLanguage();
    
    const titleEl = state.container.querySelector('.model-info-title');
    if (titleEl) {
      titleEl.textContent = lang === 'en' ? 'No Information' : 'Không có thông tin';
    }

    const contentEl = state.container.querySelector('.model-info-content');
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="model-info-no-description">
          ${lang === 'en' ? 'No information available for this item' : 'Không có thông tin cho mục này'}
        </div>
      `;
    }

    log('No info rendered');
  }

  function renderLoading() {
    const titleEl = state.container.querySelector('.model-info-title');
    if (titleEl) {
      titleEl.textContent = 'Loading...';
    }

    const contentEl = state.container.querySelector('.model-info-content');
    if (contentEl) {
      const lang = getCurrentLanguage();
      contentEl.innerHTML = `
        <div class="model-info-loading">
          ${lang === 'en' ? 'Loading information' : 'Đang tải thông tin'}
        </div>
      `;
    }
  }

  function renderError(error) {
    const lang = getCurrentLanguage();
    
    const titleEl = state.container.querySelector('.model-info-title');
    if (titleEl) {
      titleEl.textContent = lang === 'en' ? 'Error' : 'Lỗi';
    }

    const contentEl = state.container.querySelector('.model-info-content');
    if (contentEl) {
      contentEl.innerHTML = `
        <div class="model-info-error">
          <div class="model-info-error-icon">⚠️</div>
          <p>${lang === 'en' ? 'Failed to load information' : 'Không thể tải thông tin'}</p>
          <p style="font-size: 14px; color: #999;">${error.message || ''}</p>
        </div>
      `;
    }
  }

  // ============================================
  // IMAGE NAVIGATION
  // ============================================
  
  function attachImageNavigation() {
    const prevBtn = document.getElementById('prevImageBtn');
    const nextBtn = document.getElementById('nextImageBtn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => changeImage(-1));
      prevBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        changeImage(-1);
      }, { passive: false });
    }
    
    if (nextBtn) {
      nextBtn.addEventListener('click', () => changeImage(1));
      nextBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        changeImage(1);
      }, { passive: false });
    }

    // Keyboard navigation (arrow keys)
    const keyHandler = (e) => {
      if (state.container && state.container.style.display === 'block') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          changeImage(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          changeImage(1);
        }
      }
    };

    document.addEventListener('keydown', keyHandler);
  }

  function changeImage(direction) {
    if (state.currentImages.length <= 1) return;

    state.currentImageIndex += direction;
    
    if (state.currentImageIndex < 0) {
      state.currentImageIndex = state.currentImages.length - 1;
    } else if (state.currentImageIndex >= state.currentImages.length) {
      state.currentImageIndex = 0;
    }

    const img = document.getElementById('galleryImage');
    const counter = document.getElementById('imageCounter');
    
    if (img) {
      img.src = state.currentImages[state.currentImageIndex];
    }
    if (counter) {
      counter.textContent = state.currentImageIndex + 1;
    }

    log('Image changed to index:', state.currentImageIndex);
  }

  // ============================================
  // CONTAINER SETUP
  // ============================================
  
  function setupContainer() {
    if (!state.container) return;

    const lang = getCurrentLanguage();

    // Create container structure if not exists
    let wrapper = state.container.querySelector('.model-info-wrapper');
    
    if (!wrapper) {
      state.container.innerHTML = `
        <div class="model-info-wrapper">
          <div class="model-info-header">
            <h2 class="model-info-title">Loading...</h2>
            <button class="model-info-close-btn">✖</button>
          </div>
          
          <div class="model-info-content">
            <div class="model-info-loading">${lang === 'en' ? 'Loading information' : 'Đang tải thông tin'}</div>
          </div>
        </div>
      `;

      // Attach close button event
      const closeBtn = state.container.querySelector('.model-info-close-btn');
      if (closeBtn) {
        closeBtn.addEventListener('click', hideModelInfo);
        closeBtn.addEventListener('touchend', (e) => {
          e.preventDefault();
          hideModelInfo();
        }, { passive: false });
      }

      log('Container structure created');
    }
  }

  // ============================================
  // SHOW/HIDE CONTAINER
  // ============================================
  
  async function showModelInfo() {
    log('showModelInfo() called');

    // Get container
    if (!state.container) {
      try {
        if (typeof TourHelpers === 'undefined') {
          throw new Error('TourHelpers not loaded');
        }
        
        state.container = TourHelpers.getComponentByName(CONFIG.containerName);
        
        if (!state.container) {
          throw new Error(`Container "${CONFIG.containerName}" not found`);
        }
        
        log('✓ Container found:', CONFIG.containerName);
        
        // Setup container structure
        setupContainer();
        
      } catch (error) {
        logError('Failed to get container', error);
        return;
      }
    }

    // Load data if not loaded
    if (!state.isLoaded) {
      renderLoading();
      
      // Show container
      state.container.style.display = 'block';
      state.container.style.opacity = '1';
      state.container.style.pointerEvents = 'auto';
      
      try {
        await loadAllData();
      } catch (error) {
        renderError(error);
        return;
      }
    } else {
      // Show container
      state.container.style.display = 'block';
      state.container.style.opacity = '1';
      state.container.style.pointerEvents = 'auto';
    }

    // ✅ LUÔN LẤY NGÔN NGỮ HIỆN TẠI KHI MỞ CONTAINER
    state.currentLanguage = getCurrentLanguage();
    log('📌 Current language on open:', state.currentLanguage);

    // Get current model info
    const modelInfo = getCurrentModelInfo();
    
    if (modelInfo) {
      log('✓ Model info found:', modelInfo.type, modelInfo.data.name);
      renderModelInfo(modelInfo);
    } else {
      log('⚠ No model info found');
      renderNoInfo();
    }

    log('✓ Container shown');
  }

  function hideModelInfo() {
    if (state.container) {
      state.container.style.display = 'none';
      log('✓ Container hidden');
    }
  }

  // ============================================
  // LANGUAGE CHANGE DETECTION
  // ============================================
  
  function startLanguageMonitoring() {
    state.currentLanguage = getCurrentLanguage();
    log('Language monitoring started. Current:', state.currentLanguage);
    
    state.languageCheckInterval = setInterval(() => {
      const newLanguage = getCurrentLanguage();
      
      if (newLanguage !== state.currentLanguage) {
        log(`🌐 Language changed: ${state.currentLanguage} → ${newLanguage}`);
        state.currentLanguage = newLanguage;
        onLanguageChange();
      }
    }, 500);
  }

  function stopLanguageMonitoring() {
    if (state.languageCheckInterval) {
      clearInterval(state.languageCheckInterval);
      state.languageCheckInterval = null;
      log('Language monitoring stopped');
    }
  }

  function onLanguageChange() {
    // ✅ CHỈ RE-RENDER NẾU CONTAINER ĐANG HIỂN THỊ
    if (state.container && state.container.style.display === 'block') {
      log('🔄 Updating model info for new language...');
      
      const modelInfo = getCurrentModelInfo();
      if (modelInfo) {
        renderModelInfo(modelInfo);
        log('✓ Model info updated to language:', state.currentLanguage);
      } else {
        renderNoInfo();
        log('✓ No info updated to language:', state.currentLanguage);
      }
    } else {
      log('ℹ️ Container not visible, skipping re-render');
    }
  }

  // ============================================
  // INIT
  // ============================================
  
  function init() {
    log('Initializing ModelInfo module...');
    
    // Load data in background
    loadAllData().catch(error => {
      logError('Background data loading failed', error);
    });

    // Start language monitoring
    startLanguageMonitoring();
    
    log('✓ ModelInfo module initialized');
  }

  // ============================================
  // AUTO INIT
  // ============================================
  
  function waitForTourReady() {
    log('Waiting for tour to be ready...');
    
    const checkInterval = setInterval(() => {
      if (typeof TourHelpers !== 'undefined' && TourHelpers.getComponentByName) {
        clearInterval(checkInterval);
        log('✓ Tour is ready');
        
        if (CONFIG.autoInit) {
          init();
        }
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      if (!state.isLoaded) {
        log('⚠ Timeout: Tour not ready after 10 seconds');
      }
    }, 10000);
  }

  // ============================================
  // PUBLIC API
  // ============================================
  
  window.ModelInfoManager = {
    init: init,
    show: showModelInfo,
    hide: hideModelInfo,
    reload: loadAllData,
    getState: () => ({ ...state }),
    config: CONFIG
  };

  // ============================================
  // GLOBAL FUNCTIONS (for tour to call)
  // ============================================
  
  window.showModelInfo = showModelInfo;
  window.hideModelInfo = hideModelInfo;

  // ============================================
  // EVENT LISTENERS
  // ============================================
  
  // Close on ESC key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && state.container && state.container.style.display === 'block') {
      hideModelInfo();
    }
  });

  // Close on outside click
  document.addEventListener('click', function(e) {
    if (state.container && 
        state.container.style.display === 'block' && 
        e.target === state.container) {
      hideModelInfo();
    }
  });

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