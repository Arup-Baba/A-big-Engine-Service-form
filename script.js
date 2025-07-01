// ===============================
// A Big Engine – Final script.js
// Fully Integrated Service Form (User Input Amounts)
// ===============================

// CONFIGURATION: Replace with actual Google Apps Script endpoints
const DRIVE_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbxzHCTy9Hpr5T2RLu3ProCQLnrLWqihglwqGVdHXc8G7n2M89U9Yb_23WAFoFBYVSJV/exec";
const SHEET_SUBMIT_URL = "https://script.google.com/macros/s/AKfycbwQaKLnqIvwABX_H00Z9fC8oDeAiBnm-6XrNOwNSiYcZr5BdAC34FtOxO1rWM6gllv-7Q/exec";
const $ = id => document.getElementById(id);

// GLOBAL STATE
let selectedPages = [];
let currentIndex = 0;
let customerInfo = {};

// SERVICE PRICES - REMOVED: User will now input amounts directly for carwash, tyre, battery.
// Add-on prices remain constant as they are based on quantity.

// INITIALIZE
window.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initQtyControls(); // Quantity controls will still function, but won't auto-calculate total amounts for main services
  initAddons();
  initDynamicFields(); // Requires missing HTML divs to be added
  loadDraft("page-customer");
});

// NAVIGATION
function initNavigation() {
  $("btnToServices").onclick = () => {
    if (!validateCustomer()) return;
    saveCustomerInfo();
    showPage("page-select");
  };
  $("btnStartFlow").onclick = startFlow;
  document.querySelectorAll(".btnBack").forEach(b => b.onclick = prevPage);
  document.querySelectorAll(".btnNext").forEach(b => b.onclick = nextPage);

  // If you want Save Draft buttons, add them to your HTML with class="btnSaveDraft" and data-page attribute
  document.querySelectorAll(".btnSaveDraft").forEach(b => b.onclick = () => saveDraft(b.dataset.page));
  // If you want a Print button, add it to your HTML with id="btnPrint"
  if ($("btnPrint")) $("btnPrint").onclick = () => window.print();

  $("btnSubmit").onclick = submitForm;
  $("btnAddCustomService").onclick = addCustomService;

  // Stronger service selection delegation (this part was already correct for toggling 'active' class)
  document.addEventListener("click", function(e) {
    const btn = e.target.closest(".btn-service");
    if (btn) btn.classList.toggle("active");
  });

  // Auto-rebuild invoice on custom edits
  document.addEventListener("input", e => {
    if (e.target.closest(".custom-service") && $("page-invoice").classList.contains("active")) {
      buildInvoice();
    }
  });

  // Recalculate Invoice button functionality
  if ($("btnRecalculate")) {
    $("btnRecalculate").onclick = buildInvoice;
  }
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  $(id).classList.add("active");
  loadDraft(id);
  if (id === "page-invoice") buildInvoice();
}

function startFlow() {
  const actives = [...document.querySelectorAll(".btn-service.active")];
  if (!actives.length) return alert("Select at least one service.");
  // Filter out services that might not have a corresponding page if necessary,
  // though current HTML structure maps 1:1 for carwash, tyre, battery, addon.
  selectedPages = actives.map(b => `page-${b.dataset.service}`).concat("page-invoice");
  currentIndex = 0;
  showPage(selectedPages[0]);
}

function nextPage() {
  // Save draft for current page before navigating, if desired (optional)
  // const currentPageId = document.querySelector(".page.active")?.id;
  // if (currentPageId && selectedPages.includes(currentPageId)) saveDraft(currentPageId);

  if (++currentIndex < selectedPages.length) {
    showPage(selectedPages[currentIndex]);
  } else {
    // If no more selected pages, perhaps go to invoice or prompt final step
    showPage("page-invoice"); // Ensure we land on invoice if it's the last step
  }
}

function prevPage() {
  const active = document.querySelector(".page.active")?.id;
  if (active === "page-select") {
    return showPage("page-customer");
  }
  const idx = selectedPages.indexOf(active);
  if (idx > 0) {
    showPage(selectedPages[idx - 1]);
  } else {
    // If coming from the first selected service page, go back to select services
    showPage("page-select");
  }
}

// VALIDATION
function validateCustomer() {
  const fields = ["firstName", "lastName", "address", "phone", "carNumber", "carModel"];
  let valid = true;
  fields.forEach(id => {
    const el = $(id),
      err = $("err-" + id);
    el.classList.remove("error");
    err.textContent = "";
    if (!el.value.trim()) {
      el.classList.add("error");
      err.textContent = `${el.placeholder} required`;
      valid = false;
    }
  });
  return valid;
}

function saveCustomerInfo() {
  customerInfo = {
    firstName: $("firstName").value.trim(),
    lastName: $("lastName").value.trim(),
    address: $("address").value.trim(),
    phone: $("phone").value.trim(),
    carNumber: $("carNumber").value.trim(),
    carModel: $("carModel").value.trim()
  };
}

// QUANTITY CONTROLS (MODIFIED: No longer auto-calculates total for main services)
function initQtyControls() {
  document.querySelectorAll(".qty-control").forEach(group => {
    const input = group.querySelector("input");
    // const serviceId = input.id.replace("Qty", ""); // Not needed for total calculation here

    group.querySelector(".btn-minus").onclick = () => {
      if (parseInt(input.value) > 1) { // Use parseInt for comparison
        input.value = parseInt(input.value) - 1; // Decrement safely
      }
    };
    group.querySelector(".btn-plus").onclick = () => {
      input.value = parseInt(input.value) + 1; // Increment safely
    };

    // No automatic total update here, as user will input amount directly
  });
}

// ADDONS
function initAddons() {
  ["washQty", "interiorQty", "premiumQty", "waxQty", "engineQty", "balanceQty"].forEach(id => {
    $(id)?.addEventListener("input", calculateAddons);
  });
  calculateAddons(); // Initial calculation on load
}

function calculateAddons() {
  const prices = {
    washQty: 20,
    interiorQty: 35,
    premiumQty: 40,
    waxQty: 15,
    engineQty: 50,
    balanceQty: 25
  };
  const total = Object.entries(prices).reduce((sum, [id, price]) => sum + ((+$(id).value || 0) * price), 0);
  $("addonsTotal").value = total ? `₹${total.toFixed(2)}` : ""; // Format to 2 decimal places
}

// DYNAMIC INPUTS (REQUIRES HTML DIVS: #dotFieldsContainer, #batteryFieldsContainer)
function initDynamicFields() {
  $("tyreQty")?.addEventListener("input", gen("dotFieldsContainer", "DOT"));
  $("batteryQty")?.addEventListener("input", gen("batteryFieldsContainer", "Serial"));

  // Trigger initially in case of draft load with existing quantities
  if ($("tyreQty")) gen("dotFieldsContainer", "DOT").call($("tyreQty"));
  if ($("batteryQty")) gen("batteryFieldsContainer", "Serial").call($("batteryQty"));
}

function gen(containerId, label) {
  return function() {
    const qty = +this.value || 0;
    const box = $(containerId);
    if (!box) {
      console.error(`Error: Dynamic fields container "${containerId}" not found in HTML.`);
      return; // Exit if container doesn't exist
    }
    box.innerHTML = "";
    for (let i = 1; i <= qty; i++) {
      box.insertAdjacentHTML("beforeend", `<label>${label} #${i}:</label><input placeholder='${label} ${i}'><br>`);
    }
  };
}

// CUSTOM SERVICE
function addCustomService() {
  $("customServicesContainer").insertAdjacentHTML("beforeend", `
    <div class="custom-service">
      <label>Description:</label>
      <input class="custom-desc" placeholder="Custom Item">
      <label>Amount (₹):</label>
      <input class="custom-amt" type="number" step="0.01">
    </div>`);
}

// INVOICE
function buildInvoice() {
  const wrap = $("invoiceDetails");
  wrap.innerHTML = `<strong>Customer:</strong> ${customerInfo.firstName} ${customerInfo.lastName}<br><strong>User ID:</strong> ${customerInfo.phone}<br><strong>Date:</strong> ${new Date().toLocaleString()}<hr>`;
  const tbl = document.createElement("table");
  tbl.className = "invoice-table";
  tbl.innerHTML = `<tr><th>Service</th><th>Qty</th><th>Amount (₹)</th></tr>`;

  // Map of service page IDs to their respective total and quantity input IDs
  const amountFields = { "page-carwash": "carwashTotal", "page-tyre": "tyreTotal", "page-battery": "batteryTotal" };
  const qtyFields = { "page-carwash": "carwashQty", "page-tyre": "tyreQty", "page-battery": "batteryQty" };
  let grandTotal = 0;

  selectedPages.filter(p => p !== "page-invoice").forEach(pid => {
    if (pid === "page-addon") {
      const ADDONS = {
        washQty: { n: "Standard Wash", p: 20 },
        interiorQty: { n: "Interior Cleaning", p: 35 },
        premiumQty: { n: "Premium Wash", p: 40 },
        waxQty: { n: "Wax Service", p: 15 },
        engineQty: { n: "Engine Detailing", p: 50 },
        balanceQty: { n: "Wheel Balancing", p: 25 }
      };
      Object.entries(ADDONS).forEach(([id, meta]) => {
        const q = +$(id)?.value || 0;
        if (q > 0) {
          const amt = q * meta.p;
          grandTotal += amt;
          tbl.insertAdjacentHTML("beforeend", `<tr><td>${meta.n}</td><td>${q}</td><td>₹${amt.toFixed(2)}</td></tr>`);
        }
      });
    } else {
      // Amount is now directly from user input for these services
      const amount = parseFloat($(amountFields[pid])?.value || "0") || 0;
      const qty = $(qtyFields[pid])?.value || ""; // Quantity is still from the Qty input
      const title = document.querySelector(`#${pid} h2`)?.textContent || pid;

      if (amount > 0) { // Only add if there's a non-zero amount
        grandTotal += amount;
        tbl.insertAdjacentHTML("beforeend", `<tr><td>${title}</td><td>${qty}</td><td>₹${amount.toFixed(2)}</td></tr>`);
      }
    }
  });

  document.querySelectorAll(".custom-service").forEach(div => {
    const d = div.querySelector(".custom-desc")?.value.trim();
    const a = parseFloat(div.querySelector(".custom-amt")?.value) || 0;
    if (d && a) {
      grandTotal += a;
      tbl.insertAdjacentHTML("beforeend", `<tr><td>${d}</td><td></td><td>₹${a.toFixed(2)}</td></tr>`);
    }
  });

  tbl.insertAdjacentHTML("beforeend", `<tr><td colspan='2'><strong>Total</strong></td><td><strong>₹${grandTotal.toFixed(2)}</strong></td></tr>`);
  wrap.appendChild(tbl);
}

// DRAFT
function saveDraft(pid) {
  const data = {};
  document.querySelectorAll(`#${pid} input, #${pid} select`).forEach(el => {
    if (el.type !== "file") data[el.id] = el.type === "checkbox" ? el.checked : el.value;
  });
  alert(`Draft saved for ${pid}`); // Changed from window.alert to alert for consistency
  localStorage.setItem(`draft-${pid}`, JSON.stringify(data));
}

function loadDraft(pid) {
  const raw = localStorage.getItem(`draft-${pid}`);
  if (!raw) return;
  const data = JSON.parse(raw);
  document.querySelectorAll(`#${pid} input, #${pid} select`).forEach(el => {
    if (data[el.id] != null) {
      el.type === "checkbox" ? el.checked = data[el.id] : el.value = data[el.id];
    }
  });
  // For quantity controls, manually trigger update after loading draft
  // No longer dispatching 'change' for carwash, tyre, battery totals as they are user-entered.
  if (pid === "page-addon") calculateAddons(); // Recalculate addons if draft loaded
}


// SUBMISSION
async function submitForm() {
  if (!$("acknowledge").checked) return alert("Please confirm accuracy.");

  const formData = new FormData();
  Object.entries(customerInfo).forEach(([k, v]) => formData.append(k, v));

  // Gather and append all data from currently selected pages and custom services
  const allFormData = {
    customerInfo: customerInfo,
    services: {},
    addons: {},
    customServices: []
  };

  // Collect data for selected pages (carwash, tyre, battery)
  selectedPages.filter(p => p !== "page-invoice" && p !== "page-addon").forEach(pid => {
    const serviceData = {};
    document.querySelectorAll(`#${pid} input, #${pid} select`).forEach(el => {
      if (el.type !== "file") serviceData[el.id] = el.type === "checkbox" ? el.checked : el.value;
    });
    allFormData.services[pid.replace('page-', '')] = serviceData;
  });

  // Collect Add-on data
  if (selectedPages.includes("page-addon")) {
    const addonData = {};
    ["washQty", "interiorQty", "premiumQty", "waxQty", "engineQty", "balanceQty"].forEach(id => {
      addonData[id] = $(id)?.value || "0";
    });
    addonData.addonsTotal = $("addonsTotal")?.value.replace('₹', '') || "0";
    allFormData.addons = addonData;
  }

  // Collect Custom Service data
  document.querySelectorAll(".custom-service").forEach((div, index) => {
    const description = div.querySelector(".custom-desc")?.value.trim();
    const amount = parseFloat(div.querySelector(".custom-amt")?.value) || 0;
    if (description || amount) { // Only add if there's some data
      allFormData.customServices.push({ description, amount });
    }
  });

  // Attach image files
  const imageInputs = [
    "carwashBefore", "carwashAfter",
    "tyreBefore", "tyreAfter"
    // Add more image inputs here if needed for other services
  ];

  imageInputs.forEach(id => {
    const fileInput = $(id);
    if (fileInput && fileInput.files[0]) {
      formData.append(id, fileInput.files[0]);
      allFormData[id + 'FileName'] = fileInput.files[0].name; // Store filename for sheet
    }
  });

  try {
    // Step 1: Upload files to Google Drive (if any files are attached)
    let fileUrls = {};
    if (formData.has("carwashBefore") || formData.has("carwashAfter") || formData.has("tyreBefore") || formData.has("tyreAfter")) {
      const uploadRes = await fetch(DRIVE_UPLOAD_URL, { method: "POST", body: formData });
      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(`Drive upload failed: ${uploadRes.status} ${uploadRes.statusText} - ${errorText}`);
      }
      fileUrls = await uploadRes.json(); // This should return URLs like { carwashBefore: 'url', ... }
    }

    // Step 2: Submit all data (including file URLs) to Google Sheet
    const sheetPayload = {
      ...allFormData.customerInfo,
      timestamp: new Date().toISOString(),
      ...fileUrls, // Add the URLs received from Drive upload
      services: allFormData.services,
      addons: allFormData.addons,
      customServices: allFormData.customServices,
      // Optionally add the grand total from the invoice as well
      finalGrandTotal: parseFloat($("invoiceDetails").querySelector(".invoice-table strong:last-child")?.textContent.replace('₹', '') || "0")
    };

    const sheetSubmitRes = await fetch(SHEET_SUBMIT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sheetPayload)
    });

    if (!sheetSubmitRes.ok) {
      const errorText = await sheetSubmitRes.text();
      throw new Error(`Sheet submission failed: ${sheetSubmitRes.status} ${sheetSubmitRes.statusText} - ${errorText}`);
    }

    showPage("page-thankyou");
    // Clear form or reset state if needed
    localStorage.clear(); // Clear all drafts after successful submission
    selectedPages = []; // Reset selected pages
    currentIndex = 0; // Reset index
    customerInfo = {}; // Clear customer info
    document.querySelectorAll('input').forEach(input => { // Reset all input values
      if (input.type !== 'submit' && input.type !== 'button' && input.type !== 'hidden' && input.type !== 'checkbox') {
        input.value = '';
      } else if (input.type === 'checkbox') {
        input.checked = false;
      }
    });
    document.querySelectorAll('.btn-service.active').forEach(btn => btn.classList.remove('active')); // Deselect service buttons


  } catch (err) {
    alert("Submission failed. Please check the console for details.");
    console.error("Submission error:", err);
  }
}
