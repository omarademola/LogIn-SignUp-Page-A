// CONFIGURATION & CONSTANTS

const CONFIG = {
  ASYNC_TIMEOUT: 2000,
  SUCCESS_COLOR: "#2d7a4f",
  REMEMBER_EXPIRE_DAYS: 30,
  STORAGE_PREFIX: "omabell",
};

// UTILITY CLASSES

class DOMHelper {
  static getField(input) {
    return input.closest(".field");
  }

  static getFieldError(field) {
    return field?.querySelector(".field-error");
  }

  static getFieldInput(field) {
    return field?.querySelector("input");
  }

  static getFormInputs(form) {
    return form.querySelectorAll("input[data-validate]");
  }

  static toggleFormInputs(form, disabled) {
    this.getFormInputs(form).forEach((input) => {
      input.disabled = disabled;
    });
  }
}

class StorageManager {
  constructor(keyPrefix) {
    this.keyPrefix = keyPrefix;
  }

  setItem(key, value, expirationDays = null) {
    const fullKey = `${this.keyPrefix}_${key}`;
    localStorage.setItem(fullKey, value);

    if (expirationDays) {
      const expires = new Date();
      expires.setDate(expires.getDate() + expirationDays);
      localStorage.setItem(`${fullKey}_expire`, expires.getTime());
    }
  }

  getItem(key) {
    const fullKey = `${this.keyPrefix}_${key}`;
    const expireKey = `${fullKey}_expire`;
    const expireTime = localStorage.getItem(expireKey);

    if (expireTime && new Date().getTime() > parseInt(expireTime)) {
      this.removeItem(key);
      return null;
    }

    return localStorage.getItem(fullKey);
  }

  removeItem(key) {
    const fullKey = `${this.keyPrefix}_${key}`;
    localStorage.removeItem(fullKey);
    localStorage.removeItem(`${fullKey}_expire`);
  }
}

// VALIDATION ENGINE

class ValidationEngine {
  constructor() {
    this.validators = {
      email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      password: (value) => value.length >= 8,
      required: (value) => value.trim().length > 0,
      match: (value, targetId) => {
        const targetInput = document.getElementById(targetId);
        return value === targetInput?.value;
      },
      optional: () => true,
    };
  }

  validateField(input) {
    const validationType = input.dataset.validate;
    if (!validationType) return true;

    const value = input.value;

    if (validationType === "match") {
      const targetId = input.dataset.matchTarget;
      return this.validators.match(value, targetId);
    }

    return this.validators[validationType]?.(value) ?? true;
  }

  setFieldState(field, state) {
    const input = DOMHelper.getFieldInput(field);
    const errorEl = DOMHelper.getFieldError(field);

    field.classList.remove("error", "success");

    if (state === "error") {
      field.classList.add("error");
      input?.setAttribute("aria-invalid", "true");
    } else if (state === "success") {
      field.classList.add("success");
      input?.setAttribute("aria-invalid", "false");
    }

    if (errorEl) {
      errorEl.textContent =
        typeof state === "object" ? state.message || "" : "";
    }
  }

  validateForm(form) {
    let isValid = true;
    DOMHelper.getFormInputs(form).forEach((input) => {
      const field = DOMHelper.getField(input);
      if (!field) return;

      if (!this.validateField(input)) {
        const message = input.dataset.validateMessage || "Invalid input";
        this.setFieldState(field, { error: true, message });
        isValid = false;
      } else {
        this.setFieldState(field, "success");
      }
    });

    return isValid;
  }
}

// PASSWORD STRENGTH

class PasswordStrength {
  constructor() {
    this.init();
  }

  init() {
    document
      .querySelectorAll('input[type="password"][id$="-pass"]')
      .forEach((input) => {
        const inSignup = input.closest("#signup");
        if (inSignup && input.id === "s-pass") {
          input.addEventListener("focus", () =>
            this.showStrengthIndicator(input),
          );
          input.addEventListener("input", () => this.updateStrength(input));
          input.addEventListener("blur", () =>
            this.hideStrengthIndicator(input),
          );
        }
      });
  }

  calculateStrength(value) {
    if (value.length < 8) return { level: "weak", text: "Weak" };

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%^&*]/.test(value);

    const score = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(
      Boolean,
    ).length;

    if (score <= 1) return { level: "weak", text: "Weak" };
    if (score <= 2) return { level: "medium", text: "Medium" };
    return { level: "strong", text: "Strong" };
  }

  updateStrength(input) {
    const strength = this.calculateStrength(input.value);
    const strengthEl = document.getElementById(`${input.id}-strength`);

    if (strengthEl) {
      strengthEl.classList.remove("weak", "medium", "strong");
      strengthEl.classList.add(strength.level);
      const textEl = strengthEl.querySelector(".strength-text");
      if (textEl) textEl.textContent = strength.text;
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

// PASSWORD TOGGLE

class PasswordToggle {
  constructor() {
    this.init();
  }

  init() {
    // Handle explicit toggle buttons
    document.querySelectorAll(".toggle-password").forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        this.toggle(button);
      });
    });

    // Auto-create toggles for data-toggle-password inputs
    document
      .querySelectorAll("input[data-toggle-password]")
      .forEach((input) => {
        const wrapper = document.createElement("div");
        wrapper.className = "password-wrapper";

        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);

        const button = document.createElement("button");
        button.type = "button";
        button.className = "toggle-password";
        button.setAttribute("aria-label", "Show password");
        button.innerHTML = `
        <svg class="eye-closed"><use href="#icon-eye-closed"/></svg>
        <svg class="eye-open"><use href="#icon-eye-open"/></svg>
      `;

        wrapper.appendChild(button);
        button.addEventListener("click", (e) => {
          e.preventDefault();
          this.toggle(button);
        });
      });
  }

  toggle(button) {
    const input =
      button.closest(".password-wrapper")?.querySelector("input") ||
      document.getElementById(button.dataset.target);

    if (!input) return;

    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";

    button.classList.toggle("active", !isPassword);
    button.setAttribute(
      "aria-label",
      isPassword ? "Hide password" : "Show password",
    );
  }
}

// REMEMBER ME

class RememberMe {
  constructor() {
    this.storage = new StorageManager(CONFIG.STORAGE_PREFIX);
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
      this.storage.setItem(
        "email",
        emailInput.value,
        CONFIG.REMEMBER_EXPIRE_DAYS,
      );
    } else {
      this.storage.removeItem("email");
    }
  }

  loadEmail() {
    const stored = this.storage.getItem("email");
    const emailInput = document.querySelector("#l-email");
    const rememberCheckbox = document.querySelector("#remember-me");

    if (stored && emailInput) {
      emailInput.value = stored;
      if (rememberCheckbox) rememberCheckbox.checked = true;
    }
  }
}

// FORM SUBMISSION

class FormSubmissionHandler {
  constructor(validationEngine) {
    this.validationEngine = validationEngine;
    this.init();
  }

  init() {
    document.querySelectorAll("form").forEach((form) => {
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
      this.setButtonLoading(button, true);
      setTimeout(() => {
        this.showSuccessState(button);
      }, CONFIG.ASYNC_TIMEOUT);
    }
  }

  setButtonLoading(button, loading) {
    button.classList.toggle("loading", loading);
    button.disabled = loading;

    const form = button.closest("form");
    if (form) {
      DOMHelper.toggleFormInputs(form, loading);
    }
  }

  showSuccessState(button) {
    const originalText = button.dataset.originalText;
    button.textContent = "✓";
    button.style.background = CONFIG.SUCCESS_COLOR;

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("loading");
      button.style.background = "";
      this.setButtonLoading(button, false);
    }, CONFIG.ASYNC_TIMEOUT);
  }
}

// MODAL

class Modal {
  constructor() {
    this.currentModal = null;
    this.focusTrapListeners = new WeakMap();
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
        this.close(this.currentModal.id);
      }
    });
  }

  open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal || this.currentModal?.id === modalId) return;

    modal.classList.add("active");
    this.currentModal = modal;
    this.setupFocusTrap(modal);

    const firstInput = modal.querySelector("input");
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("active");
    this.cleanupFocusTrap(modal);

    if (this.currentModal?.id === modalId) {
      this.currentModal = null;
    }
  }

  setupFocusTrap(modal) {
    if (this.focusTrapListeners.has(modal)) return;

    const focusableElements = modal.querySelectorAll(
      "input, button, [tabindex]:not([tabindex='-1'])",
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const listener = (e) => {
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
    };

    modal.addEventListener("keydown", listener);
    this.focusTrapListeners.set(modal, listener);
  }

  cleanupFocusTrap(modal) {
    const listener = this.focusTrapListeners.get(modal);
    if (listener) {
      modal.removeEventListener("keydown", listener);
      this.focusTrapListeners.delete(modal);
    }
  }
}

// THEME TOGGLE

class ThemeToggle {
  constructor() {
    this.storage = new StorageManager(CONFIG.STORAGE_PREFIX);
    this.init();
  }

  init() {
    const button = document.querySelector(".theme-toggle");
    if (button) {
      button.addEventListener("click", () => this.toggle());
    }
    this.loadTheme();
  }

  toggle() {
    const html = document.documentElement;
    const isDark = html.getAttribute("data-theme") === "dark";
    this.setTheme(isDark ? "light" : "dark");
  }

  setTheme(theme) {
    const html = document.documentElement;
    if (theme === "dark") {
      html.setAttribute("data-theme", "dark");
      this.storage.setItem("theme", "dark");
    } else {
      html.removeAttribute("data-theme");
      this.storage.removeItem("theme");
    }
  }

  loadTheme() {
    const saved = this.storage.getItem("theme");

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

// TAB SWITCHER

class TabSwitcher {
  constructor() {
    this.init();
  }

  init() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => this.switchTab(tab));
    });
  }

  switchTab(tab) {
    const targetId = tab.dataset.target;

    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });

    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");

    document.querySelectorAll(".form").forEach((form) => {
      form.classList.remove("active");
    });

    const targetForm = document.getElementById(targetId);
    if (targetForm) {
      targetForm.classList.add("active");
    }
  }
}

// AUTO-GENERATE ERROR SPANS

function initializeFieldErrors() {
  document.querySelectorAll(".field").forEach((field) => {
    const input = field.querySelector("input");
    if (!input || field.querySelector(".field-error")) return;

    const errorSpan = document.createElement("span");
    errorSpan.className = "field-error";
    errorSpan.setAttribute("role", "alert");
    errorSpan.id = `${input.id}-error`;
    field.appendChild(errorSpan);
  });
}

// REAL-TIME VALIDATION

function initRealTimeValidation(validationEngine) {
  document.querySelectorAll("input[data-validate]").forEach((input) => {
    input.addEventListener("blur", () => {
      const field = DOMHelper.getField(input);
      if (!field) return;

      if (!validationEngine.validateField(input)) {
        const message = input.dataset.validateMessage || "Invalid input";
        validationEngine.setFieldState(field, { error: true, message });
      } else {
        validationEngine.setFieldState(field, "success");
      }
    });

    input.addEventListener("input", () => {
      const field = DOMHelper.getField(input);
      if (!field?.classList.contains("error")) return;

      if (validationEngine.validateField(input)) {
        validationEngine.setFieldState(field, "success");
      }
    });
  });
}

// GLOBAL MODAL FUNCTIONS

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

// INITIALIZATION

document.addEventListener("DOMContentLoaded", () => {
  initializeFieldErrors();

  const validationEngine = new ValidationEngine();

  new TabSwitcher();
  new PasswordToggle();
  new PasswordStrength();
  new RememberMe();
  new FormSubmissionHandler(validationEngine);
  new ThemeToggle();
  globalModal = new Modal();

  initRealTimeValidation(validationEngine);
});
