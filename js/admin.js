"use strict";

const ADMIN_SESSION_KEY = "nekopaws_admin_session";
const ADMIN_DRAFT_KEY = "nekopaws_admin_products_draft";
// Nur Komfortschutz. Bei einer öffentlichen GitHub-Pages-Seite ist dieses Passwort kein echter Sicherheitsschutz.
const ADMIN_PASSWORD = "NekoPaws3D-Admin";

let adminProducts = loadAdminDraft();

function cloneProducts(list) {
  return JSON.parse(JSON.stringify(list));
}

function loadAdminDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_DRAFT_KEY));
    return Array.isArray(saved) ? saved : cloneProducts(products);
  } catch {
    return cloneProducts(products);
  }
}

function saveAdminDraft() {
  localStorage.setItem(ADMIN_DRAFT_KEY, JSON.stringify(adminProducts));
}

function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "1";
}

function adminLogin() {
  const password = document.getElementById("admin-password").value;
  const status = document.getElementById("admin-login-status");
  if (password !== ADMIN_PASSWORD) {
    status.textContent = "Passwort ist falsch.";
    status.className = "form-status error";
    return;
  }
  sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
  showAdminApp();
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  location.reload();
}

function showAdminApp() {
  document.getElementById("admin-login").classList.add("hidden");
  document.getElementById("admin-app").classList.remove("hidden");
  renderAdminProducts();
}

function escapeAdminHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function nextProductId() {
  return adminProducts.reduce((max, product) => Math.max(max, Number(product.id) || 0), 0) + 1;
}

function normalizeImages(text) {
  return text.split(/\r?\n|,/).map(path => path.trim()).filter(Boolean);
}

function saveAdminProduct(event) {
  event.preventDefault();
  const idValue = document.getElementById("admin-product-id").value;
  const images = normalizeImages(document.getElementById("admin-images").value);
  if (!images.length) {
    alert("Bitte mindestens einen Bildpfad eintragen.");
    return;
  }

  const product = {
    id: idValue ? Number(idValue) : nextProductId(),
    name: document.getElementById("admin-name").value.trim(),
    category: document.getElementById("admin-category").value,
    price: Number(document.getElementById("admin-price").value),
    image: images[0],
    images,
    description: document.getElementById("admin-description").value.trim(),
    customizable: document.getElementById("admin-customizable").checked,
    active: document.getElementById("admin-active").checked
  };

  if (!product.name || !Number.isFinite(product.price) || product.price < 0 || !product.description) {
    alert("Bitte alle Pflichtfelder korrekt ausfüllen.");
    return;
  }

  const index = adminProducts.findIndex(entry => Number(entry.id) === product.id);
  if (index >= 0) adminProducts[index] = product;
  else adminProducts.push(product);
  adminProducts.sort((a, b) => Number(a.id) - Number(b.id));
  saveAdminDraft();
  clearProductForm();
  renderAdminProducts();
}

function editAdminProduct(id) {
  const product = adminProducts.find(entry => Number(entry.id) === Number(id));
  if (!product) return;
  document.getElementById("product-form-title").textContent = `Produkt bearbeiten: ${product.name}`;
  document.getElementById("admin-product-id").value = product.id;
  document.getElementById("admin-name").value = product.name;
  document.getElementById("admin-category").value = product.category;
  document.getElementById("admin-price").value = Number(product.price).toFixed(2);
  document.getElementById("admin-description").value = product.description || "";
  document.getElementById("admin-images").value = (product.images?.length ? product.images : [product.image]).join("\n");
  document.getElementById("admin-customizable").checked = Boolean(product.customizable);
  document.getElementById("admin-active").checked = product.active !== false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function deleteAdminProduct(id) {
  const product = adminProducts.find(entry => Number(entry.id) === Number(id));
  if (!product || !confirm(`Produkt „${product.name}“ wirklich löschen?`)) return;
  adminProducts = adminProducts.filter(entry => Number(entry.id) !== Number(id));
  saveAdminDraft();
  clearProductForm();
  renderAdminProducts();
}

function duplicateAdminProduct(id) {
  const product = adminProducts.find(entry => Number(entry.id) === Number(id));
  if (!product) return;
  const copy = cloneProducts([product])[0];
  copy.id = nextProductId();
  copy.name = `${copy.name} – Kopie`;
  adminProducts.push(copy);
  saveAdminDraft();
  renderAdminProducts();
}

function toggleAdminProduct(id) {
  const product = adminProducts.find(entry => Number(entry.id) === Number(id));
  if (!product) return;
  product.active = product.active === false;
  saveAdminDraft();
  renderAdminProducts();
}

function clearProductForm() {
  document.getElementById("admin-product-form").reset();
  document.getElementById("admin-product-id").value = "";
  document.getElementById("admin-active").checked = true;
  document.getElementById("product-form-title").textContent = "Neues Produkt";
}

function resetAdminDraft() {
  if (!confirm("Alle nicht veröffentlichten Änderungen verwerfen und die Produkte aus products.js neu laden?")) return;
  adminProducts = cloneProducts(products);
  localStorage.removeItem(ADMIN_DRAFT_KEY);
  clearProductForm();
  renderAdminProducts();
}

function renderAdminProducts() {
  const container = document.getElementById("admin-product-list");
  if (!container) return;
  const query = (document.getElementById("admin-search")?.value || "").toLowerCase().trim();
  const list = adminProducts.filter(product => `${product.name} ${product.category} ${product.description || ""}`.toLowerCase().includes(query));
  container.innerHTML = list.length ? list.map(product => {
    const image = product.images?.[0] || product.image || "";
    return `<article class="admin-product-row ${product.active === false ? "is-inactive" : ""}">
      <img src="${escapeAdminHtml(image)}" alt="">
      <div class="admin-product-info">
        <h3>${escapeAdminHtml(product.name)}</h3>
        <p><span class="badge">${escapeAdminHtml(product.category)}</span> <b>${Number(product.price).toFixed(2)} €</b></p>
        <small>${product.active === false ? "Im Shop ausgeblendet" : "Im Shop sichtbar"} · ID ${product.id} · ${(product.images || []).length || 1} Bild(er)</small>
      </div>
      <div class="admin-row-actions">
        <button class="outline-btn" type="button" onclick="editAdminProduct(${product.id})">Bearbeiten</button>
        <button class="outline-btn" type="button" onclick="duplicateAdminProduct(${product.id})">Duplizieren</button>
        <button class="outline-btn" type="button" onclick="toggleAdminProduct(${product.id})">${product.active === false ? "Einblenden" : "Ausblenden"}</button>
        <button class="outline-btn danger" type="button" onclick="deleteAdminProduct(${product.id})">Löschen</button>
      </div>
    </article>`;
  }).join("") : '<p class="muted">Keine Produkte gefunden.</p>';
}

function serializeJs(value, indent = 0) {
  return JSON.stringify(value, null, 2).replace(/"([^"\\]+)":/g, "$1:");
}

function downloadProductsFile() {
  saveAdminDraft();
  const content = `"use strict";\n\nconst products = ${serializeJs(adminProducts)};\n\nconst shippingMethods = ${serializeJs(shippingMethods)};\n\n// Ausschließlich hier festgelegte Codes funktionieren.\nconst couponCodes = ${serializeJs(couponCodes)};\n`;
  const blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "products.js";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("DOMContentLoaded", () => {
  if (isAdminLoggedIn()) showAdminApp();
  document.getElementById("admin-password")?.addEventListener("keydown", event => {
    if (event.key === "Enter") adminLogin();
  });
});
