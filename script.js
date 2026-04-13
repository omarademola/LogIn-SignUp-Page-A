// ============================================
// VALIDATION ENGINE & UTILITIES
// ============================================

class ValidationEngine {
  constructor() {
    this.validators = {
      email: (value) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(value);
      },
      password: (value) => value.length >= 8,
      required: (value) => value.trim().length > 0,
      match: (value, targetSelector) => {
        const targetInput = document.querySelector(targetSelector);
        return value === targetInput?.value;
      },
      optional: () => true,
    };
  }

  validateField(input) {
    const validationType = input.dataset.validate;
    if (!validationType) return true;

    let isValid = true;
    const value = input.value;

    if (validationType === "match") {
      const targetSelector = `#${input.dataset.matchTarget}`;
      isValid = this.validators.match(value, targetSelector);
    } else if (this.validators[validationType]) {
      isValid = this.validators[validationType](value);
    }

    return isValid;
  }

  markFieldError(field, errorMessage) {
    const errorEl = field.querySelector(".field-error");
    if (errorEl) {
      errorEl.textContent = errorMessage;
      errorEl.setAttribute("role", "alert");
    }
    field.classList.add("error");
    field.classList.remove("success");

    const input = field.querySelector("input");
    if (input) {
      input.setAttribute("aria-invalid", "true");
      if (errorEl?.id) {
        input.setAttribute("aria-describedby", errorEl.id);
      }
    }
  }

  markFieldSuccess(field) {
    const errorEl = field.querySelector(".field-error");
    if (errorEl) {
      errorEl.textContent = "";
    }
    field.classList.remove("error");
    field.classList.add("success");

    const input = field.querySelector("input");
    if (input) {
      input.setAttribute("aria-invalid", "false");
    }
  }

  clearFieldState(field) {
    const errorEl = field.querySelector(".field-error");
    if (errorEl) {
      errorEl.textContent = "";
    }
    field.classList.remove("error", "success");

    const input = field.querySelector("input");
    if (input) {
      input.setAttribute("aria-invalid", "false");
    }
  }

  validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll("input[data-validate]");

    inputs.forEach((input) => {
      const field = input.closest(".field");
      if (!field) return;

      if (!this.validateField(input)) {
        const message = input.dataset.validateMessage || "Invalid input";
        this.markFieldError(field, message);
        isValid = false;
      } else {
        this.markFieldSuccess(field);
      }
    });

    return isValid;
  }
}

// ============================================
// PASSWORD STRENGTH INDICATOR
// ============================================

class PasswordStrength {
  constructor() {
    this.init();
  }

  init() {
    const passwordInputs = document.querySelectorAll(
      'input[type="password"][id$="-pass"]',
    );
    passwordInputs.forEach((input) => {
      const signupField = input.closest("#signup");
      if (signupField && input.id === "s-pass") {
        input.addEventListener("focus", () =>
          this.showStrengthIndicator(input),
        );
        input.addEventListener("input", () => this.updateStrength(input));
        input.addEventListener("blur", () => this.hideStrengthIndicator(input));
      }
    });
  }

  calculateStrength(value) {
    if (value.length < 8) return { level: "weak", text: "Weak" };

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*]/.test(value);

    const strengthScore = [
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecial,
    ].filter(Boolean).length;

    if (strengthScore <= 1) return { level: "weak", text: "Weak" };
    if (strengthScore <= 2) return { level: "medium", text: "Medium" };
    return { level: "strong", text: "Strong" };
  }

  updateStrength(input) {
    const strength = this.calculateStrength(input.value);
    const strengthEl = document.getElementById(`${input.id}-strength`);

    if (strengthEl) {
      strengthEl.classList.remove("weak", "medium", "strong");
      strengthEl.classList.add(strength.level);
      const textEl = strengthEl.querySelector(".strength-text");
      if (textEl) {
        textEl.textContent = strength.text;
      }
    }
  }

  showStrengthIndicator(input) {
    const strengthEl = document.getElementById(`${input.id}-strength`);
    if (strengthEl && input.value) {
      strengthEl.classList.add("active");
      this.updateStrength(input);
    }
  }

  hideStrengthIndicator(input) {
    const strengthEl = document.getElementById(`${input.id}-strength`);
    if (strengthEl && !input.value) {
      strengthEl.classList.remove("active");
    }
  }
}

// ============================================
// PASSWORD TOGGLE (SHOW/HIDE)
// ============================================

class PasswordToggle {
  constructor() {
    this.init();
  }

  init() {
    const toggleButtons = document.querySelectorAll(".toggle-password");
    toggleButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggle(button);
      });
    });
  }

  toggle(button) {
    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);

    if (!input) return;

    const isPasswordType = input.type === "password";
    input.type = isPasswordType ? "text" : "password";

    button.classList.toggle("active", !isPasswordType);
    button.setAttribute(
      "aria-label",
      isPasswordType ? "Hide password" : "Show password",
    );
  }
}

// ============================================
// REMEMBER ME FUNCTIONALITY
// ============================================

class RememberMe {
  constructor() {
    this.storageKey = "omabell_remember_me";
    this.expireKey = "omabell_remember_expire";
    this.init();
  }

  init() {
    this.loadEmail();
    const loginForm = document.getElementById("login");
    if (loginForm) {
      loginForm.addEventListener("submit", () => this.handleSubmit());
    }
  }

  handleSubmit() {
    const emailInput = document.querySelector("#l-email");
    const rememberCheckbox = document.querySelector("#remember-me");

    if (rememberCheckbox?.checked && emailInput?.value) {
      this.saveEmail(emailInput.value);
    } else {
      this.clearEmail();
    }
  }

  saveEmail(email) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);

    localStorage.setItem(this.storageKey, email);
    localStorage.setItem(this.expireKey, expires.getTime());
  }

  loadEmail() {
    const stored = localStorage.getItem(this.storageKey);
    const expireTime = localStorage.getItem(this.expireKey);

    if (!stored || !expireTime) return;

    if (new Date().getTime() > parseInt(expireTime)) {
      this.clearEmail();
      return;
    }

    const emailInput = document.querySelector("#l-email");
    const rememberCheckbox = document.querySelector("#remember-me");

    if (emailInput) emailInput.value = stored;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }

  clearEmail() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.expireKey);
    const rememberCheckbox = document.querySelector("#remember-me");
    if (rememberCheckbox) rememberCheckbox.checked = false;
  }
}

// ============================================
// FORM SUBMISSION HANDLER
// ============================================

class FormSubmissionHandler {
  constructor(validationEngine) {
    this.validationEngine = validationEngine;
    this.init();
  }

  init() {
    const forms = document.querySelectorAll("form");
    forms.forEach((form) => {
      form.addEventListener("submit", (e) => this.handleSubmit(e));
    });
  }

  handleSubmit(e) {
    e.preventDefault();
    const form = e.target;

    if (!this.validationEngine.validateForm(form)) {
      return;
    }

    const button = form.querySelector('.btn[type="submit"]');
    if (button) {
      this.setLoadingState(button);
      this.simulateAsync(() => {
        this.clearLoadingState(button);
        this.showSuccessState(button);
      });
    }
  }

  setLoadingState(button) {
    button.classList.add("loading");
    button.disabled = true;
    const form = button.closest("form");
    if (form) {
      const inputs = form.querySelectorAll("input");
      inputs.forEach((input) => {
        input.disabled = true;
      });
    }
  }

  clearLoadingState(button) {
    button.classList.remove("loading");
    button.disabled = false;
    const form = button.closest("form");
    if (form) {
      const inputs = form.querySelectorAll("input");
      inputs.forEach((input) => {
        input.disabled = false;
      });
    }
  }

  showSuccessState(button) {
    const originalText = button.dataset.originalText;
    button.classList.add("loading");
    button.innerHTML = "✓";
    button.style.background = "#2d7a4f";

    setTimeout(() => {
      button.classList.remove("loading");
      button.innerHTML = `<span class="btn-text">${originalText}</span><span class="btn-spinner" style="display: none;"><svg class="spinner" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg></span>`;
      button.style.background = "";
    }, 2000);
  }

  simulateAsync(callback) {
    setTimeout(() => {
      if (callback) callback();
    }, 2000);
  }
}

// ============================================
// MODAL FUNCTIONALITY
// ============================================

class Modal {
  constructor() {
    this.currentModal = null;
    this.init();
  }

  init() {
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) {
        const modal = e.target.closest(".modal");
        if (modal) this.close(modal.id);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.currentModal) {
        this.closeCurrentModal();
      }
    });
  }

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add("active");
    this.currentModal = modal;
    this.trapFocus(modal);

    const firstInput = modal.querySelector("input");
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      if (this.currentModal === modal) {
        this.currentModal = null;
      }
    }
  }

  closeCurrentModal() {
    if (this.currentModal) {
      this.close(this.currentModal.id);
    }
  }

  trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
      "input, button, [tabindex]:not([tabindex='-1'])",
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    modal.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    });
  }
}

// ============================================
// THEME TOGGLE (DARK MODE)
// ============================================

class ThemeToggle {
  constructor() {
    this.themeKey = "omabell_theme";
    this.init();
  }

  init() {
    const button = document.querySelector(".theme-toggle");
    if (button) {
      button.addEventListener("click", () => this.toggle());
    }

    // Load saved theme or use system preference
    this.loadTheme();
  }

  toggle() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    this.setTheme(newTheme);
  }

  setTheme(theme) {
    const html = document.documentElement;
    if (theme === "dark") {
      html.setAttribute("data-theme", "dark");
      localStorage.setItem(this.themeKey, "dark");
    } else {
      html.removeAttribute("data-theme");
      localStorage.removeItem(this.themeKey);
    }
  }

  loadTheme() {
    const saved = localStorage.getItem(this.themeKey);

    if (saved === "dark") {
      this.setTheme("dark");
    } else if (
      !saved &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      this.setTheme("dark");
    }
  }
}

// ============================================
// TAB SWITCHING
// ============================================

class TabSwitcher {
  constructor() {
    this.init();
  }

  init() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab));
    });
  }

  switchTab(tab) {
    const targetId = tab.dataset.target;

    // Update tab states
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");

    // Update form visibility
    document.querySelectorAll(".form").forEach((form) => {
      form.classList.remove("active");
    });
    const targetForm = document.getElementById(targetId);
    if (targetForm) {
      targetForm.classList.add("active");
    }
  }
}

// ============================================
// REAL-TIME VALIDATION
// ============================================

function initRealTimeValidation(validationEngine) {
  const inputs = document.querySelectorAll("input[data-validate]");
  inputs.forEach((input) => {
    input.addEventListener("blur", () => {
      const field = input.closest(".field");
      if (!field) return;

      if (!validationEngine.validateField(input)) {
        const message = input.dataset.validateMessage || "Invalid input";
        validationEngine.markFieldError(field, message);
      } else {
        validationEngine.markFieldSuccess(field);
      }
    });

    // Re-validate on input if field is already in error state
    input.addEventListener("input", () => {
      const field = input.closest(".field");
      if (!field) return;

      if (field.classList.contains("error")) {
        if (validationEngine.validateField(input)) {
          validationEngine.clearFieldState(field);
        }
      }
    });
  });
}

// ============================================
// GLOBAL MODAL FUNCTIONS
// ============================================

let globalModal = null;

function openModal(modalId) {
  if (!globalModal) {
    globalModal = new Modal();
  }
  globalModal.open(modalId);
}

function closeModal(modalId) {
  if (globalModal) {
    globalModal.close(modalId);
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const validationEngine = new ValidationEngine();

  // Initialize all modules
  new TabSwitcher();
  new PasswordToggle();
  new PasswordStrength();
  new RememberMe();
  new FormSubmissionHandler(validationEngine);
  new ThemeToggle();
  globalModal = new Modal();

  // Initialize real-time validation
  initRealTimeValidation(validationEngine);
});
