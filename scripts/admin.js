"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const loginPanel = document.querySelector("#login-panel");
  const dashboardPanel = document.querySelector("#dashboard-panel");
  const loginForm = document.querySelector("#login-form");
  const passwordInput = document.querySelector("#admin-password");
  const loginMessage = document.querySelector("#login-message");
  const dashboardMessage = document.querySelector("#dashboard-message");
  const searchInput = document.querySelector("#search-input");
  const categoryFilter = document.querySelector("#category-filter");
  const tableBody = document.querySelector("#prices-table-body");
  const itemsCount = document.querySelector("#items-count");
  const categoriesCount = document.querySelector("#categories-count");
  const refreshButton = document.querySelector("#refresh-button");
  const logoutButton = document.querySelector("#logout-button");

  let allItems = [];
  let isLoading = false;

  function setMessage(element, message, kind = "info") {
    element.textContent = message;
    element.dataset.kind = kind;
  }

  function showLogin(message = "") {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    setMessage(loginMessage, message, message ? "error" : "info");
  }

  function showDashboard() {
    loginPanel.hidden = true;
    dashboardPanel.hidden = false;
    setMessage(loginMessage, "");
  }

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    if (!response.ok) {
      const error = new Error(
        payload.error || `درخواست ناموفق بود (${response.status}).`,
      );
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  function addCategoryOptions(items) {
    const previousValue = categoryFilter.value || "all";
    const uniqueCategories = new Map();

    items.forEach((item) => {
      uniqueCategories.set(item.categoryId, item.categoryName);
    });

    categoryFilter.replaceChildren();

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "همه دسته‌بندی‌ها";
    categoryFilter.append(allOption);

    [...uniqueCategories.entries()].forEach(([id, name]) => {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = name;
      categoryFilter.append(option);
    });

    categoryFilter.value = uniqueCategories.has(previousValue)
      ? previousValue
      : "all";
  }

  function createCell(text, className = "") {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text || "—";
    return cell;
  }

  function createPriceRow(item) {
    const row = document.createElement("tr");
    row.dataset.itemId = item.id;

    const productCell = createCell(item.productName, "admin-table__product");
    const categoryCell = createCell(item.categoryName);
    const variantCell = createCell(item.variantName || "—");

    const priceCell = document.createElement("td");
    priceCell.className = "admin-table__price-cell";

    const priceLabel = document.createElement("label");
    priceLabel.className = "visually-hidden";
    priceLabel.htmlFor = `price-${item.id}`;
    priceLabel.textContent = `قیمت ${item.productName}${item.variantName ? ` - ${item.variantName}` : ""}`;

    const priceInput = document.createElement("input");
    priceInput.className = "admin-price-input";
    priceInput.id = `price-${item.id}`;
    priceInput.name = `price-${item.id}`;
    priceInput.type = "text";
    priceInput.inputMode = "numeric";
    priceInput.autocomplete = "off";
    priceInput.maxLength = 30;
    priceInput.value = item.value;
    priceInput.setAttribute("aria-label", priceLabel.textContent);

    priceCell.append(priceLabel, priceInput);

    const actionCell = document.createElement("td");
    actionCell.className = "admin-table__action-cell";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "admin-button admin-button--save";
    saveButton.textContent = "ذخیره";
    saveButton.addEventListener("click", async () => {
      const nextValue = priceInput.value.trim();
      saveButton.disabled = true;
      saveButton.textContent = "در حال ذخیره…";
      priceInput.removeAttribute("aria-invalid");

      try {
        const payload = await requestJson(
          `/api/admin/menu-prices/${encodeURIComponent(item.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: nextValue }),
          },
        );

        const updatedItem = payload.item;
        allItems = allItems.map((current) =>
          current.id === updatedItem.id ? updatedItem : current,
        );
        priceInput.value = updatedItem.value;
        setMessage(
          dashboardMessage,
          `قیمت «${updatedItem.productName}» ذخیره شد.`,
          "success",
        );
      } catch (error) {
        if (error.status === 401) {
          showLogin("نشست مدیر منقضی شده است؛ دوباره وارد شو.");
        } else {
          priceInput.setAttribute("aria-invalid", "true");
          setMessage(
            dashboardMessage,
            error.message || "ذخیره قیمت انجام نشد.",
            "error",
          );
        }
      } finally {
        saveButton.disabled = false;
        saveButton.textContent = "ذخیره";
      }
    });

    actionCell.append(saveButton);
    row.append(productCell, categoryCell, variantCell, priceCell, actionCell);
    return row;
  }

  function renderItems() {
    const searchTerm = searchInput.value.trim().toLocaleLowerCase("fa");
    const selectedCategory = categoryFilter.value;

    const visibleItems = allItems.filter((item) => {
      const categoryMatches =
        selectedCategory === "all" || item.categoryId === selectedCategory;
      const haystack =
        `${item.productName} ${item.categoryName} ${item.variantName || ""}`.toLocaleLowerCase(
          "fa",
        );
      return categoryMatches && haystack.includes(searchTerm);
    });

    tableBody.replaceChildren();

    if (visibleItems.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "admin-table__empty";
      cell.textContent = "محصولی با این مشخصات پیدا نشد.";
      row.append(cell);
      tableBody.append(row);
      return;
    }

    const fragment = document.createDocumentFragment();
    visibleItems.forEach((item) => fragment.append(createPriceRow(item)));
    tableBody.append(fragment);
  }

  async function loadItems() {
    if (isLoading) return;
    isLoading = true;
    refreshButton.disabled = true;
    setMessage(dashboardMessage, "در حال دریافت قیمت‌ها…");

    try {
      const payload = await requestJson("/api/menu-prices");
      allItems = Array.isArray(payload.items) ? payload.items : [];
      addCategoryOptions(allItems);
      itemsCount.textContent = String(allItems.length);
      categoriesCount.textContent = String(
        new Set(allItems.map((item) => item.categoryId)).size,
      );
      renderItems();
      setMessage(dashboardMessage, "قیمت‌ها دریافت شدند.", "success");
    } catch (error) {
      if (error.status === 401) {
        showLogin("نشست مدیر منقضی شده است؛ دوباره وارد شو.");
      } else {
        setMessage(
          dashboardMessage,
          error.message || "دریافت قیمت‌ها انجام نشد.",
          "error",
        );
      }
    } finally {
      isLoading = false;
      refreshButton.disabled = false;
    }
  }

  async function checkSession() {
    try {
      await requestJson("/api/admin/session");
      showDashboard();
      await loadItems();
    } catch (error) {
      if (error.status === 503) {
        showLogin(
          "ورود مدیر هنوز تنظیم نشده است. فایل .env را مطابق .env.example بساز و سرور را دوباره اجرا کن.",
        );
      } else {
        showLogin();
      }
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = passwordInput.value;
    const submitButton = loginForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "در حال ورود…";

    try {
      await requestJson("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      passwordInput.value = "";
      showDashboard();
      await loadItems();
    } catch (error) {
      setMessage(loginMessage, error.message || "ورود انجام نشد.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML =
        'ورود به پنل <span aria-hidden="true">↗&#xfe0e;</span>';
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await requestJson("/api/admin/logout", { method: "POST" });
      allItems = [];
      tableBody.replaceChildren();
      showLogin("از پنل خارج شدی.");
    } catch (error) {
      setMessage(dashboardMessage, error.message || "خروج انجام نشد.", "error");
    } finally {
      logoutButton.disabled = false;
    }
  });

  refreshButton.addEventListener("click", loadItems);
  searchInput.addEventListener("input", renderItems);
  categoryFilter.addEventListener("change", renderItems);

  checkSession();
});
