// Shared Navigation System for TTS Reader Multi-Page Application

(() => {
  'use strict';

  // Navigation configuration
  const navigationConfig = {
    pages: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        url: 'dashboard.html',
        icon: 'bi-house',
        description: 'Main overview and navigation hub'
      },
      {
        id: 'tts',
        title: 'Text-to-Speech',
        url: 'tts.html',
        icon: 'bi-volume-up',
        description: 'Convert text to speech with voice controls'
      },
      {
        id: 'ocr',
        title: 'OCR Tools',
        url: 'ocr.html',
        icon: 'bi-camera',
        description: 'Extract text from images and documents'
      },
      {
        id: 'translation',
        title: 'Translation',
        url: 'translation.html',
        icon: 'bi-translate',
        description: 'Translate text between languages'
      },
      {
        id: 'voice-input',
        title: 'Voice Input',
        url: 'voice-input.html',
        icon: 'bi-mic',
        description: 'Convert speech to text'
      },
      {
        id: 'settings',
        title: 'Settings',
        url: 'settings.html',
        icon: 'bi-gear',
        description: 'Configure preferences and options'
      }
    ]
  };

  // Shared State Management
  class SharedState {
    constructor() {
      this.storage = localStorage;
      this.prefix = 'tts_reader_';
    }

    // Save data that persists across pages
    savePageData(pageId, data) {
      try {
        this.storage.setItem(`${this.prefix}${pageId}`, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save page data:', error);
      }
    }

    // Load data when entering a page
    loadPageData(pageId) {
      try {
        const data = this.storage.getItem(`${this.prefix}${pageId}`);
        return data ? JSON.parse(data) : {};
      } catch (error) {
        console.warn('Failed to load page data:', error);
        return {};
      }
    }

    // Save user preferences
    savePreferences(preferences) {
      try {
        this.storage.setItem(`${this.prefix}preferences`, JSON.stringify(preferences));
      } catch (error) {
        console.warn('Failed to save preferences:', error);
      }
    }

    // Load user preferences
    loadPreferences() {
      try {
        const prefs = this.storage.getItem(`${this.prefix}preferences`);
        return prefs ? JSON.parse(prefs) : this.getDefaultPreferences();
      } catch (error) {
        console.warn('Failed to load preferences:', error);
        return this.getDefaultPreferences();
      }
    }

    getDefaultPreferences() {
      return {
        theme: 'professional',
        voice: null,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        language: 'en'
      };
    }
  }

  // Navigation Manager
  class NavigationManager {
    constructor() {
      this.currentPage = this.getCurrentPageId();
      this.sharedState = new SharedState();
      this.init();
    }

    getCurrentPageId() {
      const path = window.location.pathname;
      const filename = path.split('/').pop();
      
      // Map filenames to page IDs
      const pageMap = {
        'dashboard.html': 'dashboard',
        'tts.html': 'tts',
        'ocr.html': 'ocr',
        'translation.html': 'translation',
        'voice-input.html': 'voice-input',
        'settings.html': 'settings',
        'kc.html': 'all-in-one'
      };

      return pageMap[filename] || 'dashboard';
    }

    init() {
      this.createNavigation();
      this.setupEventListeners();
      this.highlightCurrentPage();
      this.initUserInfo();
    }

    createNavigation() {
      const nav = document.querySelector('.main-navigation');
      if (!nav) return;

      nav.innerHTML = `
        <div class="nav-container">
          <a href="dashboard.html" class="nav-brand">
            <img src="./assets/moon-stoners.png" alt="Moon Stoners TTS Reader" class="nav-logo">
            <span class="nav-title">TTS Reader</span>
          </a>
          
          <ul class="nav-menu" id="navMenu">
            ${navigationConfig.pages.map(page => `
              <li class="nav-item">
                <a href="${page.url}" class="nav-link" data-page="${page.id}">
                  <i class="bi ${page.icon}"></i>
                  <span>${page.title}</span>
                </a>
              </li>
            `).join('')}
          </ul>
          
          <div class="nav-actions">
            <div class="user-info">
              <span id="userGreeting">Loading...</span>
            </div>
            <button id="logoutBtn" class="btn btn-outline-light btn-sm">
              <i class="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
          
          <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      `;
    }

    setupEventListeners() {
      // Mobile menu toggle
      const navToggle = document.getElementById('navToggle');
      const navMenu = document.getElementById('navMenu');

      if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
          navToggle.classList.toggle('active');
          navMenu.classList.toggle('active');
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
          if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
          }
        });

        // Close menu when clicking on a link
        navMenu.addEventListener('click', (e) => {
          if (e.target.classList.contains('nav-link')) {
            navToggle.classList.remove('active');
            navMenu.classList.remove('active');
          }
        });
      }

      // Logout functionality
      const logoutBtn = document.getElementById('logoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', this.handleLogout.bind(this));
      }

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          navToggle?.classList.remove('active');
          navMenu?.classList.remove('active');
        }
      });
    }

    highlightCurrentPage() {
      const navLinks = document.querySelectorAll('.nav-link');
      navLinks.forEach(link => {
        const pageId = link.getAttribute('data-page');
        if (pageId === this.currentPage) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }

    initUserInfo() {
      const userGreeting = document.getElementById('userGreeting');
      if (!userGreeting) return;

      const currentUser = localStorage.getItem('kc_user');
      const userData = localStorage.getItem('kc_user_data');

      if (userData) {
        try {
          const user = JSON.parse(userData);
          const displayName = user.fullName || user.username || currentUser;
          userGreeting.textContent = displayName;

          // Add admin badge if applicable
          if (user.username === 'admin') {
            userGreeting.innerHTML = `${displayName} <span class="badge bg-primary ms-1" style="font-size: 0.7rem;">Admin</span>`;
          }
        } catch (error) {
          console.log('Could not parse user data:', error);
          userGreeting.textContent = currentUser || 'User';
        }
      } else {
        userGreeting.textContent = currentUser || 'Guest';
      }
    }

    async handleLogout(e) {
      e.preventDefault();

      const confirmLogout = confirm('Are you sure you want to logout?');
      if (!confirmLogout) return;

      const currentUser = localStorage.getItem('kc_user');

      // Show logout feedback
      const logoutBtn = e.target.closest('#logoutBtn');
      if (logoutBtn) {
        logoutBtn.disabled = true;
        logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Logging out...';
      }

      // Record logout in database if available
      if (currentUser && currentUser !== 'guest' && window.authDB) {
        try {
          await window.authDB.logoutUser(currentUser);
        } catch (error) {
          console.log('Could not record logout in database:', error);
        }
      }

      // Clear authentication data
      localStorage.removeItem('kc_logged_in');
      localStorage.removeItem('kc_user');
      localStorage.removeItem('kc_user_data');

      // Redirect to login
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    }

    // Utility method to get page configuration
    getPageConfig(pageId) {
      return navigationConfig.pages.find(page => page.id === pageId);
    }

    // Method to save current page state before navigation
    saveCurrentPageState(data) {
      this.sharedState.savePageData(this.currentPage, data);
    }

    // Method to load page state after navigation
    loadCurrentPageState() {
      return this.sharedState.loadPageData(this.currentPage);
    }
  }

  // Authentication check
  function checkAuthentication() {
    const isLoggedIn = localStorage.getItem('kc_logged_in');
    if (isLoggedIn !== '1') {
      console.log('User not authenticated, redirecting to login');
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  // Initialize navigation when DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    // Check authentication first
    if (!checkAuthentication()) return;

    // Initialize navigation
    window.navigationManager = new NavigationManager();
    window.sharedState = window.navigationManager.sharedState;

    // Make navigation config available globally
    window.navigationConfig = navigationConfig;

    console.log('Navigation system initialized for page:', window.navigationManager.currentPage);
  });

  // Export for use in other scripts
  window.SharedState = SharedState;
  window.NavigationManager = NavigationManager;

})();